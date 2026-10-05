-- V43 — Login individual dos professores (migração aditiva e segura)
alter table public.sabado_users
  add column if not exists permissions jsonb not null default '{"view_home":true,"view_students":true,"manage_students":false,"view_mothers":false,"manage_mothers":false,"view_schedules":true,"manage_schedules":false,"view_meetings":true,"manage_meetings":false,"view_attendance":true,"manage_attendance":true,"view_history":true,"view_users":false,"view_birthdays":true,"view_calendar":true,"manage_calendar":false,"view_celebrations":true,"manage_celebrations":false}'::jsonb;

update public.sabado_users
set permissions = '{"view_home":true,"view_students":true,"manage_students":false,"view_mothers":false,"manage_mothers":false,"view_schedules":true,"manage_schedules":false,"view_meetings":true,"manage_meetings":false,"view_attendance":true,"manage_attendance":true,"view_history":true,"view_users":false,"view_birthdays":true,"view_calendar":true,"manage_calendar":false,"view_celebrations":true,"manage_celebrations":false}'::jsonb
where role='Professor' and (permissions is null or permissions='{}'::jsonb);

create or replace function public.sabado_can_register_email(p_email text)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select
    lower(trim(coalesce(p_email,'')))='andreytrindadedossantos@gmail.com'
    or exists(
      select 1
      from public.sabado_users u
      where lower(trim(u.email))=lower(trim(coalesce(p_email,'')))
        and u.status<>'Inativo'
    )
$$;

grant execute on function public.sabado_can_register_email(text) to anon, authenticated;

create or replace function public.sabado_link_auth_user()
returns trigger
language plpgsql
security definer
set search_path=public,auth
as $$
begin
  update public.sabado_users
     set auth_user_id=new.id, updated_at=now()
   where lower(trim(email))=lower(trim(coalesce(new.email,'')));
  return new;
end;
$$;

drop trigger if exists sabado_link_auth_user_trg on auth.users;
create trigger sabado_link_auth_user_trg
after insert or update of email on auth.users
for each row execute function public.sabado_link_auth_user();

update public.sabado_users u
set auth_user_id=a.id
from auth.users a
where lower(trim(u.email))=lower(trim(coalesce(a.email,'')))
  and (u.auth_user_id is distinct from a.id);
