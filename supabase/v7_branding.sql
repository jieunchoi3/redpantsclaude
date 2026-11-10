-- 콘텐츠 플래너 v7 — 브랜딩 레퍼런스
-- 훅과 같이 워크스페이스를 나누지 않습니다.

create table if not exists cp_brand_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  handle text,
  notes text,
  analysis jsonb,
  archived boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists cp_brand_shots (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references cp_brand_profiles(id) on delete cascade,
  kind text not null check (kind in ('profile', 'bio', 'editing', 'other')),
  image_url text not null,
  created_at timestamptz default now()
);

create index if not exists cp_brand_profiles_archived_idx
  on cp_brand_profiles (archived, created_at desc);
create index if not exists cp_brand_shots_profile_idx
  on cp_brand_shots (profile_id, kind, created_at desc);

alter table cp_brand_profiles enable row level security;
alter table cp_brand_shots enable row level security;

drop policy if exists "anon all cp_brand_profiles" on cp_brand_profiles;
create policy "anon all cp_brand_profiles"
  on cp_brand_profiles for all using (true) with check (true);

drop policy if exists "anon all cp_brand_shots" on cp_brand_shots;
create policy "anon all cp_brand_shots"
  on cp_brand_shots for all using (true) with check (true);
