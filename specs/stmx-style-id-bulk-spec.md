# STMX style-id 대량 호출 처리 스펙 (비동기 작업 큐)

## 0. 목적
외부 업체가 `POST /api/v1/style-id`를 한꺼번에 대량으로 호출해도 **요청을 버리거나 잃어버리지 않고, 시간이 걸리더라도 모든 요청을 끝까지 처리**한다. 즉시 응답보다 안정성과 확실한 완료를 우선한다.

> [확인 필요] Anthropic 계정 tier(RPM · 토큰 한도). 워커 동시성 기본값과 업체에 안내할 처리 시간(예: "1만 건에 N시간")이 이 값에 따라 정해진다.

## 1. 현재 구조의 문제
- `/api/v1/style-id`는 요청 1건마다 Vision 관찰과 스코어링을 그 자리에서 끝까지 처리한다. 수십 초에서 수 분이 걸리고, 그동안 HTTP 연결을 붙잡고 있다(`maxDuration = 600`).
- 서버는 `next start` 프로세스 하나다. 동시에 수백 건이 들어오면 Anthropic 429/529, 메모리 부족, 연결 타임아웃이 함께 터진다.
- 실패하면 결과가 남지 않는다. 클라이언트가 다시 보내면 같은 작업을 처음부터 다시 하고 비용도 다시 든다.
- 업체별 rate limit이 없다. 한 업체가 몰아서 호출하면 다른 업체까지 같이 막힌다.

## 2. 해결 방향
동기 호출을 **작업 접수 → 큐 → 워커 처리 → 결과 조회**로 바꾼다. 새 인프라(Redis, SQS 등) 없이 기존 Supabase(Postgres + Storage)를 큐로 쓴다.

```
업체 ──POST /jobs──▶ 접수 API ──▶ Storage(이미지) + style_id_job(queued)
   ◀── 202 { job_id }

워커(별도 프로세스, 동시 N개) ──claim(SKIP LOCKED)──▶ running
   └─ Vision + 스코어링 ─▶ succeeded / 재시도 대기(queued) / failed / dead

업체 ──GET /jobs/:id──▶ 상태 · 결과   (또는 웹훅 수신)
```

## 3. 범위
- 1단계(포함): `style_id_job` 테이블, 접수 · 조회 API, 워커, 재시도 · lease · 멱등성, 기존 동기 엔드포인트 보호.
- 2단계: 웹훅, 같은 이미지 결과 재사용, 대량 접수용 batches 엔드포인트, api-mng 모니터링 화면.
- 3단계: Anthropic Message Batches 연동, 업체별 일일 쿼터.

## 4. 데이터 모델
```sql
create table public.style_id_job (
  id                uuid primary key default gen_random_uuid(),
  business_user_id  uuid not null references public.business_user(id),
  idempotency_key   text,                          -- 클라이언트가 보낸 Idempotency-Key
  status            text not null default 'queued'
                    check (status in ('queued','running','succeeded','failed','dead')),
  image_path        text not null,                 -- Storage 비공개 버킷 경로
  image_sha256      text not null,                 -- 결과 재사용 키(2단계)
  product_name      text,
  product_category  text,
  attempts          int  not null default 0,
  max_attempts      int  not null default 5,
  next_run_at       timestamptz not null default now(),  -- 재시도 대기 시각
  locked_by         text,                          -- 워커 식별자
  locked_until      timestamptz,                   -- lease 만료 시각
  last_error        text,
  result            jsonb,                         -- 동기 엔드포인트와 같은 응답 형태
  callback_url      text,                          -- 2단계 웹훅
  created_at        timestamptz not null default now(),
  started_at        timestamptz,
  finished_at       timestamptz,
  unique (business_user_id, idempotency_key)
);

create index style_id_job_claim_idx on public.style_id_job (status, next_run_at);
create index style_id_job_business_idx on public.style_id_job (business_user_id, created_at desc);
```

- 이미지는 별도 비공개 Storage 버킷에 둔다. 작업이 끝나고 보존 기간(예: 7일)이 지나면 지운다.
- `claim_style_id_jobs(worker text, n int, lease interval)` 함수:
  - `status = 'queued' and next_run_at <= now()`인 작업과, `status = 'running' and locked_until < now()`(lease 만료)인 작업을 대상으로 한다.
  - `FOR UPDATE SKIP LOCKED`로 업체별로 번갈아(fair share) n개를 골라 `running`, `locked_by`, `locked_until = now() + lease`, `attempts + 1`로 바꾸고 돌려준다.

### 상태 전이
| 현재 | 다음 | 조건 |
|---|---|---|
| queued | running | 워커가 claim |
| running | succeeded | 판정 성공, `result` 저장 |
| running | queued | 일시적 오류, `attempts < max_attempts`, `next_run_at`을 백오프만큼 미룸 |
| running | failed | 재시도해도 결과가 같은 오류(판정 실패 · 입력 오류) |
| running | dead | `attempts >= max_attempts` |
| running | running(재claim) | lease 만료(워커 중단). 다른 워커가 이어받음 |
| dead | queued | 관리자가 수동 재실행 |

## 5. API
인증은 기존 `withBusinessApi` / `authenticateBusiness`(Bearer `stmx_live_…`)를 그대로 쓰고, 호출마다 `api_call_log`에 남긴다.

### 5.1 `POST /api/v1/style-id/jobs` — 작업 접수
- 요청: `multipart/form-data` — `image`(필수, ≤5MB, JPG · PNG · WEBP · GIF), `product_name`, `product_category`, `callback_url`(2단계).
- 헤더: `Idempotency-Key`(권장). 같은 업체가 같은 키로 다시 보내면 새 작업을 만들지 않고 기존 작업을 돌려준다.
- 이미지를 Storage에 저장하고 작업 행만 만든 뒤 바로 응답한다(목표 1초 이내).
- 응답:
  - `202 { request_id, job_id, status: "queued" }`
  - `200 { request_id, job_id, status }` — 같은 Idempotency-Key로 이미 접수된 작업
  - `400 · 413 · 415` 입력 오류, `401 · 403` 인증
  - `429 { error }` + `Retry-After` — 업체의 미완료 작업(queued + running)이 상한(env, 기본 1,000)을 넘음. 요청을 버리지 않고 나중에 다시 보내라고 알린다.

### 5.2 `GET /api/v1/style-id/jobs/:id` — 상태 · 결과 조회
- 본인 업체의 작업만 조회된다(다른 업체 작업은 404).
- 응답: `200 { job_id, status, attempts, created_at, finished_at, result?, error? }`
  - `succeeded`이면 `result`는 동기 엔드포인트의 200 응답과 같은 형태(`style_id`, `style`, `candidates`, `axes`)다.
  - `failed` · `dead`이면 업체에 보여도 되는 `error` 메시지만 내보낸다. 내부 사유는 `last_error`에만 둔다.
- 클라이언트 폴링 권장 간격: 5초에서 시작해 최대 60초까지 늘린다.

### 5.3 기존 `POST /api/v1/style-id` — 동기, 보호 추가
- 소량 · 즉시 응답용으로 유지한다.
- 프로세스 안 세마포어로 동시 실행 수를 제한한다(env, 예: 2). 넘치면 `429` + `Retry-After`를 돌려주고, 메시지로 `/jobs` 엔드포인트를 안내한다.
- 판정 로직은 워커와 같은 공통 함수를 쓴다(`extractStyle` + `resolvePrompt("observe")` + `productAddendum`).

## 6. 워커
- Next 요청과 분리된 상시 프로세스: `scripts/style-id-worker.mjs`, `npm run worker:style-id`. pm2나 systemd로 관리한다. 요청 타임아웃의 영향을 받지 않는다.
- 루프: 빈 슬롯 수만큼 `claim_style_id_jobs`를 호출한다. 작업이 없으면 몇 초 쉬었다가 다시 본다.
- **동시성**: 전역 동시 처리 수(env, 기본 4)는 Anthropic tier에 맞춘다. 대량 요청이 와도 처리 속도는 일정하고 대기열만 길어진다. 워커를 여러 대 띄우면 합계가 tier 한도를 넘지 않게 나눈다.
- **lease**: 처리 중에 `locked_until`을 주기적으로 연장한다(heartbeat). 워커가 죽으면 lease가 만료되고 다른 워커가 이어받는다. 이 장치로 작업 유실을 막는다.
- **공정 분배**: claim이 업체별로 번갈아 고르므로, 한 업체가 1만 건을 넣어도 다른 업체의 작업이 끝없이 밀리지 않는다.
- **종료**: SIGTERM을 받으면 새 작업은 꺼내지 않고, 진행 중인 작업만 끝낸 뒤 내려간다. 배포 중에도 처리하던 작업이 깨지지 않는다.

### 6.1 오류 분류와 재시도
| 오류 | 처리 |
|---|---|
| Anthropic 429/529, 5xx, 타임아웃, 네트워크 | `queued`로 되돌리고 지수 백오프 + 지터로 `next_run_at`을 미룸(30초 → 1분 → 2분 → 4분 …, 상한 30분). `retry-after` 헤더가 있으면 따름 |
| 의복 미검출 등 판정 실패(동기 API의 422) | 다시 해도 같으므로 재시도 없이 `failed` |
| 이미지 손상 · 형식 오류 | `failed` |
| `CLAUDE_API_KEY` 없음 등 설정 오류 | 작업은 `queued`로 두고 워커가 경보를 내며 대기(작업 자체의 잘못이 아님) |
| `attempts >= max_attempts` | `dead`. 사유와 함께 보관하고 관리자가 재실행 가능 |

## 7. 2단계 이후
- **웹훅**: `callback_url`로 완료 결과를 POST한다. `X-STMX-Signature: HMAC-SHA256(업체별 secret, body)`를 붙이고, 웹훅 전송도 백오프로 재시도한다. 대량 호출하는 업체에는 폴링보다 효율적이다.
- **결과 재사용**: `sha256(이미지) + 관찰 프롬프트 버전 + 상품 정보`가 같은 성공 결과가 있으면 Vision을 다시 부르지 않고 재사용한다. 대량 요청에 섞인 중복 사진의 비용을 아낀다.
- **batches 엔드포인트**: `POST /api/v1/style-id/batches`로 수백 건을 한 번에 접수한다. 이미지 URL이나 사전 업로드 URL 방식이 적합하다. 배치 단위로 진행률을 조회한다.
- **모니터링(api-mng)**: 대기열 길이, 가장 오래 기다린 작업의 대기 시간, 실패율, dead 건수를 보여준다. 대기 시간이 기준을 넘으면 알림을 보낸다. dead 작업 재실행 버튼을 둔다.
- **Anthropic Message Batches(3단계)**: 급하지 않은 대량 작업은 Vision 호출을 Batches API로 모아 보낸다. 비용이 약 50% 저렴하고 rate limit 영향도 거의 없다. 대신 결과까지 최대 24시간(보통 1시간 이내)이 걸린다. Vision 단계가 한 번의 호출(`runOneCall`)이라 적용할 수 있으며, 결과가 오면 스코어링만 워커가 이어서 한다.
- **업체별 일일 쿼터**: `business_user`에 예약된 요금 · 쿼터 필드와 연결한다.

## 8. 완료 조건 (1단계)
- 작업을 접수하면 워커가 처리하고, `GET /jobs/:id`로 결과를 받을 수 있다.
- 워커를 강제로 죽여도 lease 만료 후 다른 워커가 이어받아 끝낸다.
- 같은 `Idempotency-Key`로 다시 보내도 작업이 중복되지 않는다.
- Anthropic 429를 흉내 내면 백오프로 재시도해 결국 성공하고, 판정 실패는 재시도 없이 `failed`가 된다.
- 업체 미완료 작업이 상한을 넘으면 `429` + `Retry-After`를 받는다.
- 동기 엔드포인트가 동시 실행 상한을 넘으면 `429`를 돌려준다.
- lint와 단위 테스트(오류 분류, 백오프 계산)가 통과한다.
