#!/usr/bin/env node
/**
 * execute-migration.js
 *
 * STMX phase2 → 운영 Supabase 이식 실행 스크립트
 *   demo : https://vteqjxebptdbkbrxyxiz.supabase.co
 *   운영 : https://ttcbqxmljloxaaqytxsm.supabase.co
 *
 * phase2-prod-migration-checklist.md 의 "2. 점검 목록"(2.1 ~ 2.8)을 순서대로 진행한다.
 * 스텝마다 "다음을 진행할까요? Y:n" 으로 묻고, 결과(완료/건너뜀/실패)를 progress.json 에 남긴다.
 * 다시 실행하면 완료된 스텝은 건너뛰고 남은 스텝부터 이어서 진행한다.
 *
 * 사용법
 *   node execute-migration.js                 # 진행 (이어서)
 *   node execute-migration.js --list          # 진행 현황만 출력
 *   node execute-migration.js --redo 2.2-4    # 특정 스텝을 다시 진행 대상으로  (쉼표로 여러 개: --redo 2.2-3,2.2-8)
 *   node execute-migration.js --reset         # 진행 기록 초기화
 *   옵션: --project-dir <phase2 저장소>  (기본 D:\stmx\stmx-web-phase2)
 *         --work-dir <백업/리포트 폴더>   (기본 <project-dir 상위>\stmx-migration-work)
 *         --env-file <접속 정보 파일>     (기본 이 스크립트 폴더의 .env.migration)
 *
 * .env.migration (이 스크립트와 같은 폴더, --env-file 로 다른 경로 지정 가능)
 *   PROD_DB_URL                운영 DB Session pooler 접속 URL (비밀번호는 percent-encoding)
 *   TEST_DB_URL                demo(테스트) DB Session pooler 접속 URL
 *   SUPABASE_ACCESS_TOKEN      Management API 토큰 (선택, Auth 설정 비교/반영용)
 *   SUPABASE_BIN               supabase CLI 경로를 직접 지정할 때 (선택)
 *   이미 설정된 환경변수가 파일 값보다 우선합니다. DB URL 이 비어 있으면 실행 중에 입력받습니다.
 *
 * 필요 조건: Node 18+, Supabase CLI(`supabase login` 완료), Docker 실행 중(db dump 에 필요)
 */
'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const readline = require('readline')
const { spawnSync } = require('child_process')

// ─────────────────────────────────────────────────────────────
// 설정
// ─────────────────────────────────────────────────────────────
const DEMO_REF = 'vteqjxebptdbkbrxyxiz'
const PROD_REF = 'ttcbqxmljloxaaqytxsm'
const PROD_DOMAIN_DEFAULT = 'https://stmx-m.qoolla.com'

const argv = process.argv.slice(2)
const argValue = (name) => {
  const i = argv.indexOf(name)
  return i >= 0 ? argv[i + 1] : undefined
}
const PROJECT_DIR = path.resolve(argValue('--project-dir') || 'D:\\stmx\\stmx-web-phase2')
const WORK_DIR = path.resolve(argValue('--work-dir') || path.join(path.dirname(PROJECT_DIR), 'stmx-migration-work'))
const MIGRATIONS_DIR = path.join(PROJECT_DIR, 'supabase', 'migrations')
const STATE_FILE = path.join(WORK_DIR, 'progress.json')
const ENV_FILE = path.resolve(argValue('--env-file') || path.join(__dirname, '.env.migration'))

/** .env.migration 을 읽어 process.env 에 채운다. 이미 있는 환경변수는 덮어쓰지 않는다. */
function loadEnvFile(file) {
  if (!fs.existsSync(file)) return []
  const loaded = []
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line)
    if (!m || line.trim().startsWith('#')) continue
    const q = /^(["'])(.*)\1$/.exec(m[2])
    const value = q ? q[2] : m[2].replace(/\s+#.*$/, '')
    if (value === '' || process.env[m[1]] !== undefined) continue
    process.env[m[1]] = value
    loaded.push(m[1])
  }
  return loaded
}
const ENV_LOADED = loadEnvFile(ENV_FILE)

const F = {
  prodSchema: path.join(WORK_DIR, 'backup', 'prod_schema.sql'),
  prodData: path.join(WORK_DIR, 'backup', 'prod_data.sql'),
  prodRoles: path.join(WORK_DIR, 'backup', 'prod_roles.sql'),
  prodStorage: path.join(WORK_DIR, 'backup', 'prod_storage_objects.sql'),
  prodStorageList: path.join(WORK_DIR, 'backup', 'prod_storage_inventory.json'),
  demoSchema: path.join(WORK_DIR, 'demo_schema.sql'),
  schemaDiff: path.join(WORK_DIR, 'schema.diff'),
  missingReport: path.join(WORK_DIR, 'missing-objects-report.txt'),
  baselineDraft: path.join(WORK_DIR, 'draft_prod_baseline.sql'),
  storageSql: path.join(WORK_DIR, 'storage_sync.sql'),
  realtimeSql: path.join(WORK_DIR, 'realtime_sync.sql'),
  authTriggerSql: path.join(WORK_DIR, 'auth_trigger_sync.sql'),
}

// 체크리스트 1장: 마이그레이션에 없는데 앱 코드가 참조하는 객체
const CHECKLIST_TABLES = [
  'anonymous_questionnaire_logs', 'brand_catalog_categories', 'brand_catalog_kinds', 'brand_catalog_models',
  'consent_policies', 'docs_log', 'external_partners', 'external_questionnaire_submissions', 'post_products',
  'privacy_policies', 'questionaires', 'questionnaire_items', 'questionnaire_versions', 'resources',
  'share_interactions', 'stmx_contract_applications', 'style_card_logs', 'style_card_shares', 'style_codes',
  'style_templates', 'support_faqs', 'support_inquiries', 'support_notices', 'terms_policies', 'user_biz_request',
  'user_consents', 'user_credit_logs', 'user_credits', 'user_favorite_brands', 'user_questionnaire_logs',
  'profiles', 'products',
]
const CHECKLIST_RPCS = [
  'check_email_status', 'claim_anonymous_questionnaire_log', 'get_recent_logs', 'get_recent_logs_count',
  'log_post_action_click', 'pick_available_nickname',
]
const CHECKLIST_BUCKETS = ['loox', 'style-match', 'style-images', 'stmx-docs', 'inquiry-attachments']

// 상품 찾기(LOOX 착장 상품 찾기 · apps/web/lib/server/loox-product-catalog.ts)가 읽는 표와 그 FK 부모.
// FK 순서대로 넣는다. post_products(게시물 의존), user_favorite_brands(auth.users 의존)는 제외.
const CATALOG_TABLES = [
  'naver_categories', 'brands', 'brand_groups', 'brand_group_members', 'brand_categories',
  'brand_clothing_categories', 'brand_catalog_kinds', 'brand_catalog_categories', 'brand_catalog_models', 'products',
]

// LOOX 게시물과 그 내용(사진 · 태그 · 해시태그 · 착장 상품 · 버튼 집계). FK 순서.
const POST_TABLES = ['posts', 'post_images', 'post_tags', 'hashtags', 'post_hashtags', 'post_products', 'post_visit_stats']

const SMOKE_TESTS = [
  'Naver 로그인', 'Kakao 로그인', 'LOOX 업로드 (loox 버킷)', '피드', '팔로우', '좋아요 / 댓글',
  '알림', 'DM', 'Style Match', '신고',
]

// ─────────────────────────────────────────────────────────────
// 출력 / 입력 헬퍼
// ─────────────────────────────────────────────────────────────
const C = process.stdout.isTTY
  ? { b: (s) => `\x1b[1m${s}\x1b[0m`, g: (s) => `\x1b[32m${s}\x1b[0m`, y: (s) => `\x1b[33m${s}\x1b[0m`, r: (s) => `\x1b[31m${s}\x1b[0m`, c: (s) => `\x1b[36m${s}\x1b[0m`, d: (s) => `\x1b[2m${s}\x1b[0m` }
  : { b: (s) => s, g: (s) => s, y: (s) => s, r: (s) => s, c: (s) => s, d: (s) => s }
const log = (...a) => console.log(...a)
const info = (s) => log(C.c('  › ') + s)
const ok = (s) => log(C.g('  ✔ ') + s)
const warn = (s) => log(C.y('  ⚠ ') + s)
const fail = (s) => log(C.r('  ✖ ') + s)

/** 질문마다 readline 을 새로 열고 닫는다. 그 사이에 실행하는 CLI 가 stdin 을 그대로 쓸 수 있도록. */
function ask(question, { hidden = false, def } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: !!process.stdin.isTTY })
    const q = def !== undefined && def !== '' ? `${question} ${C.d(`[${def}]`)} ` : `${question} `
    let muted = false
    if (hidden) {
      rl._writeToOutput = (s) => {
        if (!muted) rl.output.write(s)
        else if (s === '\r\n' || s === '\n') rl.output.write(s)
        else rl.output.write('*')
      }
    }
    rl.question(q, (answer) => {
      if (hidden) process.stdout.write('\n')
      rl.close()
      const v = answer.trim()
      resolve(v === '' && def !== undefined ? def : v)
    })
    muted = hidden
  })
}

class QuitSignal extends Error {}

/** Y(기본) / n / q. 한글 자판(ㅛ/ㅜ)도 받는다. */
async function confirm(question = '다음을 진행할까요? Y:n') {
  for (;;) {
    const a = (await ask(C.b(question))).toLowerCase()
    if (['', 'y', 'yes', 'ㅛ'].includes(a)) return true
    if (['n', 'no', 'ㅜ'].includes(a)) return false
    if (['q', 'quit', 'ㅂ'].includes(a)) throw new QuitSignal()
    warn('Y, n 중에 입력하세요. (q: 중단)')
  }
}

async function waitEnter(msg = '완료했으면 Enter 를 누르세요') {
  await ask(C.d(`  ${msg}`))
}

// ─────────────────────────────────────────────────────────────
// 진행 상태
// ─────────────────────────────────────────────────────────────
function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
  } catch {
    return { createdAt: new Date().toISOString(), steps: {}, data: {} }
  }
}
function saveState() {
  fs.mkdirSync(WORK_DIR, { recursive: true })
  state.updatedAt = new Date().toISOString()
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
}
let state = loadState()
const mark = (id, status, note) => {
  state.steps[id] = { status, at: new Date().toISOString(), ...(note ? { note } : {}) }
  saveState()
}

// ─────────────────────────────────────────────────────────────
// Supabase CLI 실행
// ─────────────────────────────────────────────────────────────
function resolveSupabase() {
  if (process.env.SUPABASE_BIN) return { cmd: process.env.SUPABASE_BIN, pre: [] }
  if (process.platform === 'win32') {
    // npm 전역 설치(supabase.cmd)는 shell 없이 실행할 수 없으므로 node 로 dist/supabase.js 를 직접 띄운다.
    const r = spawnSync('where', ['supabase'], { encoding: 'utf8', windowsHide: true })
    const hits = (r.stdout || '').split(/\r?\n/).filter(Boolean)
    for (const hit of hits) {
      if (hit.toLowerCase().endsWith('.exe')) return { cmd: hit, pre: [] }
      const dir = path.dirname(hit)
      const js = path.join(dir, 'node_modules', 'supabase', 'dist', 'supabase.js')
      if (fs.existsSync(js)) return { cmd: process.execPath, pre: [js] }
      const exe = path.join(dir, 'node_modules', 'supabase', 'bin', 'supabase.exe')
      if (fs.existsSync(exe)) return { cmd: exe, pre: [] }
    }
  }
  return { cmd: 'supabase', pre: [] }
}
const SB = resolveSupabase()

/** 접속 URL 의 비밀번호와 긴 SQL 은 화면에 그대로 찍지 않는다. */
function displayArg(a) {
  if (/^postgres(ql)?:\/\//.test(a)) return a.replace(/(:\/\/[^:/@]+:)[^@]*@/, '$1****@')
  if (a.length > 80 && /select|insert|create|alter/i.test(a)) return '"<SQL>"'
  return /\s/.test(a) ? `"${a}"` : a
}

function sb(args, { capture = false, quiet = false, allowFail = false, env = {}, input } = {}) {
  if (!quiet) log(C.d(`  $ supabase ${args.map(displayArg).join(' ')}`))
  const r = spawnSync(SB.cmd, [...SB.pre, ...args], {
    cwd: PROJECT_DIR,
    env: { ...process.env, ...env },
    stdio: capture ? ['pipe', 'pipe', 'pipe'] : 'inherit',
    input,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 1024,
    windowsHide: true,
  })
  if (r.error) throw r.error
  if (r.status !== 0 && !allowFail) {
    if (capture && r.stderr) log(C.r(r.stderr.trim()))
    throw new Error(`supabase ${args.slice(0, 2).join(' ')} 실패 (exit ${r.status})`)
  }
  return r
}

function git(args, { allowFail = true } = {}) {
  const r = spawnSync('git', args, { cwd: PROJECT_DIR, encoding: 'utf8', maxBuffer: 1024 * 1024 * 512, windowsHide: true })
  if (r.error && !allowFail) throw r.error
  return r
}

// ─────────────────────────────────────────────────────────────
// DB 접속 정보
// ─────────────────────────────────────────────────────────────
const ctx = { urls: {}, accessToken: undefined, inventory: {} }

async function dbUrl(which) {
  if (ctx.urls[which]) return ctx.urls[which]
  const ref = which === 'prod' ? PROD_REF : DEMO_REF
  const envName = which === 'prod' ? 'PROD_DB_URL' : 'TEST_DB_URL'
  let url = process.env[envName] || (which === 'demo' ? process.env.DEMO_DB_URL : undefined)
  if (!url) {
    warn(`${ENV_FILE} 에 ${envName} 가 없습니다.`)
    info(`${which === 'prod' ? '운영' : 'demo'}(${ref}) DB 접속 URL 이 필요합니다.`)
    info(`대시보드 > Connect > Session pooler: https://supabase.com/dashboard/project/${ref}?showConnect=true`)
    info(C.d(`예) postgresql://postgres.${ref}:<PASSWORD>@aws-0-<region>.pooler.supabase.com:5432/postgres`))
    info(C.d('비밀번호에 특수문자가 있으면 percent-encoding 해야 합니다. 입력값은 화면에 표시되지 않습니다.'))
    url = await ask(`  ${envName}:`, { hidden: true })
  }
  if (!/^postgres(ql)?:\/\//.test(url)) throw new Error(`${envName} 형식이 올바르지 않습니다.`)
  // demo/운영 URL 을 서로 바꿔 넣는 실수를 막는다.
  if (!url.includes(ref)) {
    warn(`입력한 URL 에 project ref(${ref})가 보이지 않습니다: ${displayArg(url)}`)
    if (!(await confirm('그래도 이 URL 을 사용할까요? Y:n'))) throw new Error('DB URL 확인 필요')
  }
  const other = which === 'prod' ? DEMO_REF : PROD_REF
  if (url.includes(other)) throw new Error(`${envName} 에 반대편 프로젝트 ref(${other})가 들어 있습니다.`)
  ctx.urls[which] = url
  return url
}

function dbPassword(url) {
  try {
    return decodeURIComponent(new URL(url).password)
  } catch {
    return ''
  }
}

async function accessToken() {
  if (ctx.accessToken !== undefined) return ctx.accessToken
  let t = process.env.SUPABASE_ACCESS_TOKEN
  if (!t) {
    info('Management API 토큰이 있으면 Auth 설정을 자동으로 비교/반영할 수 있습니다.')
    info(C.d('발급: https://supabase.com/dashboard/account/tokens  (Enter 만 누르면 수동 안내로 진행)'))
    t = await ask('  SUPABASE_ACCESS_TOKEN:', { hidden: true })
  }
  ctx.accessToken = t || null
  return ctx.accessToken
}

/** 프로젝트의 service_role(레거시 JWT) 또는 sb_secret 키. 화면에 출력하지 않는다. */
const serviceKeys = {}
function serviceKey(ref) {
  if (serviceKeys[ref]) return serviceKeys[ref]
  const r = sb(['projects', 'api-keys', '--project-ref', ref, '--reveal', '-o', 'json'], { capture: true, quiet: true })
  const out = r.stdout || ''
  let key
  for (const [jwt] of out.matchAll(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)) {
    const p = decodeJwt(jwt)
    if (p?.ref === ref && p.role === 'service_role') key = jwt
  }
  key = key || (/sb_secret_[A-Za-z0-9_-]+/.exec(out) || [])[0]
  if (!key) throw new Error(`${ref} 의 service_role / secret 키를 가져오지 못했습니다.`)
  ok(`${ref === PROD_REF ? '운영' : 'demo'} service 키 확보 (${key.startsWith('eyJ') ? 'service_role JWT' : 'sb_secret'})`)
  return (serviceKeys[ref] = key)
}

async function mgmtApi(method, apiPath, body) {
  const token = await accessToken()
  if (!token) return null
  const res = await fetch(`https://api.supabase.com${apiPath}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Management API ${method} ${apiPath} → ${res.status} ${text.slice(0, 300)}`)
  return text ? JSON.parse(text) : {}
}

// ─────────────────────────────────────────────────────────────
// SQL 조회 (supabase db query --db-url)
//   출력 형식에 영향받지 않도록 결과 JSON 을 base64 로 감싸 @@...@@ 사이에서 꺼낸다.
// ─────────────────────────────────────────────────────────────
function queryJson(url, jsonExpr) {
  const sql =
    `select '@@' || translate(encode(convert_to(coalesce((${jsonExpr})::text, 'null'), 'UTF8'), 'base64'), E'\\n', '') || '@@' as v`
  let out = ''
  for (const extra of [['--output-format', 'json'], []]) {
    const r = sb(['db', 'query', '--db-url', url, ...extra, sql], { capture: true, quiet: true, allowFail: true })
    out = `${r.stdout || ''}\n${r.stderr || ''}`
    const m = /@@([A-Za-z0-9+/=]*)@@/.exec(out)
    if (r.status === 0 && m) return JSON.parse(Buffer.from(m[1], 'base64').toString('utf8'))
  }
  throw new Error(`SQL 조회 실패:\n${out.trim().slice(0, 1000)}`)
}

/**
 * db query 는 prepared statement 로 실행돼 여러 문장을 한 번에 받지 못한다.
 * 문장마다 EXECUTE 하는 DO 블록 하나로 감싸서 보낸다. (한 트랜잭션: 하나라도 실패하면 전부 롤백)
 */
function execSqlFile(url, file) {
  const stmts = splitSql(fs.readFileSync(file, 'utf8'))
    .map((s) => stripComments(s).replace(/;\s*$/, '').trim())
    .filter(Boolean)
  if (!stmts.length) return
  const body = stmts.map((s, i) => {
    let tag = `$s${i}$`
    while (s.includes(tag)) tag = `$s${i}_${Math.random().toString(36).slice(2, 8)}$`
    return `  execute ${tag}${s}${tag};`
  })
  let outer = '$mig$'
  while (body.some((b) => b.includes(outer))) outer = `$mig_${Math.random().toString(36).slice(2, 8)}$`
  const wrapped = file.replace(/\.sql$/, '') + '.do.sql'
  fs.writeFileSync(wrapped, `do ${outer}\nbegin\n${body.join('\n')}\nend\n${outer};\n`)
  info(`${stmts.length}개 문장을 DO 블록 하나로 실행합니다 (${path.basename(wrapped)})`)
  sb(['db', 'query', '--db-url', url, '-f', wrapped])
}

const INVENTORY_SQL = `json_build_object(
  'relations', (select coalesce(json_agg(json_build_object('name', c.relname, 'kind', c.relkind, 'rls', c.relrowsecurity) order by c.relname), '[]'::json)
                from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind in ('r','p','v','m')),
  'functions', (select coalesce(json_agg(distinct p.proname), '[]'::json) from pg_proc p where p.pronamespace = 'public'::regnamespace),
  'types', (select coalesce(json_agg(t.typname order by t.typname), '[]'::json) from pg_type t
            where t.typnamespace = 'public'::regnamespace
              and (t.typtype in ('e','d') or (t.typtype = 'c' and exists (select 1 from pg_class c where c.oid = t.typrelid and c.relkind = 'c')))),
  'buckets', (select coalesce(json_agg(json_build_object('id', b.id, 'name', b.name, 'public', b.public,
                'file_size_limit', b.file_size_limit, 'allowed_mime_types', b.allowed_mime_types) order by b.id), '[]'::json) from storage.buckets b),
  'objectCounts', (select coalesce(json_object_agg(s.bucket_id, s.n), '{}'::json)
                   from (select bucket_id, count(*) n from storage.objects group by bucket_id) s),
  'storagePolicies', (select coalesce(json_agg(json_build_object('name', policyname, 'cmd', cmd, 'roles', roles, 'permissive', permissive,
                        'qual', qual, 'with_check', with_check) order by policyname), '[]'::json)
                      from pg_policies where schemaname = 'storage' and tablename = 'objects'),
  'publicPolicies', (select coalesce(json_agg(json_build_object('table', tablename, 'name', policyname) order by tablename, policyname), '[]'::json)
                     from pg_policies where schemaname = 'public'),
  'authTriggers', (select coalesce(json_agg(json_build_object('name', t.tgname, 'def', pg_get_triggerdef(t.oid),
                     'fn', p.proname, 'fnSchema', n.nspname) order by t.tgname), '[]'::json)
                   from pg_trigger t join pg_proc p on p.oid = t.tgfoid join pg_namespace n on n.oid = p.pronamespace
                   where t.tgrelid = 'auth.users'::regclass and not t.tgisinternal),
  'realtime', (select coalesce(json_agg(schemaname || '.' || tablename order by schemaname, tablename), '[]'::json)
               from pg_publication_tables where pubname = 'supabase_realtime'),
  'profileCols', (select coalesce(json_agg(json_build_object('name', column_name, 'nullable', is_nullable, 'default', column_default)
                    order by ordinal_position), '[]'::json)
                  from information_schema.columns where table_schema = 'public' and table_name = 'profiles')
)`

async function inventory(which, { refresh = false } = {}) {
  if (ctx.inventory[which] && !refresh) return ctx.inventory[which]
  const url = await dbUrl(which)
  info(`${which === 'prod' ? '운영' : 'demo'} DB 객체 목록을 조회합니다...`)
  const inv = queryJson(url, INVENTORY_SQL)
  fs.mkdirSync(WORK_DIR, { recursive: true })
  fs.writeFileSync(path.join(WORK_DIR, `inventory-${which}.json`), JSON.stringify(inv, null, 2))
  ctx.inventory[which] = inv
  return inv
}

// ─────────────────────────────────────────────────────────────
// 로컬 마이그레이션 분석
// ─────────────────────────────────────────────────────────────
function migrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return []
  return fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()
}

function objectsDefinedInMigrations() {
  const tables = new Set()
  const fns = new Set()
  const types = new Set()
  const id = String.raw`(?:"?public"?\.)?"?([A-Za-z0-9_]+)"?`
  // 이 스크립트가 만든 baseline 은 "마이그레이션이 만드는 객체"에서 제외한다.
  for (const f of migrationFiles().filter((f) => !/_prod_baseline/.test(f))) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8')
    for (const m of sql.matchAll(new RegExp(String.raw`create\s+(?:unlogged\s+)?table\s+(?:if\s+not\s+exists\s+)?${id}`, 'gi'))) tables.add(m[1])
    for (const m of sql.matchAll(new RegExp(String.raw`create\s+(?:or\s+replace\s+)?(?:materialized\s+)?view\s+(?:if\s+not\s+exists\s+)?${id}`, 'gi'))) tables.add(m[1])
    for (const m of sql.matchAll(new RegExp(String.raw`create\s+(?:or\s+replace\s+)?function\s+${id}\s*\(`, 'gi'))) fns.add(m[1])
    for (const m of sql.matchAll(new RegExp(String.raw`create\s+type\s+${id}`, 'gi'))) types.add(m[1])
  }
  return { tables, fns, types }
}

/** pg_dump 결과를 문장 단위로 나눈다. 문자열, 따옴표 식별자, $$ 본문, 주석 안의 ; 는 무시. */
function splitSql(text) {
  const out = []
  let cur = ''
  let i = 0
  let mode = null // "'" | '"' | '--' | '/*' | '$tag$'
  while (i < text.length) {
    const ch = text[i]
    if (mode === '--') {
      cur += ch
      if (ch === '\n') mode = null
      i++
      continue
    }
    if (mode === '/*') {
      if (text.startsWith('*/', i)) { cur += '*/'; i += 2; mode = null; continue }
      cur += ch; i++; continue
    }
    if (mode === "'" || mode === '"') {
      cur += ch
      if (ch === mode) {
        if (text[i + 1] === mode) { cur += mode; i += 2; continue }
        mode = null
      }
      i++
      continue
    }
    if (mode) { // dollar quote
      if (text.startsWith(mode, i)) { cur += mode; i += mode.length; mode = null; continue }
      cur += ch; i++; continue
    }
    if (ch === '-' && text[i + 1] === '-') { mode = '--'; cur += '--'; i += 2; continue }
    if (ch === '/' && text[i + 1] === '*') { mode = '/*'; cur += '/*'; i += 2; continue }
    if (ch === "'" || ch === '"') { mode = ch; cur += ch; i++; continue }
    if (ch === '$') {
      const m = /^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/.exec(text.slice(i, i + 64))
      if (m) { mode = m[0]; cur += m[0]; i += m[0].length; continue }
    }
    if (ch === ';') {
      cur += ';'
      if (cur.trim()) out.push(cur.trim())
      cur = ''
      i++
      continue
    }
    cur += ch
    i++
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}

const stripComments = (s) => s.replace(/^\s*--.*$/gm, '').trim()

/** 문장의 대상 객체 = 처음 나오는 "public"."이름" (index/policy/trigger 는 이름이 비한정이라 ON 뒤 테이블이 걸린다). */
function subjectOf(stmt) {
  const m = /(?:"public"|\bpublic)\.(?:"([^"]+)"|([A-Za-z0-9_]+))/.exec(stripComments(stmt))
  return m ? m[1] || m[2] : null
}

// ─────────────────────────────────────────────────────────────
// 기타 유틸
// ─────────────────────────────────────────────────────────────
const lit = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`)
const ident = (s) => `"${String(s).replace(/"/g, '""')}"`
const roleIdent = (r) => (r === 'public' ? 'public' : ident(r))
const fileSize = (f) => (fs.existsSync(f) ? `${(fs.statSync(f).size / 1024).toFixed(1)} KB` : '없음')
const ensureDir = (f) => fs.mkdirSync(path.dirname(f), { recursive: true })

function table(rows, headers) {
  const all = [headers, ...rows].map((r) => r.map((c) => String(c ?? '')))
  const width = (s) => [...s.replace(/\x1b\[[0-9;]*m/g, '')].reduce((w, ch) => w + (/[\u1100-\uFFDC]/.test(ch) ? 2 : 1), 0)
  const w = headers.map((_, i) => Math.max(...all.map((r) => width(r[i]))))
  const line = (r) => '  ' + r.map((c, i) => c + ' '.repeat(w[i] - width(c))).join('  ')
  log(C.b(line(all[0])))
  for (const r of all.slice(1)) log(line(r))
}

function decodeJwt(token) {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'))
  } catch {
    return null
  }
}

async function tsBase() {
  if (!state.data.tsBase) {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const v = await ask('  마이그레이션 버전에 쓸 날짜(YYYYMMDD):', { def: today })
    if (!/^\d{8}$/.test(v)) throw new Error('YYYYMMDD 형식이어야 합니다.')
    state.data.tsBase = v
    saveState()
  }
  return state.data.tsBase
}

function envFiles() {
  const candidates = [
    '.env', '.env.local', '.env.production', '.env.docker',
    'apps/web/.env', 'apps/web/.env.local', 'apps/web/.env.production', 'apps/web/.env.docker',
    'apps/mobile/.env', 'apps/mobile/.env.local', 'apps/mobile/.env.production',
  ]
  return candidates.map((f) => path.join(PROJECT_DIR, f)).filter((f) => fs.existsSync(f))
}

/** KEY=VALUE 줄 단위로 값을 바꾼다. transform(key, value) 가 문자열을 돌려주면 교체. */
function rewriteEnv(file, transform, { dryRun }) {
  const text = fs.readFileSync(file, 'utf8')
  const changed = []
  const next = text.split(/(\r?\n)/).map((line) => {
    const m = /^(\s*(?:export\s+)?)([A-Za-z_][A-Za-z0-9_]*)(\s*=\s*)(.*)$/.exec(line)
    if (!m) return line
    const [, pre, key, eq, raw] = m
    const q = /^(["'])(.*)\1\s*$/.exec(raw)
    const value = q ? q[2] : raw
    const nv = transform(key, value)
    if (typeof nv !== 'string' || nv === value) return line
    changed.push(key)
    return `${pre}${key}${eq}${q ? q[1] + nv + q[1] : nv}`
  }).join('')
  if (!dryRun && changed.length) {
    fs.copyFileSync(file, `${file}.bak-${Date.now()}`)
    fs.writeFileSync(file, next)
  }
  return changed
}

/**
 * demo 의 표 데이터를 운영에 그대로 넣는다. 표 순서대로(FK 부모 먼저), PK 순으로 1000행씩.
 *  - 운영에 같은 키가 있으면 건너뛴다(on conflict do nothing).
 *  - 생성 컬럼은 빼고 넣는다(운영이 다시 계산). identity ALWAYS 는 overriding system value.
 *  - serial / identity 시퀀스는 끝나고 max 값 뒤로 맞춘다.
 * opts.where[t]     demo 쪽에서 고를 행 (SQL 조건)
 * opts.transform[t] 행을 넣기 전에 바꾸는 함수
 */
async function copyTablesDemoToProd(tables, { where = {}, transform = {}, rewriteQuestion, doneMessage = '이전 완료' } = {}) {
  const demoUrl = await dbUrl('demo')
  const prodUrl = await dbUrl('prod')
  const arr = `array[${tables.map(lit).join(', ')}]`
  const cond = (t) => (where[t] ? ` where ${where[t]}` : '')
  const countDemo = `json_build_object(${tables.map((t) => `${lit(t)}, (select count(*) from public.${ident(t)}${cond(t)})`).join(', ')})`
  const countProd = `json_build_object(${tables.map((t) => `${lit(t)}, (select count(*) from public.${ident(t)})`).join(', ')})`
  const before = { demo: queryJson(demoUrl, countDemo), prod: queryJson(prodUrl, countProd) }
  table(tables.map((t) => [t, before.demo[t], before.prod[t]]), ['table', 'demo(대상)', '운영'])

  const meta = queryJson(prodUrl, `(select coalesce(json_object_agg(table_name, cols), '{}'::json) from (
    select table_name, json_agg(json_build_object('c', column_name, 'gen', is_generated <> 'NEVER',
      'always', identity_generation = 'ALWAYS', 'seq', is_identity = 'YES' or column_default like 'nextval%') order by ordinal_position) cols
    from information_schema.columns where table_schema = 'public' and table_name = any(${arr}) group by table_name) s)`)
  const pkOf = queryJson(demoUrl, `(select coalesce(json_object_agg(t, cols), '{}'::json) from (
    select c.relname t, json_agg(a.attname order by k.ord) cols
    from pg_index i join pg_class c on c.oid = i.indrelid
    cross join lateral unnest(i.indkey) with ordinality k(attnum, ord)
    join pg_attribute a on a.attrelid = c.oid and a.attnum = k.attnum
    where i.indisprimary and c.relnamespace = 'public'::regnamespace and c.relname = any(${arr}) group by c.relname) s)`)
  const lacking = tables.filter((t) => !meta[t])
  if (lacking.length) throw new Error(`운영에 표가 없습니다: ${lacking.join(', ')}`)

  const rewrite = rewriteQuestion ? await confirm(rewriteQuestion) : false
  const total = tables.reduce((s, t) => s + Number(before.demo[t] || 0), 0)
  if (!(await confirm(`${tables.length}개 표, demo ${total}행을 운영에 넣을까요? Y:n`))) return

  const BATCH = 1000
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stmx-copy-'))
  try {
    for (const t of tables) {
      const cols = meta[t].filter((c) => !c.gen)
      const colList = cols.map((c) => ident(c.c)).join(', ')
      const order = (pkOf[t] || ['ctid']).map((c) => (c === 'ctid' ? c : ident(c))).join(', ')
      const n = Number(before.demo[t] || 0)
      for (let off = 0; off < n; off += BATCH) {
        let rows = queryJson(demoUrl, `(select coalesce(json_agg(r), '[]'::json) from (select * from public.${ident(t)}${cond(t)} order by ${order} limit ${BATCH} offset ${off}) r)`)
        if (transform[t]) rows = rows.map(transform[t])
        let json = JSON.stringify(rows)
        if (rewrite) json = json.split(`${DEMO_REF}.supabase.co`).join(`${PROD_REF}.supabase.co`)
        let tag = '$rows$'
        while (json.includes(tag)) tag = `$rows_${Math.random().toString(36).slice(2, 8)}$`
        const file = path.join(tmpDir, `${t}_${off}.sql`)
        fs.writeFileSync(file, `insert into public.${ident(t)} (${colList})${cols.some((c) => c.always) ? ' overriding system value' : ''}
select ${colList} from json_populate_recordset(null::public.${ident(t)}, ${tag}${json}${tag}::json)
on conflict do nothing;\n`)
        sb(['db', 'query', '--db-url', prodUrl, '-f', file], { capture: true, quiet: true })
        fs.rmSync(file)
        process.stdout.write(`\r  ${t}: ${Math.min(off + BATCH, n)}/${n}   `)
      }
      for (const c of cols.filter((c) => c.seq)) {
        const f = path.join(tmpDir, 'seq.sql')
        fs.writeFileSync(f, `select setval(pg_get_serial_sequence('public.${ident(t)}', ${lit(c.c)}), greatest((select coalesce(max(${ident(c.c)}), 0) from public.${ident(t)}), 1));\n`)
        sb(['db', 'query', '--db-url', prodUrl, '-f', f], { capture: true, quiet: true })
      }
      process.stdout.write(`\r  ${C.g('✔')} ${t}: ${n}행 처리${' '.repeat(10)}\n`)
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }

  const after = queryJson(prodUrl, countProd)
  table(tables.map((t) => [t, before.demo[t], before.prod[t], after[t], Number(after[t]) - Number(before.prod[t])]),
    ['table', 'demo(대상)', '운영(전)', '운영(후)', '추가'])
  const short = tables.filter((t) => Number(after[t]) < Number(before.demo[t]))
  if (short.length) warn(`운영 행 수가 demo 보다 적은 표: ${short.join(', ')} (키 충돌로 건너뛴 행이 있을 수 있음)`)
  else ok(doneMessage)
}

// ─────────────────────────────────────────────────────────────
// 스텝 정의
// ─────────────────────────────────────────────────────────────
const dash = (ref, p = '') => `https://supabase.com/dashboard/project/${ref}${p}`

const STEPS = [
  // ── 0. 사전 점검 ───────────────────────────────────────────
  {
    id: '0-1', section: '0. 사전 점검', title: '실행 환경 점검 (CLI, Docker, 로그인, 저장소)',
    desc: [`phase2 저장소: ${PROJECT_DIR}`, `작업 폴더(백업/리포트): ${WORK_DIR}`, `demo ${DEMO_REF} → 운영 ${PROD_REF}`],
    async run() {
      if (!fs.existsSync(MIGRATIONS_DIR)) throw new Error(`마이그레이션 폴더가 없습니다: ${MIGRATIONS_DIR}`)
      ok(`마이그레이션 ${migrationFiles().length}개`)
      const v = sb(['--version'], { capture: true, quiet: true })
      ok(`Supabase CLI ${v.stdout.trim()}`)
      const d = spawnSync('docker', ['info', '--format', '{{.ServerVersion}}'], { encoding: 'utf8', windowsHide: true })
      if (d.status === 0) ok(`Docker ${d.stdout.trim()}`)
      else warn('Docker 가 실행 중이 아닙니다. db dump 스텝 전에 Docker Desktop 을 켜 주세요.')
      const p = sb(['projects', 'list'], { capture: true, quiet: true, allowFail: true })
      if (p.status !== 0) {
        warn('supabase 로그인이 필요합니다. 지금 `supabase login` 을 실행합니다.')
        sb(['login'])
      } else {
        const out = p.stdout
        ;(out.includes(PROD_REF) ? ok : warn)(`운영 프로젝트 ${PROD_REF} ${out.includes(PROD_REF) ? '접근 가능' : '가 목록에 없습니다'}`)
        ;(out.includes(DEMO_REF) ? ok : warn)(`demo 프로젝트 ${DEMO_REF} ${out.includes(DEMO_REF) ? '접근 가능' : '가 목록에 없습니다'}`)
      }
      const linkFile = path.join(PROJECT_DIR, 'supabase', '.temp', 'project-ref')
      if (fs.existsSync(linkFile)) info(`현재 link 된 프로젝트: ${fs.readFileSync(linkFile, 'utf8').trim()}`)
      const st = git(['status', '--porcelain', '--', 'supabase'])
      if (st.status === 0 && st.stdout.trim()) warn('supabase/ 아래에 커밋되지 않은 변경이 있습니다. 진행 전에 커밋을 권장합니다.')
      await dbUrl('prod')
      await dbUrl('demo')
      queryJson(ctx.urls.prod, `json_build_object('ok', 1)`)
      ok('운영 DB 접속 확인')
      queryJson(ctx.urls.demo, `json_build_object('ok', 1)`)
      ok('demo DB 접속 확인')
    },
  },

  // ── 2.1 사전 백업 ──────────────────────────────────────────
  {
    id: '2.1-1', section: '2.1 사전 백업', title: '운영 DB 스키마 백업',
    desc: [`supabase db dump --db-url <PROD_DB_URL> -f ${F.prodSchema}`],
    async run() {
      ensureDir(F.prodSchema)
      sb(['db', 'dump', '--db-url', await dbUrl('prod'), '-f', F.prodSchema])
      ok(`${F.prodSchema} (${fileSize(F.prodSchema)})`)
    },
  },
  {
    id: '2.1-2', section: '2.1 사전 백업', title: '운영 DB 데이터 백업',
    desc: [`supabase db dump --db-url <PROD_DB_URL> --data-only --use-copy -f ${F.prodData}`],
    async run() {
      ensureDir(F.prodData)
      sb(['db', 'dump', '--db-url', await dbUrl('prod'), '--data-only', '--use-copy', '-f', F.prodData])
      ok(`${F.prodData} (${fileSize(F.prodData)})`)
    },
  },
  {
    id: '2.1-3', section: '2.1 사전 백업', title: '운영 DB 롤(role) 백업',
    desc: [`supabase db dump --db-url <PROD_DB_URL> --role-only -f ${F.prodRoles}`],
    async run() {
      ensureDir(F.prodRoles)
      sb(['db', 'dump', '--db-url', await dbUrl('prod'), '--role-only', '-f', F.prodRoles])
      ok(`${F.prodRoles} (${fileSize(F.prodRoles)})`)
    },
  },
  {
    id: '2.1-4', section: '2.1 사전 백업', title: 'Storage 버킷/객체 목록 백업',
    desc: ['storage 스키마 데이터(buckets, objects 메타데이터)를 덤프하고 버킷별 객체 수를 기록합니다.', '파일 원본은 복사하지 않습니다.'],
    async run() {
      ensureDir(F.prodStorage)
      sb(['db', 'dump', '--db-url', await dbUrl('prod'), '--data-only', '--use-copy', '--schema', 'storage', '-f', F.prodStorage])
      ok(`${F.prodStorage} (${fileSize(F.prodStorage)})`)
      const inv = await inventory('prod', { refresh: true })
      fs.writeFileSync(F.prodStorageList, JSON.stringify({ buckets: inv.buckets, objectCounts: inv.objectCounts }, null, 2))
      table(inv.buckets.map((b) => [b.id, b.public ? 'public' : 'private', inv.objectCounts[b.id] || 0]), ['bucket', '공개', '객체 수'])
      if (!inv.buckets.length) info('운영에 버킷이 아직 없습니다.')
    },
  },
  {
    id: '2.1-5', section: '2.1 사전 백업', title: '대시보드 Auth / Storage / Secrets 설정 기록',
    desc: ['아래 화면을 캡처하거나 내용을 기록해 둡니다.'],
    async run() {
      for (const [name, p] of [
        ['Auth URL 설정', '/auth/url-configuration'], ['Auth Providers', '/auth/providers'],
        ['Auth 이메일/가입 설정', '/auth/providers?provider=Email'], ['Storage', '/storage/buckets'],
        ['Edge Function Secrets', '/functions/secrets'], ['API / JWT 키', '/settings/api-keys'],
      ]) info(`${name}: ${dash(PROD_REF, p)}`)
      if (await accessToken()) {
        const cfg = await mgmtApi('GET', `/v1/projects/${PROD_REF}/config/auth`)
        const out = path.join(WORK_DIR, 'backup', 'prod_auth_config.json')
        ensureDir(out)
        fs.writeFileSync(out, JSON.stringify(cfg, null, 2))
        ok(`운영 Auth 설정을 저장했습니다: ${out} (비밀값 포함 가능, 외부 공유 금지)`)
      }
      await waitEnter()
    },
  },

  // ── 2.2 DB 스키마 / 마이그레이션 ──────────────────────────
  {
    id: '2.2-1', section: '2.2 DB 스키마 / 마이그레이션', title: 'demo 스키마 덤프 후 운영 스키마와 diff',
    desc: [`supabase db dump --db-url <DEMO_DB_URL> -f ${F.demoSchema}`, `git diff --no-index prod_schema.sql demo_schema.sql > ${F.schemaDiff}`],
    async run() {
      sb(['db', 'dump', '--db-url', await dbUrl('demo'), '-f', F.demoSchema])
      ok(`${F.demoSchema} (${fileSize(F.demoSchema)})`)
      if (!fs.existsSync(F.prodSchema)) throw new Error('운영 스키마 백업(2.1-1)이 없습니다. 먼저 진행하세요.')
      const r = git(['diff', '--no-index', '--no-color', F.prodSchema, F.demoSchema])
      fs.writeFileSync(F.schemaDiff, r.stdout || '')
      const stat = git(['diff', '--no-index', '--shortstat', F.prodSchema, F.demoSchema])
      if (!r.stdout) ok('운영과 demo 스키마가 같습니다.')
      else info(`차이: ${(stat.stdout || '').trim()} → ${F.schemaDiff}`)
    },
  },
  {
    id: '2.2-2', section: '2.2 DB 스키마 / 마이그레이션', title: '마이그레이션에 없는 객체가 운영에 있는지 확인',
    desc: ['demo / 운영 DB 의 테이블·함수·타입·버킷을 조회해 비교합니다.', `결과: ${F.missingReport}`],
    async run() {
      const demo = await inventory('demo', { refresh: true })
      const prod = await inventory('prod', { refresh: true })
      const mig = objectsDefinedInMigrations()
      const dRel = new Set(demo.relations.map((r) => r.name))
      const pRel = new Set(prod.relations.map((r) => r.name))
      const dFn = new Set(demo.functions)
      const pFn = new Set(prod.functions)
      const dB = new Set(demo.buckets.map((b) => b.id))
      const pB = new Set(prod.buckets.map((b) => b.id))
      const mark3 = (d, p) => [d ? 'O' : '-', p ? 'O' : C.r('X')]

      log(C.b('\n  [체크리스트 테이블]'))
      table(CHECKLIST_TABLES.map((t) => [t, ...mark3(dRel.has(t), pRel.has(t))]), ['table', 'demo', '운영'])
      log(C.b('\n  [체크리스트 RPC]'))
      table(CHECKLIST_RPCS.map((f) => [f, ...mark3(dFn.has(f), pFn.has(f))]), ['function', 'demo', '운영'])
      log(C.b('\n  [버킷] (loox, style-match 는 마이그레이션이 생성)'))
      const allBuckets = [...new Set([...CHECKLIST_BUCKETS, ...dB, ...pB])]
      table(allBuckets.map((b) => [b, ...mark3(dB.has(b), pB.has(b))]), ['bucket', 'demo', '운영'])

      // 일반 비교: demo 에 있고 운영에 없고 마이그레이션도 만들지 않는 것
      const missingRel = [...dRel].filter((t) => !pRel.has(t) && !mig.tables.has(t))
      const missingFn = [...dFn].filter((f) => !pFn.has(f) && !mig.fns.has(f))
      const missingType = demo.types.filter((t) => !prod.types.includes(t) && !mig.types.has(t))
      const notInDemo = CHECKLIST_TABLES.filter((t) => !dRel.has(t)).concat(CHECKLIST_RPCS.filter((f) => !dFn.has(f)))
      state.data.missing = { relations: missingRel, functions: missingFn, types: missingType }
      saveState()

      const lines = [
        `# 생성: ${new Date().toISOString()}`,
        `demo 에 있고 운영에 없으며 마이그레이션에도 없는 relation (${missingRel.length}): ${missingRel.join(', ') || '-'}`,
        `demo 에 있고 운영에 없으며 마이그레이션에도 없는 function (${missingFn.length}): ${missingFn.join(', ') || '-'}`,
        `demo 에 있고 운영에 없으며 마이그레이션에도 없는 type (${missingType.length}): ${missingType.join(', ') || '-'}`,
        `운영에 없는 버킷: ${[...dB].filter((b) => !pB.has(b)).join(', ') || '-'}`,
        `demo 에도 없는 체크리스트 객체: ${notInDemo.join(', ') || '-'}`,
      ]
      fs.writeFileSync(F.missingReport, lines.join('\n') + '\n')
      log('')
      lines.slice(1).forEach((l) => info(l))
      ok(`리포트: ${F.missingReport}`)
    },
  },
  {
    id: '2.2-3', section: '2.2 DB 스키마 / 마이그레이션', title: '운영에 없는 객체 DDL 을 demo 덤프에서 추출해 baseline 마이그레이션 생성',
    desc: ['2.2-2 에서 찾은 객체의 CREATE/ALTER/INDEX/POLICY/GRANT 문을 demo_schema.sql 에서 뽑아 초안을 만듭니다.', '검토 후 supabase/migrations 에 <날짜>000000_prod_baseline.sql 로 추가할지 묻습니다.'],
    async run() {
      const missing = state.data.missing
      if (!missing) throw new Error('2.2-2 를 먼저 진행하세요.')
      const total = missing.relations.length + missing.functions.length + missing.types.length
      if (!total) return ok('추출할 객체가 없습니다. 운영에 필요한 전제 객체가 모두 있습니다.')
      if (!fs.existsSync(F.demoSchema)) throw new Error('demo_schema.sql 이 없습니다. 2.2-1 을 먼저 진행하세요.')
      const want = new Set([...missing.relations, ...missing.functions, ...missing.types])
      const stmts = splitSql(fs.readFileSync(F.demoSchema, 'utf8'))
      const picked = stmts.filter((s) => {
        const sub = subjectOf(s)
        if (!sub) return false
        if (want.has(sub)) return true
        // 누락 테이블의 시퀀스 (<table>_id_seq 등)
        return /\bSEQUENCE\b/i.test(s) && missing.relations.some((t) => sub.startsWith(`${t}_`))
      })
      // 마이그레이션(01~)이 만드는 객체를 참조하는 문장은 그 뒤에 실행돼야 한다.
      // (예: posts FK, touch_updated_at 트리거, can_read_post 를 쓰는 정책)
      // 함수 본문은 check_function_bodies = false 라 생성 시점에 검사하지 않으므로 앞쪽에 둔다.
      const mig = objectsDefinedInMigrations()
      const migObjects = new Set([...mig.tables, ...mig.fns, ...mig.types])
      const refsMigObject = (s) => {
        for (const m of stripComments(s).matchAll(/(?:"public"|\bpublic)\.(?:"([^"]+)"|([A-Za-z0-9_]+))/g)) {
          if (migObjects.has(m[1] || m[2])) return m[1] || m[2]
        }
        return null
      }
      const pre = []
      const post = []
      const deferred = new Set() // post 로 보낸 CREATE 의 대상 → 이후 ALTER/GRANT/INDEX 도 post
      const reasons = new Map()
      for (const s of picked) {
        const sub = subjectOf(s)
        const isFnDef = /^\s*CREATE\s+(OR\s+REPLACE\s+)?FUNCTION/i.test(stripComments(s))
        const dep = isFnDef ? null : refsMigObject(s)
        if (deferred.has(sub) || dep) {
          post.push(s)
          if (/^\s*CREATE\s+(?:OR\s+REPLACE\s+)?(?:UNLOGGED\s+)?(?:TABLE|VIEW|MATERIALIZED\s+VIEW|SEQUENCE|TYPE)\b/i.test(stripComments(s))) deferred.add(sub)
          if (dep) reasons.set(dep, (reasons.get(dep) || 0) + 1)
        } else pre.push(s)
      }

      const header = (title, list) => [
        '-- ============================================================',
        `-- ${title}`,
        `-- 생성: ${new Date().toISOString()} by execute-migration.js`,
        `-- relations: ${missing.relations.join(', ') || '-'}`,
        `-- functions: ${missing.functions.join(', ') || '-'}`,
        `-- types: ${missing.types.join(', ') || '-'}`,
        `-- 문장 수: ${list.length}`,
        '-- ⚠ 자동 추출본입니다. 반드시 검토 후 사용하세요.',
        '-- ============================================================',
        'SET check_function_bodies = false;',
        '',
      ].join('\n')
      const postDraft = F.baselineDraft.replace(/\.sql$/, '_post.sql')
      fs.writeFileSync(F.baselineDraft, header(`prod baseline: demo(${DEMO_REF}) 에만 있던 객체 (마이그레이션 01 이전)`, pre) + pre.map((s) => s + '\n').join('\n'))
      ok(`baseline (01 이전) ${pre.length}개 문장 → ${F.baselineDraft}`)
      if (post.length) {
        fs.writeFileSync(postDraft, header('prod baseline post: 마이그레이션이 만드는 객체를 참조하는 문장 (마이그레이션 이후)', post) + post.map((s) => s + '\n').join('\n'))
        ok(`baseline post (마지막 마이그레이션 이후) ${post.length}개 문장 → ${postDraft}`)
        info(`post 로 옮긴 이유(참조 대상: 문장 수): ${[...reasons].map(([k, n]) => `${k}:${n}`).join(', ')}`)
      } else if (fs.existsSync(postDraft)) fs.rmSync(postDraft)
      const subjects = new Set(picked.map(subjectOf))
      const notFound = [...want].filter((w) => !subjects.has(w))
      if (notFound.length) warn(`덤프에서 찾지 못한 객체: ${notFound.join(', ')}`)
      info('편집기에서 초안을 열어 검토하세요.')
      await waitEnter('검토가 끝나면 Enter')

      const base = await tsBase()
      const lastSeq = migrationFiles()
        .filter((f) => !/_prod_baseline/.test(f))
        .map((f) => /^(\d{14})_/.exec(f)?.[1])
        .filter((v) => v && v.startsWith(base))
        .reduce((m, v) => Math.max(m, Number(v.slice(8))), 0)
      // 아직 파일명이 01_ 형식이면(2.2-4 이전) 그 개수로 마지막 번호를 잡는다.
      const plainCount = migrationFiles().filter((f) => /^\d{1,3}_/.test(f)).length
      const postSeq = String(Math.max(lastSeq, plainCount) + 1).padStart(6, '0')
      const copies = [[F.baselineDraft, path.join(MIGRATIONS_DIR, `${base}000000_prod_baseline.sql`)]]
      if (post.length) copies.push([postDraft, path.join(MIGRATIONS_DIR, `${base}${postSeq}_prod_baseline_post.sql`)])
      // 이전 실행에서 다른 번호로 만든 post 파일은 정리
      for (const f of migrationFiles().filter((f) => /_prod_baseline_post\.sql$/.test(f))) {
        const full = path.join(MIGRATIONS_DIR, f)
        if (!copies.some(([, t]) => t === full)) { fs.rmSync(full); info(`이전 post 파일 삭제: ${f}`) }
      }
      table(copies.map(([from, to]) => [path.basename(from), path.relative(PROJECT_DIR, to)]), ['초안', '추가 위치'])
      if (await confirm('위와 같이 마이그레이션 폴더에 추가할까요? (같은 이름은 덮어씀) Y:n')) {
        for (const [from, to] of copies) fs.copyFileSync(from, to)
        ok('추가 완료')
      } else {
        info('마이그레이션 폴더에는 추가하지 않았습니다.')
      }
    },
  },
  {
    id: '2.2-4', section: '2.2 DB 스키마 / 마이그레이션', title: '마이그레이션 파일명을 타임스탬프 형식으로 변경',
    desc: ['01_profile_social.sql → <YYYYMMDD>000001_profile_social.sql (순서 01→16 유지)', 'git 저장소면 git mv 로 이동합니다.'],
    async run() {
      const base = await tsBase()
      const plan = migrationFiles()
        .map((f) => {
          const m = /^(\d{1,3})_(.+\.sql)$/.exec(f)
          return m ? [f, `${base}${'0000'}${m[1].padStart(2, '0').slice(-2)}_${m[2]}`] : null
        })
        .filter(Boolean)
      if (!plan.length) return ok('변경할 파일이 없습니다. (이미 타임스탬프 형식)')
      table(plan, ['현재', '변경 후'])
      if (!(await confirm('위와 같이 이름을 바꿀까요? Y:n'))) throw new Error('파일명 변경을 취소했습니다.')
      for (const [from, to] of plan) {
        const r = git(['mv', path.join('supabase', 'migrations', from), path.join('supabase', 'migrations', to)])
        if (r.status !== 0) fs.renameSync(path.join(MIGRATIONS_DIR, from), path.join(MIGRATIONS_DIR, to))
      }
      ok(`${plan.length}개 파일명 변경 완료`)
    },
  },
  {
    id: '2.2-5', section: '2.2 DB 스키마 / 마이그레이션', title: `운영 프로젝트 link (supabase link --project-ref ${PROD_REF})`,
    desc: ['link 이후 CLI 기본 대상이 운영이 됩니다. 이 스크립트는 DB 작업에 --db-url 을 명시하므로 대상이 섞이지 않습니다.'],
    async run() {
      const pw = dbPassword(await dbUrl('prod'))
      sb(['link', '--project-ref', PROD_REF], { env: pw ? { SUPABASE_DB_PASSWORD: pw } : {} })
      ok(`link 완료: ${PROD_REF}`)
    },
  },
  {
    id: '2.2-6', section: '2.2 DB 스키마 / 마이그레이션', title: '운영 마이그레이션 이력 확인 및 repair',
    desc: ['supabase migration list 로 로컬/원격 이력을 보여 줍니다.', '운영에 수동으로 이미 적용한 버전이 있으면 입력해 applied 로 표시합니다.'],
    async run() {
      const url = await dbUrl('prod')
      sb(['migration', 'list', '--db-url', url])
      const local = migrationFiles().map((f) => f.split('_')[0])
      info(`로컬 버전: ${local.join(', ')}`)
      const v = await ask('  applied 로 표시할 버전(쉼표 구분, 없으면 Enter):')
      const versions = v.split(/[,\s]+/).filter(Boolean)
      if (!versions.length) return ok('repair 할 버전이 없습니다.')
      const bad = versions.filter((x) => !/^\d{14}$/.test(x))
      if (bad.length) throw new Error(`14자리 버전이 아닙니다: ${bad.join(', ')}`)
      sb(['migration', 'repair', '--status', 'applied', ...versions, '--db-url', url, '--yes'])
      sb(['migration', 'list', '--db-url', url])
    },
  },
  {
    id: '2.2-7', section: '2.2 DB 스키마 / 마이그레이션', title: '운영 profiles.is_admin 컬럼 확인',
    desc: ['01번(default false)과 06번(not null default false) 정의가 다릅니다. 운영 컬럼 상태를 확인합니다.'],
    async run() {
      const prod = await inventory('prod', { refresh: true })
      const demo = await inventory('demo')
      const pick = (inv) => inv.profileCols.find((c) => c.name === 'is_admin')
      const p = pick(prod)
      const d = pick(demo)
      table([
        ['demo', d ? 'O' : '-', d?.nullable ?? '', d?.default ?? ''],
        ['운영', p ? 'O' : '-', p?.nullable ?? '', p?.default ?? ''],
      ], ['DB', 'is_admin', 'nullable', 'default'])
      if (!prod.profileCols.length) warn('운영에 profiles 테이블이 없습니다. baseline(2.2-3)이 필요합니다.')
      else if (!p) info('운영에 is_admin 이 없습니다. 01번 마이그레이션이 추가합니다.')
      else if (p.nullable === 'YES') {
        const r = queryJson(ctx.urls.prod, `(select json_build_object('nulls', count(*)) from public.profiles where is_admin is null)`)
        ;(r.nulls ? warn : ok)(`is_admin 이 NULL 인 행: ${r.nulls}${r.nulls ? ' → 06번의 not null 적용 전에 값을 채워야 할 수 있습니다.' : ''}`)
      } else ok('운영 is_admin 은 이미 not null 입니다.')
    },
  },
  {
    id: '2.2-8', section: '2.2 DB 스키마 / 마이그레이션', title: '미리보기: supabase db push --dry-run',
    desc: ['운영 DB 에 적용될 마이그레이션 목록만 확인합니다. 실제 변경은 없습니다.'],
    async run() {
      sb(['db', 'push', '--db-url', await dbUrl('prod'), '--dry-run'])
      info('원격에 더 최근 버전이 있어 순서 오류가 나면 --include-all 이 필요할 수 있습니다.')
    },
  },
  {
    id: '2.2-9', section: '2.2 DB 스키마 / 마이그레이션', title: '적용: supabase db push (운영 DB 변경)',
    desc: [C.y('운영 DB 스키마가 실제로 바뀝니다. down 스크립트가 없으므로 롤백은 2.1 백업으로 합니다.')],
    async run() {
      const missingBackup = ['2.1-1', '2.1-2'].filter((id) => state.steps[id]?.status !== 'done')
      if (missingBackup.length) warn(`백업 스텝이 완료되지 않았습니다: ${missingBackup.join(', ')}`)
      const typed = await ask(`  확인을 위해 운영 project ref(${PROD_REF})를 입력하세요:`)
      if (typed !== PROD_REF) throw new Error('project ref 가 일치하지 않아 중단했습니다.')
      const includeAll = await confirm('--include-all 옵션을 붙일까요? (dry-run 에서 순서 경고가 있었다면 Y) Y:n')
      sb(['db', 'push', '--db-url', await dbUrl('prod'), '--yes', ...(includeAll ? ['--include-all'] : [])])
      ok('db push 완료')
      await inventory('prod', { refresh: true })
    },
  },

  // ── 2.3 RLS · 함수 · 트리거 ────────────────────────────────
  {
    id: '2.3-1', section: '2.3 RLS · 함수 · 트리거', title: 'RPC 존재 여부 / RLS 활성화 / 정책 수 비교',
    desc: ['체크리스트 RPC 6개, RLS 가 꺼진 public 테이블, 테이블별 정책 수(demo vs 운영)를 확인합니다.'],
    async run() {
      const prod = await inventory('prod', { refresh: true })
      const demo = await inventory('demo')
      const lackRpc = CHECKLIST_RPCS.filter((f) => !prod.functions.includes(f))
      ;(lackRpc.length ? warn : ok)(`운영에 없는 RPC: ${lackRpc.join(', ') || '없음'}`)
      const lackFn = demo.functions.filter((f) => !prod.functions.includes(f))
      if (lackFn.length) warn(`demo 에만 있는 함수 (${lackFn.length}): ${lackFn.join(', ')}`)
      const rlsOff = prod.relations.filter((r) => (r.kind === 'r' || r.kind === 'p') && !r.rls).map((r) => r.name)
      ;(rlsOff.length ? warn : ok)(`운영에서 RLS 가 꺼진 테이블: ${rlsOff.join(', ') || '없음'}`)
      const count = (inv) => inv.publicPolicies.reduce((m, p) => ((m[p.table] = (m[p.table] || 0) + 1), m), {})
      const dc = count(demo)
      const pc = count(prod)
      const diff = [...new Set([...Object.keys(dc), ...Object.keys(pc)])].filter((t) => (dc[t] || 0) !== (pc[t] || 0)).sort()
      if (diff.length) {
        warn('정책 수가 다른 테이블:')
        table(diff.map((t) => [t, dc[t] || 0, pc[t] || 0]), ['table', 'demo', '운영'])
      } else ok('테이블별 RLS 정책 수가 demo 와 같습니다.')
    },
  },
  {
    id: '2.3-2', section: '2.3 RLS · 함수 · 트리거', title: 'auth.users 트리거(신규 가입 시 profiles 생성) 확인 / 복사',
    desc: ['demo 와 운영의 auth.users 트리거를 비교하고, 운영에 없으면 생성 SQL 을 만들어 적용할지 묻습니다.'],
    async run() {
      const prod = await inventory('prod', { refresh: true })
      const demo = await inventory('demo')
      table(demo.authTriggers.map((t) => [t.name, `${t.fnSchema}.${t.fn}`, prod.authTriggers.some((p) => p.name === t.name) ? 'O' : C.r('X')]), ['demo 트리거', '함수', '운영'])
      if (!demo.authTriggers.length) return info('demo 에도 auth.users 트리거가 없습니다.')
      const lack = demo.authTriggers.filter((t) => !prod.authTriggers.some((p) => p.name === t.name))
      if (!lack.length) return ok('운영에 같은 이름의 트리거가 모두 있습니다.')
      const noFn = lack.filter((t) => t.fnSchema === 'public' && !prod.functions.includes(t.fn))
      if (noFn.length) throw new Error(`운영에 트리거 함수가 없습니다: ${noFn.map((t) => t.fn).join(', ')} (2.2-3 baseline 에 포함하세요)`)
      fs.writeFileSync(F.authTriggerSql, lack.map((t) => `${t.def};`).join('\n') + '\n')
      log(fs.readFileSync(F.authTriggerSql, 'utf8'))
      if (await confirm('위 트리거를 운영에 생성할까요? Y:n')) {
        execSqlFile(await dbUrl('prod'), F.authTriggerSql)
        ok('트리거 생성 완료')
      }
    },
  },
  {
    id: '2.3-3', section: '2.3 RLS · 함수 · 트리거', title: 'Realtime publication(supabase_realtime) 비교 / 동기화',
    desc: ['DM, 알림용 Realtime 대상 테이블을 demo 와 맞춥니다.'],
    async run() {
      const prod = await inventory('prod', { refresh: true })
      const demo = await inventory('demo')
      info(`demo : ${demo.realtime.join(', ') || '(없음)'}`)
      info(`운영 : ${prod.realtime.join(', ') || '(없음)'}`)
      const pRel = new Set(prod.relations.map((r) => `public.${r.name}`))
      const lack = demo.realtime.filter((t) => !prod.realtime.includes(t))
      if (!lack.length) return ok('Realtime 대상 테이블이 같습니다.')
      const addable = lack.filter((t) => !t.startsWith('public.') || pRel.has(t))
      const skipped = lack.filter((t) => !addable.includes(t))
      if (skipped.length) warn(`운영에 테이블이 없어 제외: ${skipped.join(', ')}`)
      if (!addable.length) return
      const sql = addable.map((t) => {
        const [s, n] = t.split('.')
        return `alter publication supabase_realtime add table ${ident(s)}.${ident(n)};`
      })
      fs.writeFileSync(F.realtimeSql, sql.join('\n') + '\n')
      log(sql.map((s) => '  ' + s).join('\n'))
      if (await confirm('위 테이블을 운영 Realtime 에 추가할까요? Y:n')) {
        execSqlFile(await dbUrl('prod'), F.realtimeSql)
        ok('Realtime 설정 완료')
      }
    },
  },

  // ── 2.4 Storage ────────────────────────────────────────────
  {
    id: '2.4-1', section: '2.4 Storage', title: '버킷 / 버킷 설정 / storage 정책을 demo 와 비교해 동기화',
    desc: ['없는 버킷 생성, public·용량 제한·MIME 타입 차이 수정, storage.objects 정책 생성 SQL 을 만들고 적용할지 묻습니다.', '파일(객체) 자체는 복사하지 않습니다.'],
    async run() {
      const prod = await inventory('prod', { refresh: true })
      const demo = await inventory('demo')
      const pb = Object.fromEntries(prod.buckets.map((b) => [b.id, b]))
      const rows = []
      const sql = []
      const arr = (a) => (a && a.length ? `array[${a.map(lit).join(', ')}]::text[]` : 'null')
      for (const b of demo.buckets) {
        const p = pb[b.id]
        const same = p && p.public === b.public && String(p.file_size_limit) === String(b.file_size_limit) &&
          JSON.stringify(p.allowed_mime_types || null) === JSON.stringify(b.allowed_mime_types || null)
        rows.push([b.id, `${b.public ? 'public' : 'private'} / ${b.file_size_limit ?? '-'} / ${(b.allowed_mime_types || []).join(',') || '*'}`,
          p ? `${p.public ? 'public' : 'private'} / ${p.file_size_limit ?? '-'} / ${(p.allowed_mime_types || []).join(',') || '*'}` : C.r('없음'),
          same ? 'O' : C.y('차이')])
        if (!p) {
          sql.push(`insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values (${lit(b.id)}, ${lit(b.name)}, ${b.public}, ${b.file_size_limit ?? 'null'}, ${arr(b.allowed_mime_types)}) on conflict (id) do nothing;`)
        } else if (!same) {
          sql.push(`update storage.buckets set public = ${b.public}, file_size_limit = ${b.file_size_limit ?? 'null'}, allowed_mime_types = ${arr(b.allowed_mime_types)} where id = ${lit(b.id)};`)
        }
      }
      table(rows, ['bucket', 'demo (공개/용량/MIME)', '운영', '비교'])
      const prodOnly = prod.buckets.filter((b) => !demo.buckets.some((d) => d.id === b.id)).map((b) => b.id)
      if (prodOnly.length) info(`운영에만 있는 버킷: ${prodOnly.join(', ')}`)

      const pNames = new Set(prod.storagePolicies.map((p) => p.name))
      const lackPol = demo.storagePolicies.filter((p) => !pNames.has(p.name))
      for (const p of lackPol) {
        sql.push([
          `create policy ${ident(p.name)} on storage.objects as ${p.permissive} for ${p.cmd} to ${(p.roles || ['public']).map(roleIdent).join(', ')}`,
          p.qual ? ` using (${p.qual})` : '',
          p.with_check ? ` with check (${p.with_check})` : '',
          ';',
        ].join(''))
      }
      info(`운영에 없는 storage 정책: ${lackPol.length ? lackPol.map((p) => p.name).join(', ') : '없음'}`)
      if (!sql.length) return ok('Storage 설정이 demo 와 같습니다.')
      fs.writeFileSync(F.storageSql, sql.join('\n') + '\n')
      log(C.d(`\n${sql.map((s) => '  ' + s).join('\n')}\n`))
      ok(`SQL: ${F.storageSql}`)
      if (await confirm('위 SQL 을 운영에 적용할까요? Y:n')) {
        execSqlFile(await dbUrl('prod'), F.storageSql)
        ok('Storage 동기화 완료')
        await inventory('prod', { refresh: true })
      }
    },
  },

  {
    id: '2.4-2', section: '2.4 Storage', title: 'demo 버킷 파일을 운영으로 복사 (이미 있으면 건너뜀)',
    desc: ['Storage API 로 demo 에서 내려받아 운영에 올립니다. 운영에 같은 경로가 있으면 건너뜁니다.', '중간에 멈춰도 다시 실행하면 남은 파일만 복사합니다. 실패 목록은 storage-copy-failed.json 에 남깁니다.'],
    async run() {
      const [demoKey, prodKey] = [serviceKey(DEMO_REF), serviceKey(PROD_REF)]
      const demoUrl = await dbUrl('demo')
      const prodUrl = await dbUrl('prod')
      const listSql = (bucket) => `(select coalesce(json_agg(json_build_object('n', name, 'm', metadata->>'mimetype',
        'c', metadata->>'cacheControl', 's', (metadata->>'size')::bigint)), '[]'::json)
        from storage.objects where bucket_id = ${lit(bucket)} and name is not null)`
      const prodBuckets = new Set(queryJson(prodUrl, `(select coalesce(json_agg(id), '[]'::json) from storage.buckets)`))
      const demoBuckets = queryJson(demoUrl, `(select coalesce(json_agg(id order by id), '[]'::json) from storage.buckets)`)

      const plan = []
      for (const b of demoBuckets) {
        const src = queryJson(demoUrl, listSql(b))
        const dst = prodBuckets.has(b) ? new Set(queryJson(prodUrl, `(select coalesce(json_agg(name), '[]'::json) from storage.objects where bucket_id = ${lit(b)})`)) : new Set()
        const todo = src.filter((o) => !dst.has(o.n))
        plan.push({ bucket: b, exists: prodBuckets.has(b), total: src.length, skip: src.length - todo.length, todo })
      }
      const mb = (list) => (list.reduce((s, o) => s + (Number(o.s) || 0), 0) / 1048576).toFixed(1)
      table(plan.map((p) => [p.bucket, p.exists ? 'O' : C.r('없음'), p.total, p.skip, p.todo.length, `${mb(p.todo)} MB`]),
        ['bucket', '운영 버킷', 'demo 파일', '이미 있음', '복사 대상', '용량'])
      const noBucket = plan.filter((p) => !p.exists && p.todo.length)
      if (noBucket.length) warn(`운영에 버킷이 없어 제외: ${noBucket.map((p) => p.bucket).join(', ')} (2.4-1 먼저 진행)`)
      const targets = plan.filter((p) => p.exists && p.todo.length)
      if (!targets.length) return ok('복사할 파일이 없습니다.')
      const pick = await ask('  복사할 버킷(쉼표 구분, Enter=전체):')
      const chosen = pick ? targets.filter((p) => pick.split(',').map((s) => s.trim()).includes(p.bucket)) : targets
      const jobs = chosen.flatMap((p) => p.todo.map((o) => ({ bucket: p.bucket, ...o })))
      const concurrency = Number(await ask('  동시 전송 수:', { def: '8' })) || 8
      if (!(await confirm(`${chosen.map((p) => p.bucket).join(', ')} 의 파일 ${jobs.length}개(${mb(jobs)} MB)를 운영에 복사할까요? Y:n`))) return

      const enc = (name) => name.split('/').map(encodeURIComponent).join('/')
      const headers = (key) => (key.startsWith('eyJ') ? { apikey: key, Authorization: `Bearer ${key}` } : { apikey: key })
      const stats = { copied: 0, skipped: 0, failed: 0, bytes: 0 }
      const failed = []
      const started = Date.now()
      const copyOne = async (o) => {
        for (let attempt = 1; ; attempt++) {
          try {
            const dl = await fetch(`https://${DEMO_REF}.supabase.co/storage/v1/object/authenticated/${o.bucket}/${enc(o.n)}`, { headers: headers(demoKey) })
            if (!dl.ok) throw new Error(`download ${dl.status} ${(await dl.text()).slice(0, 150)}`)
            const body = Buffer.from(await dl.arrayBuffer())
            const up = await fetch(`https://${PROD_REF}.supabase.co/storage/v1/object/${o.bucket}/${enc(o.n)}`, {
              method: 'POST',
              headers: {
                ...headers(prodKey),
                'Content-Type': o.m || dl.headers.get('content-type') || 'application/octet-stream',
                'x-upsert': 'false',
                ...(o.c ? { 'Cache-Control': /^\d+$/.test(o.c) ? `max-age=${o.c}` : o.c } : {}),
              },
              body,
            })
            if (up.ok) { stats.copied++; stats.bytes += body.length; return }
            const text = await up.text()
            // 그사이 누가 올렸거나 이전 실행에서 올라간 파일 → 건너뜀
            if (up.status === 409 || /Duplicate|already exists/i.test(text)) { stats.skipped++; return }
            throw new Error(`upload ${up.status} ${text.slice(0, 150)}`)
          } catch (e) {
            if (attempt < 3) { await new Promise((r) => setTimeout(r, 1000 * attempt)); continue }
            stats.failed++
            failed.push({ bucket: o.bucket, name: o.n, error: e.message })
            return
          }
        }
      }
      const render = () => {
        const done = stats.copied + stats.skipped + stats.failed
        const sec = (Date.now() - started) / 1000
        process.stdout.write(`\r  ${done}/${jobs.length} (${Math.floor((done / jobs.length) * 100)}%)  복사 ${stats.copied} · 건너뜀 ${stats.skipped} · 실패 ${stats.failed}  ${(stats.bytes / 1048576).toFixed(1)} MB  ${(stats.bytes / 1048576 / Math.max(sec, 1)).toFixed(2)} MB/s   `)
      }
      const timer = setInterval(render, 500)
      let next = 0
      await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, async () => {
        while (next < jobs.length) await copyOne(jobs[next++])
      }))
      clearInterval(timer)
      render()
      process.stdout.write('\n')
      const failFile = path.join(WORK_DIR, 'storage-copy-failed.json')
      if (failed.length) {
        fs.writeFileSync(failFile, JSON.stringify(failed, null, 2))
        throw new Error(`${failed.length}개 실패 → ${failFile} (다시 시도하면 남은 파일만 복사)`)
      }
      if (fs.existsSync(failFile)) fs.rmSync(failFile)
      ok(`복사 ${stats.copied}개, 건너뜀 ${stats.skipped}개 완료`)
    },
  },

  {
    id: '2.4-3', section: '2.4 Storage', title: '상품 찾기 데이터 이전 (브랜드 · 카테고리 · 카탈로그 · 상품)',
    desc: [`demo → 운영: ${CATALOG_TABLES.join(', ')}`, '운영에 같은 키(PK/UNIQUE)가 이미 있는 행은 건너뜁니다 (on conflict do nothing).',
      'post_products(게시물 연결)는 2.4-4 에서 게시물과 함께 옮깁니다. user_favorite_brands(사용자 연결)는 제외합니다.'],
    async run() {
      await copyTablesDemoToProd(CATALOG_TABLES, {
        rewriteQuestion: `값 안의 demo 주소(${DEMO_REF}.supabase.co)를 운영 주소로 바꿀까요? (Storage 이미지 URL 등, 2.4-2 로 파일 복사했다면 Y) Y:n`,
        doneMessage: '상품 찾기 데이터 이전 완료',
      })
    },
  },
  {
    id: '2.4-4', section: '2.4 Storage', title: 'LOOX 게시물 이전 (posts · 이미지 · 태그 · 착장 상품)',
    desc: [`demo → 운영: ${POST_TABLES.join(', ')}`, '운영 profiles 에 작성자가 있는 게시물만 옮깁니다. 이미 있는 행은 건너뜁니다.',
      '사진 파일은 2.4-2(loox 버킷), 착장 상품은 2.4-3(products)이 먼저 끝나 있어야 합니다.',
      '좋아요 · 댓글 · 북마크 · 공유 · 알림 · 신고는 다른 사용자 데이터라 옮기지 않습니다.'],
    async run() {
      const demoUrl = await dbUrl('demo')
      const prodUrl = await dbUrl('prod')
      for (const id of ['2.4-2', '2.4-3']) {
        if (state.steps[id]?.status !== 'done') warn(`${id} 가 완료되지 않았습니다. (${id === '2.4-2' ? '게시물 사진이 운영 Storage 에 없을 수 있음' : 'post_products 가 products FK 로 실패함'})`)
      }
      const authors = queryJson(demoUrl, `(select coalesce(json_agg(distinct author_id), '[]'::json) from public.posts)`)
      const present = new Set(authors.length
        ? queryJson(prodUrl, `(select coalesce(json_agg(id), '[]'::json) from public.profiles where id = any(array[${authors.map(lit).join(', ')}]::uuid[]))`)
        : [])
      const missing = authors.filter((a) => !present.has(a))
      info(`작성자 ${authors.length}명 중 운영 profiles 에 있는 ${present.size}명${missing.length ? `, 없는 ${missing.length}명(그 게시물은 제외)` : ''}`)
      if (!present.size) return warn('옮길 수 있는 게시물이 없습니다.')
      const authorFilter = `author_id = any(array[${[...present].map(lit).join(', ')}]::uuid[])`
      const postFilter = `post_id in (select id from public.posts where ${authorFilter})`
      const resetCounts = await confirm('좋아요 · 댓글 · 공유 · 북마크 수를 0 으로 넣을까요? (그 기록은 옮기지 않으므로 Y 권장) Y:n')
      await copyTablesDemoToProd(POST_TABLES, {
        where: Object.fromEntries(POST_TABLES.map((t) => [t, t === 'posts' ? authorFilter : t === 'hashtags' ? null : postFilter])),
        transform: resetCounts
          ? { posts: (r) => ({ ...r, like_count: 0, comment_count: 0, share_count: 0, bookmark_count: 0 }) }
          : {},
        rewriteQuestion: `값 안의 demo 주소(${DEMO_REF}.supabase.co)를 운영 주소로 바꿀까요? Y:n`,
        doneMessage: 'LOOX 게시물 이전 완료',
      })
    },
  },

  // ── 2.5 Auth ───────────────────────────────────────────────
  {
    id: '2.5-1', section: '2.5 Auth (OAuth · Redirect)', title: 'Auth 설정 비교 / Site URL · Redirect 허용 목록 반영',
    desc: ['Management API 토큰이 있으면 demo / 운영 Auth 설정을 비교하고 Site URL, Redirect URL, 가입 설정을 반영합니다.', '토큰이 없으면 대시보드 링크만 안내합니다.'],
    async run() {
      if (!(await accessToken())) {
        info(`URL 설정: ${dash(PROD_REF, '/auth/url-configuration')}`)
        info(`Site URL 에 운영 도메인(예: ${PROD_DOMAIN_DEFAULT}), Redirect 허용 목록에 운영 도메인과 모바일 deep link 스킴을 추가하세요.`)
        info(`이메일 확인 설정(Confirm email)을 demo 와 같게 맞추세요: ${dash(DEMO_REF, '/auth/providers')}`)
        return waitEnter()
      }
      const [d, p] = await Promise.all([
        mgmtApi('GET', `/v1/projects/${DEMO_REF}/config/auth`),
        mgmtApi('GET', `/v1/projects/${PROD_REF}/config/auth`),
      ])
      const keys = ['site_url', 'uri_allow_list', 'disable_signup', 'mailer_autoconfirm', 'external_email_enabled',
        'external_phone_enabled', 'external_anonymous_users_enabled', 'external_kakao_enabled', 'external_google_enabled',
        'external_apple_enabled', 'jwt_exp', 'security_manual_linking_enabled', 'smtp_host', 'smtp_admin_email']
      table(keys.map((k) => [k, String(d[k] ?? ''), String(p[k] ?? ''), String(d[k]) === String(p[k]) ? 'O' : C.y('차이')]), ['항목', 'demo', '운영', ''])
      if (!(await confirm('운영 Site URL / Redirect 허용 목록 / 가입 설정을 반영할까요? Y:n'))) return
      const siteUrl = await ask('  site_url:', { def: p.site_url && !p.site_url.includes('localhost') ? p.site_url : PROD_DOMAIN_DEFAULT })
      const merged = [...new Set([...(p.uri_allow_list || '').split(','), ...(d.uri_allow_list || '').split(',')].map((s) => s.trim()).filter(Boolean))]
      info('demo 와 운영 목록을 합친 값을 기본으로 보여 줍니다. demo 전용 도메인은 지우고 입력하세요.')
      const allow = await ask('  uri_allow_list(쉼표 구분):', { def: merged.join(',') })
      const body = { site_url: siteUrl, uri_allow_list: allow }
      for (const k of ['mailer_autoconfirm', 'disable_signup', 'external_email_enabled', 'external_anonymous_users_enabled', 'security_manual_linking_enabled']) {
        if (d[k] !== undefined && d[k] !== p[k]) body[k] = d[k]
      }
      log(C.d(`  PATCH ${JSON.stringify(body)}`))
      if (await confirm('위 값으로 운영 Auth 설정을 변경할까요? Y:n')) {
        await mgmtApi('PATCH', `/v1/projects/${PROD_REF}/config/auth`, body)
        ok('운영 Auth 설정 변경 완료')
      }
    },
  },
  {
    id: '2.5-2', section: '2.5 Auth (OAuth · Redirect)', title: 'Naver / Kakao / Google 콘솔 Redirect URI 등록 (수동)',
    desc: ['외부 개발자 콘솔 작업이라 자동화하지 않습니다. 아래 값을 등록하세요.'],
    async run() {
      info(`Naver 개발자센터 Callback URL: https://${PROD_REF}.supabase.co/functions/v1/naver-auth`)
      info('  (naver-auth 는 Edge Function 이 /auth/callback 으로 다시 redirect 합니다. FRONTEND_URL secret 확인)')
      info(`Kakao: Supabase provider 를 쓰면 Redirect URI https://${PROD_REF}.supabase.co/auth/v1/callback, SDK 직접 사용이면 운영 도메인 URI`)
      info(`Google: 사용한다면 https://${PROD_REF}.supabase.co/auth/v1/callback 등록 및 Providers 에서 Client ID/Secret 설정`)
      info(`Providers: ${dash(PROD_REF, '/auth/providers')}`)
      await waitEnter()
    },
  },

  // ── 2.6 Edge Functions · Secrets ───────────────────────────
  {
    id: '2.6-1', section: '2.6 Edge Functions · Secrets', title: 'Edge Function naver-auth 배포',
    desc: [`supabase functions deploy naver-auth --no-verify-jwt --project-ref ${PROD_REF}`],
    async run() {
      sb(['functions', 'deploy', 'naver-auth', '--no-verify-jwt', '--project-ref', PROD_REF])
      ok('배포 완료')
    },
  },
  {
    id: '2.6-2', section: '2.6 Edge Functions · Secrets', title: 'Edge Function Secrets 등록',
    desc: ['NAVER_CLIENT_ID, NAVER_CLIENT_SECRET, FRONTEND_URL 과 demo 에만 있는 secret 을 운영에 등록합니다.', '값은 임시 env 파일로 넘기고 바로 삭제합니다. (새로 발급한 값 사용 권장)'],
    async run() {
      const names = (ref) => {
        const r = sb(['secrets', 'list', '--project-ref', ref], { capture: true, quiet: true, allowFail: true })
        return new Set([...(r.stdout || '').matchAll(/^\s*([A-Z][A-Z0-9_]+)\s*[│|]/gm)].map((m) => m[1]))
      }
      const demoNames = names(DEMO_REF)
      const prodNames = names(PROD_REF)
      info(`demo secrets : ${[...demoNames].join(', ') || '(조회 실패 또는 없음)'}`)
      info(`운영 secrets : ${[...prodNames].join(', ') || '(없음)'}`)
      const auto = (n) => n.startsWith('SUPABASE_')
      const wanted = [...new Set(['NAVER_CLIENT_ID', 'NAVER_CLIENT_SECRET', 'FRONTEND_URL', ...[...demoNames].filter((n) => !auto(n))])]
      const values = {}
      for (const n of wanted) {
        const exists = prodNames.has(n) ? C.d(' (운영에 이미 있음, Enter=유지)') : ''
        const hidden = !['FRONTEND_URL', 'NAVER_CLIENT_ID'].includes(n)
        const v = await ask(`  ${n}${exists}:`, { hidden, def: n === 'FRONTEND_URL' && !prodNames.has(n) ? PROD_DOMAIN_DEFAULT : undefined })
        if (v) values[n] = v
      }
      if (!Object.keys(values).length) return ok('등록할 값이 없습니다.')
      info(`등록 대상: ${Object.keys(values).join(', ')}`)
      if (!(await confirm('운영에 등록할까요? Y:n'))) return
      const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'stmx-secrets-')), '.env')
      try {
        fs.writeFileSync(tmp, Object.entries(values).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join('\n') + '\n', { mode: 0o600 })
        sb(['secrets', 'set', '--env-file', tmp, '--project-ref', PROD_REF])
        ok('secrets 등록 완료')
      } finally {
        fs.rmSync(path.dirname(tmp), { recursive: true, force: true })
      }
    },
  },

  // ── 2.7 앱 환경변수 ────────────────────────────────────────
  {
    id: '2.7-1', section: '2.7 앱 환경변수', title: 'env 파일의 Supabase URL 을 운영 ref 로 교체',
    desc: [`.env / .env.docker 등에서 ${DEMO_REF} 를 ${PROD_REF} 로 바꿉니다. (원본은 .bak-<시각> 으로 보관)`],
    async run() {
      const files = envFiles()
      if (!files.length) return warn('env 파일을 찾지 못했습니다.')
      const swap = (k, v) => (v.includes(DEMO_REF) ? v.split(DEMO_REF).join(PROD_REF) : undefined)
      const plan = files.map((f) => [f, rewriteEnv(f, swap, { dryRun: true })])
      table(plan.map(([f, keys]) => [path.relative(PROJECT_DIR, f), keys.join(', ') || '-']), ['파일', '바꿀 변수'])
      for (const f of ['apps/mobile/eas.json', 'apps/mobile/app.json'].map((x) => path.join(PROJECT_DIR, x))) {
        if (fs.existsSync(f) && fs.readFileSync(f, 'utf8').includes(DEMO_REF)) warn(`${path.relative(PROJECT_DIR, f)} 에도 demo ref 가 있습니다. 직접 수정하세요.`)
      }
      if (!plan.some(([, k]) => k.length)) return ok('바꿀 값이 없습니다.')
      if (!(await confirm('위 변수를 교체할까요? Y:n'))) return
      for (const [f] of plan) rewriteEnv(f, swap, { dryRun: false })
      ok('교체 완료')
    },
  },
  {
    id: '2.7-2', section: '2.7 앱 환경변수', title: 'env 파일의 Supabase API 키 / JWT_SECRET 을 운영 값으로 교체',
    desc: ['운영 API 키를 CLI 로 받아 같은 종류(publishable / secret / anon / service_role)로 교체합니다. 값은 화면에 출력하지 않습니다.', 'JWT_SECRET 은 대시보드에서 복사해 입력합니다.'],
    async run() {
      const r = sb(['projects', 'api-keys', '--project-ref', PROD_REF, '--reveal', '-o', 'json'], { capture: true })
      const out = r.stdout || ''
      const keys = {
        publishable: (/sb_publishable_[A-Za-z0-9_-]+/.exec(out) || [])[0],
        secret: (/sb_secret_[A-Za-z0-9_-]+/.exec(out) || [])[0],
      }
      for (const [jwt] of out.matchAll(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)) {
        const p = decodeJwt(jwt)
        if (p?.ref === PROD_REF && p.role) keys[p.role] = jwt
      }
      info(`운영 키 확보: ${Object.entries(keys).filter(([, v]) => v).map(([k]) => k).join(', ') || '없음'}`)
      const jwtSecret = await ask(`  운영 JWT_SECRET (${dash(PROD_REF, '/settings/jwt')}, Enter=건너뜀):`, { hidden: true })
      const transform = (k, v) => {
        if (k === 'JWT_SECRET') return jwtSecret || undefined
        if (!/SUPABASE|_KEY$/.test(k)) return undefined
        if (v.startsWith('sb_publishable_')) return keys.publishable
        if (v.startsWith('sb_secret_')) return keys.secret
        if (v.startsWith('eyJ')) {
          const p = decodeJwt(v)
          if (p?.ref === DEMO_REF && p.role) return keys[p.role]
        }
        return undefined
      }
      const files = envFiles()
      const plan = files.map((f) => [f, rewriteEnv(f, transform, { dryRun: true })])
      table(plan.map(([f, k]) => [path.relative(PROJECT_DIR, f), k.join(', ') || '-']), ['파일', '바꿀 변수'])
      const untouched = ['STMX_WEB_SUPABASE_KEY', 'STMX_WEB_SUPABASE_SECRET_KEY']
      info(`형식을 알 수 없어 자동 교체하지 않는 항목은 직접 확인하세요: ${untouched.join(', ')}`)
      if (!plan.some(([, k]) => k.length)) return ok('바꿀 값이 없습니다.')
      if (!(await confirm('위 변수를 운영 값으로 교체할까요? Y:n'))) return
      for (const [f] of plan) rewriteEnv(f, transform, { dryRun: false })
      ok('교체 완료 (원본은 .bak-<시각> 파일)')
    },
  },
  {
    id: '2.7-3', section: '2.7 앱 환경변수', title: 'Docker 이미지 / EAS 빌드 env 교체 후 재빌드 (수동)',
    desc: ['빌드 시점에 env 가 구워지므로 다시 빌드해야 합니다.'],
    async run() {
      info('web: .env.docker 확인 후 Docker 이미지를 다시 빌드/배포하세요.')
      info('mobile: EAS 프로젝트 env(EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, EXPO_PUBLIC_API_BASE_URL)를 바꾼 뒤 다시 빌드하세요.')
      info(C.d('  예) eas env:list / eas env:update, eas build -p android'))
      await waitEnter()
    },
  },

  // ── 2.8 검증 / 롤백 ────────────────────────────────────────
  {
    id: '2.8-1', section: '2.8 검증 / 롤백', title: '마이그레이션 이력 / RLS 최종 확인',
    desc: ['supabase migration list 로 로컬과 원격 이력을 비교하고, RLS 가 꺼진 테이블을 다시 확인합니다.'],
    async run() {
      sb(['migration', 'list', '--db-url', await dbUrl('prod')])
      const prod = await inventory('prod', { refresh: true })
      const rlsOff = prod.relations.filter((r) => (r.kind === 'r' || r.kind === 'p') && !r.rls).map((r) => r.name)
      ;(rlsOff.length ? warn : ok)(`RLS 꺼진 테이블: ${rlsOff.join(', ') || '없음'}`)
      info(`Advisors(Security): ${dash(PROD_REF, '/advisors/security')}`)
      info(`Advisors(Performance): ${dash(PROD_REF, '/advisors/performance')}`)
      await waitEnter('Advisors 확인 후 Enter')
    },
  },
  {
    id: '2.8-2', section: '2.8 검증 / 롤백', title: '핵심 흐름 smoke test',
    desc: ['항목마다 통과 여부를 입력합니다.'],
    async run() {
      state.data.smoke = state.data.smoke || {}
      for (const t of SMOKE_TESTS) {
        const prev = state.data.smoke[t]
        if (prev === 'pass') { ok(`${t} (이전에 통과)`); continue }
        state.data.smoke[t] = (await confirm(`  ${t} 통과했나요? Y:n`)) ? 'pass' : 'fail'
        saveState()
      }
      const failed = SMOKE_TESTS.filter((t) => state.data.smoke[t] !== 'pass')
      if (failed.length) throw new Error(`실패 항목: ${failed.join(', ')}`)
      ok('smoke test 모두 통과')
    },
  },
  {
    id: '2.8-3', section: '2.8 검증 / 롤백', title: '롤백 방법 / PITR 확인',
    desc: ['down 스크립트가 없으므로 백업 복원 또는 PITR 을 사용합니다.'],
    async run() {
      info(`PITR / 백업: ${dash(PROD_REF, '/database/backups/pitr')}`)
      info('백업 파일:')
      for (const f of [F.prodRoles, F.prodSchema, F.prodData, F.prodStorage]) info(`  ${f} (${fileSize(f)})`)
      info('복원 예시 (psql 필요, 빈 DB 기준):')
      log(C.d([
        '  psql --single-transaction --variable ON_ERROR_STOP=1 \\',
        `    --file "${F.prodRoles}" --file "${F.prodSchema}" \\`,
        '    --command "SET session_replication_role = replica" \\',
        `    --file "${F.prodData}" --dbname "<PROD_DB_URL>"`,
      ].join('\n')))
      await waitEnter()
    },
  },
]

// ─────────────────────────────────────────────────────────────
// 실행
// ─────────────────────────────────────────────────────────────
const STATUS_LABEL = { done: C.g('완료'), skipped: C.y('건너뜀'), failed: C.r('실패') }

function printProgress() {
  const done = STEPS.filter((s) => state.steps[s.id]?.status === 'done').length
  log(C.b(`\n진행 현황 ${done}/${STEPS.length} (${Math.round((done / STEPS.length) * 100)}%)  ${C.d(STATE_FILE)}`))
  let section = ''
  for (const s of STEPS) {
    if (s.section !== section) { section = s.section; log(C.b(`  ${section}`)) }
    const st = state.steps[s.id]
    log(`    ${s.id.padEnd(6)} ${(st ? STATUS_LABEL[st.status] : C.d('대기')).padEnd(8)} ${s.title}${st?.note ? C.d(`  (${st.note})`) : ''}`)
  }
  log('')
}

async function main() {
  if (argv.includes('--reset')) {
    if (fs.existsSync(STATE_FILE)) fs.rmSync(STATE_FILE)
    log('진행 기록을 초기화했습니다.')
    return
  }
  if (argv.includes('--list')) return printProgress()
  const redo = (argValue('--redo') || '').split(',').map((s) => s.trim()).filter(Boolean)
  for (const id of redo) {
    if (!STEPS.some((s) => s.id === id)) throw new Error(`없는 스텝: ${id}`)
    delete state.steps[id]
  }
  if (redo.length) saveState()

  log(C.b('\nSTMX phase2 → 운영 Supabase 이식'))
  log(`  demo  https://${DEMO_REF}.supabase.co`)
  log(`  운영  https://${PROD_REF}.supabase.co`)
  if (ENV_LOADED.length) log(`  env   ${ENV_FILE} (${ENV_LOADED.join(', ')})`)
  else log(C.y(`  env   ${ENV_FILE} 없음 또는 비어 있음 → DB URL 을 실행 중에 입력받습니다.`))
  log(C.d('  각 스텝에서 Y(Enter)=진행, n=건너뛰기, q=중단'))
  if (Object.keys(state.steps).length) printProgress()

  let section = ''
  for (let i = 0; i < STEPS.length; i++) {
    const step = STEPS[i]
    if (step.section !== section) {
      section = step.section
      log(C.b(`\n━━ ${section} ${'━'.repeat(Math.max(0, 50 - section.length))}`))
    }
    log(C.b(`\n[${i + 1}/${STEPS.length}] ${step.id}  ${step.title}`))
    if (state.steps[step.id]?.status === 'done') {
      ok(`이미 완료 (${state.steps[step.id].at})  ${C.d(`다시 하려면 --redo ${step.id}`)}`)
      continue
    }
    for (const d of step.desc || []) info(d)
    if (!(await confirm())) {
      mark(step.id, 'skipped')
      info('건너뜀')
      continue
    }
    for (;;) {
      try {
        await step.run()
        mark(step.id, 'done')
        break
      } catch (e) {
        if (e instanceof QuitSignal) throw e
        fail(e.message)
        mark(step.id, 'failed', e.message.split('\n')[0].slice(0, 200))
        const a = (await ask(C.b('다시 시도(r) / 건너뛰기(s) / 중단(q)?'), { def: 'r' })).toLowerCase()
        if (a === 's' || a === 'ㄴ') { mark(step.id, 'skipped', e.message.split('\n')[0].slice(0, 200)); break }
        if (a === 'q' || a === 'ㅂ') throw new QuitSignal()
      }
    }
  }
  printProgress()
  const left = STEPS.filter((s) => state.steps[s.id]?.status !== 'done')
  if (left.length) info(`남은 스텝 ${left.length}개: ${left.map((s) => s.id).join(', ')}  (다시 실행하면 이어서 진행)`)
  else ok('모든 스텝을 완료했습니다.')
}

process.on('SIGINT', () => {
  log(C.y('\n중단했습니다. 다시 실행하면 이어서 진행합니다.'))
  process.exit(130)
})

main().catch((e) => {
  if (e instanceof QuitSignal) {
    log(C.y('\n중단했습니다. 다시 실행하면 이어서 진행합니다.'))
    printProgress()
    process.exit(0)
  }
  console.error(C.r(`\n오류: ${e.stack || e.message}`))
  process.exit(1)
})
