-- 콘텐츠 플래너 v2 — Supabase SQL Editor에서 한 번 실행
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
