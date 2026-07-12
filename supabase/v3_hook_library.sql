-- 콘텐츠 플래너 v3 / Phase 1 — Supabase SQL Editor에서 한 번 실행
-- 훅은 두 워크스페이스에서 공유하므로 cp_hooks에 workspace 컬럼을 만들지 않습니다.

create table if not exists cp_hooks (
  id uuid primary key default gen_random_uuid(),
  content text not null default '',
  hook_type text,
  media_kind text check (media_kind in ('none','image','video_link','video_file')) default 'none',
  image_url text,
  video_url text,
  video_file_url text,
  source_note text,
  is_inbox boolean default false,
  used_count int default 0,
  archived boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists cp_hook_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  color text,
  sort_order int default 0,
  created_at timestamptz default now()
);

create unique index if not exists cp_hook_types_name_unique
  on cp_hook_types (name);

create table if not exists cp_hook_accounts (
  hook_id uuid references cp_hooks(id) on delete cascade,
  account_id uuid references cp_accounts(id) on delete cascade,
  primary key (hook_id, account_id)
);

create table if not exists cp_hook_usages (
  id uuid primary key default gen_random_uuid(),
  hook_id uuid references cp_hooks(id) on delete cascade,
  idea_id uuid references cp_ideas(id) on delete set null,
  rating int check (rating between 1 and 5),
  note text,
  used_at timestamptz default now()
);

insert into cp_hook_types (name, description, color, sort_order) values
  ('카드뉴스 커버 훅 (시각/텍스트)', '카드뉴스 첫 장에서 시선을 잡는 문구·비주얼', '#D9A6AF', 1),
  ('릴스 음성 훅 (초반 대사)', '"아니 여러분! 이거 여태 몰랐어요?"처럼 초반 나레이션으로 잡는 훅', '#A8BFD8', 2),
  ('릴스 시각 훅 (초반 영상)', '초반에 결과부터 공개하는 등 영상 자체로 잡는 훅', '#B6AED5', 3),
  ('텍스트 훅 (캡션 첫 줄)', '캡션 도입부에서 스크롤을 멈추게 하는 문장', '#A9C8B9', 4)
on conflict (name) do nothing;

-- Red Pants도 적용 대상 계정으로 선택할 수 있도록 계정 행을 하나 둡니다.
insert into cp_accounts (workspace, name, color, sort_order)
select 'redpants', '빨간바지', '#D98E9B', 0
where not exists (
  select 1 from cp_accounts
  where workspace = 'redpants' and name = '빨간바지'
);

update cp_accounts set color = case name
  when '잡식걸' then '#D9A6AF'
  when 'Filmmee' then '#A8BFD8'
  when 'Here & There' then '#B6AED5'
  when 'Cozzzy Capture' then '#A9C8B9'
  when 'otterkaji' then '#DCC08C'
  when 'Vintage Flows' then '#C4AD9D'
  when '바이브 코딩' then '#AFC2A7'
  else color
end
where workspace = 'jieun' and color is null;

create index if not exists cp_hooks_archived_created_idx
  on cp_hooks (archived, created_at desc);
create index if not exists cp_hook_usages_hook_idx
  on cp_hook_usages (hook_id, used_at desc);

alter table cp_hooks enable row level security;
alter table cp_hook_types enable row level security;
alter table cp_hook_accounts enable row level security;
alter table cp_hook_usages enable row level security;

drop policy if exists "anon all cp_hooks" on cp_hooks;
create policy "anon all cp_hooks"
  on cp_hooks for all using (true) with check (true);
drop policy if exists "anon all cp_hook_types" on cp_hook_types;
create policy "anon all cp_hook_types"
  on cp_hook_types for all using (true) with check (true);
drop policy if exists "anon all cp_hook_accounts" on cp_hook_accounts;
create policy "anon all cp_hook_accounts"
  on cp_hook_accounts for all using (true) with check (true);
drop policy if exists "anon all cp_hook_usages" on cp_hook_usages;
create policy "anon all cp_hook_usages"
  on cp_hook_usages for all using (true) with check (true);

insert into storage.buckets (id, name, public, file_size_limit)
values ('cp-hook-media', 'cp-hook-media', true, 104857600)
on conflict (id) do update
set public = true, file_size_limit = 104857600;

drop policy if exists "public read cp-hook-media" on storage.objects;
create policy "public read cp-hook-media"
  on storage.objects for select
  using (bucket_id = 'cp-hook-media');
drop policy if exists "anon upload cp-hook-media" on storage.objects;
create policy "anon upload cp-hook-media"
  on storage.objects for insert
  with check (bucket_id = 'cp-hook-media');
drop policy if exists "anon update cp-hook-media" on storage.objects;
create policy "anon update cp-hook-media"
  on storage.objects for update
  using (bucket_id = 'cp-hook-media')
  with check (bucket_id = 'cp-hook-media');
drop policy if exists "anon delete cp-hook-media" on storage.objects;
create policy "anon delete cp-hook-media"
  on storage.objects for delete
  using (bucket_id = 'cp-hook-media');
