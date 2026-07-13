-- 훅 테이블 RLS 정책만 다시 적용 (SQL Editor에서 anon 키로 0건일 때)
-- 테이블/시드는 있는데 앱에서 cp_hook_types·cp_hooks가 비어 보이면 이 스크립트를 실행하세요.

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
