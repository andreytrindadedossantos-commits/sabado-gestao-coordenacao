-- V43 — Endurecimento de permissões.
-- APLICAR SOMENTE DEPOIS de publicar a V43, porque ela exige login.

create or replace function public.sabado_is_admin()
returns boolean language sql stable security invoker as $$
  select lower(coalesce(auth.jwt()->>'email',''))='andreytrindadedossantos@gmail.com'
$$;

create or replace function public.sabado_is_active()
returns boolean
language sql stable security definer set search_path=public
as $$
  select public.sabado_is_admin() or exists(
    select 1 from public.sabado_users u
    where lower(trim(u.email))=lower(trim(coalesce(auth.jwt()->>'email','')))
      and u.status<>'Inativo'
  )
$$;

create or replace function public.sabado_has_permission(p_key text)
returns boolean
language sql stable security definer set search_path=public
as $$
  select public.sabado_is_admin() or coalesce((
    select (u.permissions->>p_key)::boolean
    from public.sabado_users u
    where lower(trim(u.email))=lower(trim(coalesce(auth.jwt()->>'email','')))
      and u.status<>'Inativo'
    limit 1
  ),false)
$$;

create or replace function public.sabado_current_profile_id()
returns uuid
language sql stable security definer set search_path=public
as $$
  select u.id from public.sabado_users u
  where lower(trim(u.email))=lower(trim(coalesce(auth.jwt()->>'email','')))
  limit 1
$$;

grant execute on function public.sabado_is_active() to authenticated;
grant execute on function public.sabado_has_permission(text) to authenticated;
grant execute on function public.sabado_current_profile_id() to authenticated;

-- Remove acessos públicos antigos.
do $$
declare t text;
begin
  foreach t in array array['sabado_students','sabado_users','sabado_mothers','sabado_schedules','sabado_attendance','sabado_events','sabado_meetings','sabado_notifications','sabado_settings']
  loop
    execute format('drop policy if exists sabado_read on public.%I',t);
    execute format('drop policy if exists sabado_admin on public.%I',t);
    execute format('drop policy if exists sabado_public_write on public.%I',t);
  end loop;
end $$;
drop policy if exists sabado_professors_public_insert on public.sabado_users;
drop policy if exists sabado_professors_public_update on public.sabado_users;
drop policy if exists sabado_professors_public_delete on public.sabado_users;
drop policy if exists sabado_public_notifications_insert on public.sabado_notifications;

-- USERS: ativos podem ler diretório; apenas Super Admin altera.
create policy sabado_users_read_logged on public.sabado_users for select to authenticated
using(public.sabado_is_admin() or public.sabado_is_active() or lower(trim(email))=lower(trim(coalesce(auth.jwt()->>'email',''))));
create policy sabado_users_admin_write on public.sabado_users for all to authenticated
using(public.sabado_is_admin()) with check(public.sabado_is_admin());

-- STUDENTS
create policy sabado_students_read_logged on public.sabado_students for select to authenticated
using(public.sabado_is_active() and (
  public.sabado_has_permission('view_students') or public.sabado_has_permission('view_attendance')
  or public.sabado_has_permission('view_birthdays') or public.sabado_has_permission('view_home')
));
create policy sabado_students_write_permission on public.sabado_students for all to authenticated
using(public.sabado_has_permission('manage_students')) with check(public.sabado_has_permission('manage_students'));

-- MOTHERS
create policy sabado_mothers_read_logged on public.sabado_mothers for select to authenticated
using(public.sabado_is_active() and (public.sabado_has_permission('view_mothers') or public.sabado_has_permission('view_schedules')));
create policy sabado_mothers_write_permission on public.sabado_mothers for all to authenticated
using(public.sabado_has_permission('manage_mothers')) with check(public.sabado_has_permission('manage_mothers'));

-- SCHEDULES
create policy sabado_schedules_read_logged on public.sabado_schedules for select to authenticated
using(public.sabado_is_active() and (public.sabado_has_permission('view_schedules') or public.sabado_has_permission('view_home') or public.sabado_has_permission('view_attendance')));
create policy sabado_schedules_write_permission on public.sabado_schedules for all to authenticated
using(public.sabado_has_permission('manage_schedules')) with check(public.sabado_has_permission('manage_schedules'));

-- ATTENDANCE
create policy sabado_attendance_read_logged on public.sabado_attendance for select to authenticated
using(public.sabado_is_active() and (public.sabado_has_permission('view_attendance') or public.sabado_has_permission('view_history') or public.sabado_has_permission('view_home')));
create policy sabado_attendance_write_permission on public.sabado_attendance for all to authenticated
using(public.sabado_has_permission('manage_attendance')) with check(public.sabado_has_permission('manage_attendance'));

-- EVENTS / CELEBRATIONS
create policy sabado_events_read_logged on public.sabado_events for select to authenticated
using(public.sabado_is_active() and (public.sabado_has_permission('view_calendar') or public.sabado_has_permission('view_celebrations') or public.sabado_has_permission('view_home')));
create policy sabado_events_insert_permission on public.sabado_events for insert to authenticated
with check(
  public.sabado_is_admin()
  or (type='Festa' and public.sabado_has_permission('manage_celebrations'))
  or (type<>'Festa' and public.sabado_has_permission('manage_calendar'))
);
create policy sabado_events_update_permission on public.sabado_events for update to authenticated
using(
  public.sabado_is_admin()
  or (type='Festa' and public.sabado_has_permission('manage_celebrations'))
  or (type<>'Festa' and public.sabado_has_permission('manage_calendar'))
)
with check(
  public.sabado_is_admin()
  or (type='Festa' and public.sabado_has_permission('manage_celebrations'))
  or (type<>'Festa' and public.sabado_has_permission('manage_calendar'))
);
create policy sabado_events_delete_permission on public.sabado_events for delete to authenticated
using(
  public.sabado_is_admin()
  or (type='Festa' and public.sabado_has_permission('manage_celebrations'))
  or (type<>'Festa' and public.sabado_has_permission('manage_calendar'))
);

-- MEETINGS
create policy sabado_meetings_read_logged on public.sabado_meetings for select to authenticated
using(public.sabado_is_active() and (public.sabado_has_permission('view_meetings') or public.sabado_has_permission('view_home')));
create policy sabado_meetings_write_permission on public.sabado_meetings for all to authenticated
using(public.sabado_has_permission('manage_meetings')) with check(public.sabado_has_permission('manage_meetings'));

-- RESPONSES: cada professor altera apenas a própria resposta.
drop policy if exists sabado_rsp_read on public.sabado_meeting_responses;
drop policy if exists sabado_rsp_insert on public.sabado_meeting_responses;
drop policy if exists sabado_rsp_update on public.sabado_meeting_responses;
create policy sabado_rsp_read_logged on public.sabado_meeting_responses for select to authenticated
using(public.sabado_is_active() and public.sabado_has_permission('view_meetings'));
create policy sabado_rsp_insert_self on public.sabado_meeting_responses for insert to authenticated
with check(public.sabado_is_admin() or user_id=public.sabado_current_profile_id());
create policy sabado_rsp_update_self on public.sabado_meeting_responses for update to authenticated
using(public.sabado_is_admin() or user_id=public.sabado_current_profile_id())
with check(public.sabado_is_admin() or user_id=public.sabado_current_profile_id());

-- NOTIFICATIONS / SETTINGS
create policy sabado_notifications_read_logged on public.sabado_notifications for select to authenticated
using(public.sabado_is_active());
create policy sabado_notifications_insert_logged on public.sabado_notifications for insert to authenticated
with check(public.sabado_is_active());
create policy sabado_settings_read_logged on public.sabado_settings for select to authenticated
using(public.sabado_is_active());
create policy sabado_settings_admin_write on public.sabado_settings for all to authenticated
using(public.sabado_is_admin()) with check(public.sabado_is_admin());
