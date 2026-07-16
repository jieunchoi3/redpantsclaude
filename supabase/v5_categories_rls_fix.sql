-- jieun 계정별 카테고리가 저장/조회되지 않을 때 RLS 재적용
-- v2 마이그레이션(supabase/v2_workspace_accounts.sql)도 함께 실행했는지 확인하세요.

alter table cp_categories enable row level security;

drop policy if exists "anon all cp_categories" on cp_categories;
create policy "anon all cp_categories"
  on cp_categories for all using (true) with check (true);
