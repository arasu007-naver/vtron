-- VTON 스튜디오 스키마
--
-- app/api/vton/{projects,projects/[id],render} 라우트가 기대하는 테이블 정의.
-- Supabase 대시보드 → SQL Editor 에 붙여넣어 실행한다.
--
-- 서버 라우트는 service role 키로 접근하므로 RLS 를 우회한다.
-- 브라우저에서 직접 읽는 코드는 아직 없으므로 RLS 는 켜두되 정책은 두지 않는다
-- (= anon 키로는 아무것도 보이지 않음). 클라이언트 직접 조회가 필요해지면
-- user_id 기반 정책을 추가할 것.

create extension if not exists "pgcrypto";

-- 1) 프로젝트(세션) -------------------------------------------------------
create table if not exists public.vton_projects (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users (id) on delete cascade,
  title               text        not null default 'Untitled VTON Session',
  width               integer     not null default 1080,
  height              integer     not null default 1350,
  size_label          text        not null default '1080 × 1350',
  bg_type             text        not null default 'css'
                        check (bg_type in ('css', 'image', 'solid')),
  bg_value            text,
  bg_fit              text        not null default 'Cover',
  character_image_url text,
  character_scale     integer     not null default 100,
  auto_remove_bg      boolean     not null default true,
  preserve_face_hands boolean     not null default true,
  seed                integer     not null default 4821,
  status              text        not null default 'draft',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists vton_projects_user_id_idx
  on public.vton_projects (user_id);
create index if not exists vton_projects_created_at_idx
  on public.vton_projects (created_at desc);

-- 2) 가먼트 레이어 ---------------------------------------------------------
-- projects 라우트의 `select("*, garments:vton_garments(*)")` 임베드가
-- 동작하려면 아래 FK 가 반드시 있어야 한다.
create table if not exists public.vton_garments (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid        not null references public.vton_projects (id) on delete cascade,
  slot       text        not null,
  name       text        not null,
  layer      integer     not null default 1,
  fit        integer     not null default 70 check (fit between 0 and 100),
  image_url  text,
  created_at timestamptz not null default now()
);

create index if not exists vton_garments_project_id_idx
  on public.vton_garments (project_id, layer);

-- 3) 렌더 잡 ---------------------------------------------------------------
create table if not exists public.vton_render_jobs (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid references public.vton_projects (id) on delete set null,
  user_id          uuid references auth.users (id) on delete set null,
  status           text        not null default 'pending'
                     check (status in ('pending', 'processing', 'completed', 'failed')),
  progress         integer     not null default 0 check (progress between 0 and 100),
  seed             integer     not null default 4821,
  result_image_url text,
  logs             jsonb       not null default '[]'::jsonb,
  error_message    text,
  created_at       timestamptz not null default now(),
  completed_at     timestamptz
);

create index if not exists vton_render_jobs_project_id_idx
  on public.vton_render_jobs (project_id, created_at desc);

-- 4) updated_at 자동 갱신 ---------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists vton_projects_set_updated_at on public.vton_projects;
create trigger vton_projects_set_updated_at
  before update on public.vton_projects
  for each row execute function public.set_updated_at();

-- 5) RLS -------------------------------------------------------------------
alter table public.vton_projects    enable row level security;
alter table public.vton_garments    enable row level security;
alter table public.vton_render_jobs enable row level security;
