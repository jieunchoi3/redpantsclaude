-- 콘텐츠 플래너 스키마 (기존 Supabase 프로젝트 공유용)
-- 모든 테이블은 cp_ 접두사. 다른 테이블/버킷은 건드리지 않음.
-- Supabase SQL Editor에서 실행하세요.

-- 카테고리 (채널별, 수정/추가/삭제 가능)
create table if not exists cp_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel text not null check (channel in ('instagram','youtube')),
  sort_order int default 0,
  created_at timestamptz default now()
);

-- 아이디어 (핵심 테이블)
create table if not exists cp_ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null default '제목 없음',
  brainstorm text default '',
  channels text[] default '{}',
  ig_format text check (ig_format in ('카드뉴스','릴스','스토리')),
  yt_format text check (yt_format in ('롱폼','숏폼')),
  category_id uuid references cp_categories(id) on delete set null,
  status text not null default '기획하기'
    check (status in ('기획하기','촬영하기','편집하기','업로드 하기','업로드 완료')),
  scheduled_date date,
  sort_order int default 0,
  archived boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 캡션 템플릿
create table if not exists cp_caption_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  body text not null default '',
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 앱 전역 데이터 (자유 노트 + 주간 목표, 항상 1행)
create table if not exists cp_app_meta (
  id int primary key default 1,
  free_notes text default '',
  goal_ig_cardnews int default 2,
  goal_ig_reels int default 1,
  goal_yt_long int default 1,
  goal_yt_short int default 3,
  updated_at timestamptz default now(),
  constraint cp_app_meta_single_row check (id = 1)
);

insert into cp_app_meta (id) values (1) on conflict do nothing;

-- 기본 카테고리 시드 (이미 있으면 스킵)
insert into cp_categories (name, channel, sort_order)
select * from (values
  ('1분 인문학','instagram',1),
  ('정보성 (맛집,카페,마트,핫플)','instagram',2),
  ('영국에 대한 모든 것 (문화충격,여행팁)','instagram',3),
  ('투어 홍보','instagram',4),
  ('대표님 인생 썰','youtube',1),
  ('대표님 잡지식','youtube',2)
) as v(name, channel, sort_order)
where not exists (select 1 from cp_categories limit 1);

-- Storage: Dashboard > Storage에서 public 버킷 `cp-idea-images` 생성하세요.
-- RLS: 개인 저강도 툴 — anon 읽기/쓰기 허용.

alter table cp_categories enable row level security;
alter table cp_ideas enable row level security;
alter table cp_caption_templates enable row level security;
alter table cp_app_meta enable row level security;

drop policy if exists "anon all cp_categories" on cp_categories;
create policy "anon all cp_categories" on cp_categories for all using (true) with check (true);

drop policy if exists "anon all cp_ideas" on cp_ideas;
create policy "anon all cp_ideas" on cp_ideas for all using (true) with check (true);

drop policy if exists "anon all cp_caption_templates" on cp_caption_templates;
create policy "anon all cp_caption_templates" on cp_caption_templates for all using (true) with check (true);

drop policy if exists "anon all cp_app_meta" on cp_app_meta;
create policy "anon all cp_app_meta" on cp_app_meta for all using (true) with check (true);

-- 콘텐츠 플래너 v2: 워크스페이스 + jieun 계정 층 (additive migration)
alter table cp_ideas
  add column if not exists workspace text not null default 'redpants';
alter table cp_categories
  add column if not exists workspace text not null default 'redpants';

create table if not exists cp_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace text not null default 'jieun',
  name text not null,
  color text,
  sort_order int default 0,
  archived boolean default false,
  created_at timestamptz default now()
);

alter table cp_ideas
  add column if not exists account_id uuid references cp_accounts(id) on delete set null;
alter table cp_ideas
  add column if not exists jieun_channel text
    check (jieun_channel in ('인스타그램','해당 없음'));
alter table cp_ideas
  add column if not exists jieun_format text
    check (jieun_format in ('릴스','포스트'));
alter table cp_categories
  add column if not exists account_id uuid references cp_accounts(id) on delete cascade;

insert into cp_accounts (workspace, name, sort_order)
select 'jieun', seed.name, seed.sort_order
from (
  values
    ('잡식걸', 1),
    ('Filmmee', 2),
    ('Here & There', 3),
    ('Cozzzy Capture', 4),
    ('otterkaji', 5),
    ('Vintage Flows', 6),
    ('바이브 코딩', 7)
) as seed(name, sort_order)
where not exists (
  select 1
  from cp_accounts existing
  where existing.workspace = 'jieun'
    and existing.name = seed.name
);

alter table cp_accounts enable row level security;
drop policy if exists "anon all cp_accounts" on cp_accounts;
create policy "anon all cp_accounts"
  on cp_accounts for all using (true) with check (true);
