# VTON (stmx-biz)

Next.js 16 (App Router) + Supabase 기반 가상 피팅 플랫폼. 라우트·API·DB 스키마·환경 변수는 `README.md` 에 있다.
이 파일은 Claude Code · Grok · Antigravity 가 함께 읽는 공통 규칙이다 (`CLAUDE.md` 는 이 파일을 불러온다).

```bash
npm run dev    # http://localhost:8920 (Node 24, .nvmrc)
npm run lint
```

## 지킬 것

- **페이지 루트는 `h-screen` 이 아니라 `h-full`.** 뷰포트 높이를 NavBar 와 본문이 나눠 갖기 때문이다.
- **`/mov` 를 뺀 모든 화면은 글자색 검정(#000), 글자 크기 1.8배.** Tailwind 이름 크기 대신 px 로 쓴다
  (`text-sm` → `text-[25.2px]`). 예외와 변환표는 README 의 "타이포그래피 · 글자색" 절.
- DB 스키마 변경은 `supabase/migrations/` 에 번호를 이어 SQL 파일로 추가한다 (SQL Editor 에서 수동 실행).
- 환경 변수는 `.env.local`. 네이버 커머스 시크릿의 `$` 는 백슬래시로 이스케이프한다.
- 배포 이미지는 `stmx-biz-web:latest` 이며 stmx-orchestrator 파이프라인이 `main` 병합 후 빌드한다.
