-- 콘텐츠 플래너 — 훅 분해 저장
-- Supabase SQL Editor에 전체를 붙여넣고 Run 하세요.

alter table cp_hooks
  add column if not exists source_kind text default 'reference';

alter table cp_hooks
  add column if not exists analysis jsonb;

update cp_hooks
set source_kind = 'reference'
where source_kind is null;

alter table cp_hooks
  drop constraint if exists cp_hooks_source_kind_check;

alter table cp_hooks
  add constraint cp_hooks_source_kind_check
  check (source_kind in ('reference', 'own'));
