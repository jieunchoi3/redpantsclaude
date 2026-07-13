-- 매체·앵글 분류 테이블 RLS (앱에서 cp_hook_mediums / cp_hook_angles가 0건일 때)
-- SQL Editor에 데이터가 보이는데 앱이 0건이면 이 스크립트를 실행하세요.

alter table cp_hook_mediums enable row level security;
alter table cp_hook_angles enable row level security;
alter table cp_hook_medium_map enable row level security;
alter table cp_hook_angle_map enable row level security;

drop policy if exists "anon all cp_hook_mediums" on cp_hook_mediums;
create policy "anon all cp_hook_mediums"
  on cp_hook_mediums for all using (true) with check (true);

drop policy if exists "anon all cp_hook_angles" on cp_hook_angles;
create policy "anon all cp_hook_angles"
  on cp_hook_angles for all using (true) with check (true);

drop policy if exists "anon all cp_hook_medium_map" on cp_hook_medium_map;
create policy "anon all cp_hook_medium_map"
  on cp_hook_medium_map for all using (true) with check (true);

drop policy if exists "anon all cp_hook_angle_map" on cp_hook_angle_map;
create policy "anon all cp_hook_angle_map"
  on cp_hook_angle_map for all using (true) with check (true);
