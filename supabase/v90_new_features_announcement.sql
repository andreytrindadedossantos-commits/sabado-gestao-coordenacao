create table if not exists public.sabado_user_announcements (
  user_id uuid not null references public.sabado_users(id) on delete cascade,
  announcement_key text not null,
  acknowledged_at timestamptz not null default now(),
  primary key (user_id, announcement_key)
);

alter table public.sabado_user_announcements enable row level security;

drop policy if exists sabado_user_announcements_select_own on public.sabado_user_announcements;
drop policy if exists sabado_user_announcements_insert_own on public.sabado_user_announcements;

create policy sabado_user_announcements_select_own
on public.sabado_user_announcements
for select to anon,authenticated
using (user_id=public.sabado_custom_profile_id() or public.sabado_is_admin());

create policy sabado_user_announcements_insert_own
on public.sabado_user_announcements
for insert to anon,authenticated
with check (user_id=public.sabado_custom_profile_id() or public.sabado_is_admin());

grant select,insert on public.sabado_user_announcements to anon,authenticated;

create or replace function public.sabado_system_overview_v90()
returns jsonb
language sql
security invoker
set search_path='public','pg_catalog'
as $$
  select jsonb_set(public.sabado_system_overview_v88(),'{app_version}',to_jsonb('V90'::text),true)
$$;
revoke all on function public.sabado_system_overview_v90() from public;
grant execute on function public.sabado_system_overview_v90() to anon,authenticated;
