-- Banco SÁBADO – Gestão e Coordenação
create extension if not exists pgcrypto;

create table if not exists public.sabado_students (
 id uuid primary key default gen_random_uuid(), name text not null, birth date,
 group_name text not null default 'A definir', guardian text not null default '',
 phone text not null default '', notes text not null default '', age_info text not null default '',
 sex text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.sabado_users (
 id uuid primary key default gen_random_uuid(), name text not null, email text not null default '',
 phone text not null default '', role text not null default 'Professor', group_name text not null default 'Geral',
 status text not null default 'Ativo', birth date, age_info text not null default '', auth_user_id uuid,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.sabado_mothers (
 id uuid primary key default gen_random_uuid(), name text not null, phone text not null default '',
 email text not null default '', notes text not null default '', active boolean not null default true,
 birth date, age_info text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.sabado_schedules (
 id uuid primary key default gen_random_uuid(), date date not null, adolescent_teacher text not null default '',
 younger_teacher text not null default '', cleaning_helper text not null default '', topic text not null default '',
 replacement_reason text not null default '', updated_at timestamptz not null default now()
);
create table if not exists public.sabado_attendance (
 id uuid primary key default gen_random_uuid(), date date not null, teacher text not null,
 group_name text not null default 'Todos os alunos', entries jsonb not null default '[]'::jsonb,
 created_at timestamptz not null default now()
);
create table if not exists public.sabado_events (
 id uuid primary key default gen_random_uuid(), title text not null, date date not null,
 type text not null default 'Evento', time time, notes text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.sabado_meetings (
 id uuid primary key default gen_random_uuid(), title text not null, date date not null, time time,
 location text not null default '', notes text not null default '', created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.sabado_meeting_responses (
 id uuid primary key default gen_random_uuid(),
 meeting_id uuid not null references public.sabado_meetings(id) on delete cascade,
 user_id uuid not null references public.sabado_users(id) on delete cascade,
 user_name text not null, status text not null check(status in ('yes','no')),
 updated_at timestamptz not null default now(), unique(meeting_id,user_id)
);
create table if not exists public.sabado_notifications (
 id uuid primary key default gen_random_uuid(), title text not null, body text not null default '',
 date timestamptz not null default now(), kind text not null default 'general',
 notice_key text not null default '', meeting_id uuid references public.sabado_meetings(id) on delete cascade,
 created_at timestamptz not null default now()
);
create table if not exists public.sabado_settings (
 id integer primary key default 1 check(id=1), name text not null default 'SÁBADO',
 subtitle text not null default 'Gestão e Coordenação', updated_at timestamptz not null default now()
);
insert into public.sabado_settings(id,name,subtitle) values(1,'SÁBADO','Gestão e Coordenação') on conflict(id) do nothing;

alter table public.sabado_students enable row level security;
alter table public.sabado_users enable row level security;
alter table public.sabado_mothers enable row level security;
alter table public.sabado_schedules enable row level security;
alter table public.sabado_attendance enable row level security;
alter table public.sabado_events enable row level security;
alter table public.sabado_meetings enable row level security;
alter table public.sabado_meeting_responses enable row level security;
alter table public.sabado_notifications enable row level security;
alter table public.sabado_settings enable row level security;

create or replace function public.sabado_is_admin() returns boolean
language sql stable security invoker as $$
 select coalesce((auth.jwt()->>'email')='andreytrindadedossantos@gmail.com',false)
$$;

do $$
declare t text;
begin
 foreach t in array array['sabado_students','sabado_users','sabado_mothers','sabado_schedules','sabado_attendance','sabado_events','sabado_meetings','sabado_notifications','sabado_settings']
 loop
   execute format('drop policy if exists sabado_read on public.%I',t);
   execute format('create policy sabado_read on public.%I for select to anon,authenticated using (true)',t);
   execute format('drop policy if exists sabado_admin on public.%I',t);
   execute format('create policy sabado_admin on public.%I for all to authenticated using (public.sabado_is_admin()) with check (public.sabado_is_admin())',t);
 end loop;
end $$;

drop policy if exists sabado_rsp_read on public.sabado_meeting_responses;
create policy sabado_rsp_read on public.sabado_meeting_responses for select to anon,authenticated using(true);
drop policy if exists sabado_rsp_insert on public.sabado_meeting_responses;
create policy sabado_rsp_insert on public.sabado_meeting_responses for insert to anon,authenticated with check(true);
drop policy if exists sabado_rsp_update on public.sabado_meeting_responses;
create policy sabado_rsp_update on public.sabado_meeting_responses for update to anon,authenticated using(true) with check(true);


-- Operações compartilhadas, equivalentes à versão anterior do aplicativo:
do $$
declare t text;
begin
  foreach t in array array['sabado_students','sabado_mothers','sabado_schedules','sabado_attendance','sabado_events','sabado_meetings']
  loop
    execute format('drop policy if exists sabado_public_write on public.%I', t);
    execute format('create policy sabado_public_write on public.%I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

drop policy if exists sabado_public_notifications_insert on public.sabado_notifications;
create policy sabado_public_notifications_insert on public.sabado_notifications
for insert to anon, authenticated with check (true);


-- Restaurar cadastro/listagem de professores e nomes para RSVP:
insert into public.sabado_users (name,email,phone,role,group_name,status)
select distinct t.name, '', '', 'Professor', 'Geral', 'Ativo'
from (
  select adolescent_teacher as name from public.sabado_schedules
  union
  select younger_teacher as name from public.sabado_schedules
) t
where coalesce(trim(t.name),'') <> ''
  and upper(trim(t.name)) <> 'TODOS'
  and not exists (select 1 from public.sabado_users u where lower(trim(u.name))=lower(trim(t.name)));

drop policy if exists sabado_professors_public_insert on public.sabado_users;
create policy sabado_professors_public_insert on public.sabado_users
for insert to anon, authenticated
with check(role='Professor' and lower(coalesce(email,''))<>'andreytrindadedossantos@gmail.com');

drop policy if exists sabado_professors_public_update on public.sabado_users;
create policy sabado_professors_public_update on public.sabado_users
for update to anon, authenticated
using(role='Professor')
with check(role='Professor' and lower(coalesce(email,''))<>'andreytrindadedossantos@gmail.com');

drop policy if exists sabado_professors_public_delete on public.sabado_users;
create policy sabado_professors_public_delete on public.sabado_users
for delete to anon, authenticated
using(role='Professor' and lower(coalesce(email,''))<>'andreytrindadedossantos@gmail.com');


-- V6: notificações automáticas e lembretes
create extension if not exists pg_cron with schema pg_catalog;

create unique index if not exists sabado_notifications_notice_key_uidx
on public.sabado_notifications(notice_key)
where notice_key <> '';

create or replace function public.sabado_notice_once(
  p_title text, p_body text, p_kind text, p_key text, p_meeting_id uuid default null
) returns void language plpgsql security definer set search_path=public as $$
begin
  insert into public.sabado_notifications(title,body,kind,notice_key,meeting_id,date)
  values(p_title,p_body,p_kind,p_key,p_meeting_id,now())
  on conflict (notice_key) where notice_key <> '' do nothing;
end $$;

create or replace function public.sabado_generate_reminders()
returns void language plpgsql security definer set search_path=public as $$
declare r record;
begin
  for r in select * from public.sabado_events where type='Festa' loop
    if r.date=current_date+7 then perform public.sabado_notice_once('🎉 Festa em 7 dias: '||r.title,to_char(r.date,'DD/MM/YYYY'),'celebration','celebration-7d-'||r.id,null); end if;
    if r.date=current_date+1 then perform public.sabado_notice_once('🎉 Festa amanhã: '||r.title,to_char(r.date,'DD/MM/YYYY'),'celebration','celebration-1d-'||r.id,null); end if;
    if r.date=current_date then perform public.sabado_notice_once('🎉 Festa hoje: '||r.title,to_char(r.date,'DD/MM/YYYY'),'celebration','celebration-today-'||r.id,null); end if;
  end loop;
  for r in select * from public.sabado_meetings loop
    if r.date=current_date+1 then perform public.sabado_notice_once('📅 Reunião amanhã: '||r.title,to_char(r.date,'DD/MM/YYYY'),'meeting','meeting-1d-'||r.id,r.id); end if;
    if r.date=current_date then perform public.sabado_notice_once('📅 Reunião hoje: '||r.title,to_char(r.date,'DD/MM/YYYY'),'meeting','meeting-today-'||r.id,r.id); end if;
  end loop;
end $$;


-- V38: Registro de Auditoria
create schema if not exists private;

create table if not exists public.sabado_audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null check (action in ('insert','update','delete')),
  entity_type text not null,
  entity_name text not null default '',
  table_name text not null,
  record_id text not null default '',
  actor_user_id uuid,
  actor_name text not null default 'Usuário sem login',
  actor_email text not null default '',
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists sabado_audit_logs_created_at_idx
  on public.sabado_audit_logs(created_at desc);
create index if not exists sabado_audit_logs_entity_idx
  on public.sabado_audit_logs(entity_type, created_at desc);
create index if not exists sabado_audit_logs_actor_idx
  on public.sabado_audit_logs(actor_email, created_at desc);

alter table public.sabado_audit_logs enable row level security;

drop policy if exists sabado_audit_admin_read on public.sabado_audit_logs;
create policy sabado_audit_admin_read
on public.sabado_audit_logs
for select
to authenticated
using (public.sabado_is_admin());

revoke all on public.sabado_audit_logs from anon;
revoke insert, update, delete on public.sabado_audit_logs from authenticated;
grant select on public.sabado_audit_logs to authenticated;

create or replace function private.sabado_audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_row jsonb;
  v_before jsonb;
  v_after jsonb;
  v_action text;
  v_entity_type text;
  v_entity_name text;
  v_record_id text;
  v_email text;
  v_actor_name text;
begin
  if tg_op = 'INSERT' then
    v_action := 'insert';
    v_row := to_jsonb(new);
    v_after := to_jsonb(new);
  elsif tg_op = 'UPDATE' then
    v_action := 'update';
    v_row := to_jsonb(new);
    v_before := to_jsonb(old);
    v_after := to_jsonb(new);
  else
    v_action := 'delete';
    v_row := to_jsonb(old);
    v_before := to_jsonb(old);
  end if;

  v_record_id := coalesce(v_row->>'id','');
  v_email := nullif(auth.jwt()->>'email','');

  select u.name
    into v_actor_name
  from public.sabado_users u
  where v_email is not null
    and lower(coalesce(u.email,'')) = lower(v_email)
  limit 1;

  if lower(coalesce(v_email,'')) = 'andreytrindadedossantos@gmail.com' then
    v_actor_name := coalesce(nullif(v_actor_name,''),'Administrador');
  end if;

  v_actor_name := coalesce(nullif(v_actor_name,''), v_email, 'Usuário sem login');

  case tg_table_name
    when 'sabado_students' then
      v_entity_type := 'Aluno';
      v_entity_name := coalesce(v_row->>'name','Aluno');
    when 'sabado_schedules' then
      v_entity_type := 'Escala';
      v_entity_name := concat_ws(' · ', nullif(v_row->>'date',''), nullif(v_row->>'topic',''));
    when 'sabado_attendance' then
      v_entity_type := 'Chamada';
      v_entity_name := concat_ws(' · ', nullif(v_row->>'date',''), nullif(v_row->>'teacher',''));
    when 'sabado_meetings' then
      v_entity_type := 'Reunião';
      v_entity_name := coalesce(v_row->>'title','Reunião');
    when 'sabado_events' then
      v_entity_type := 'Evento';
      v_entity_name := coalesce(v_row->>'title','Evento');
    else
      return coalesce(new,old);
  end case;

  insert into public.sabado_audit_logs(
    action, entity_type, entity_name, table_name, record_id,
    actor_user_id, actor_name, actor_email, before_data, after_data
  ) values (
    v_action, v_entity_type, coalesce(v_entity_name,''), tg_table_name, v_record_id,
    auth.uid(), v_actor_name, coalesce(v_email,''), v_before, v_after
  );

  return coalesce(new,old);
end;
$$;

revoke all on function private.sabado_audit_trigger() from public, anon, authenticated;

drop trigger if exists sabado_audit_students_trg on public.sabado_students;
create trigger sabado_audit_students_trg
after insert or update or delete on public.sabado_students
for each row execute function private.sabado_audit_trigger();

drop trigger if exists sabado_audit_schedules_trg on public.sabado_schedules;
create trigger sabado_audit_schedules_trg
after insert or update or delete on public.sabado_schedules
for each row execute function private.sabado_audit_trigger();

drop trigger if exists sabado_audit_attendance_trg on public.sabado_attendance;
create trigger sabado_audit_attendance_trg
after insert or update or delete on public.sabado_attendance
for each row execute function private.sabado_audit_trigger();

drop trigger if exists sabado_audit_meetings_trg on public.sabado_meetings;
create trigger sabado_audit_meetings_trg
after insert or update or delete on public.sabado_meetings
for each row execute function private.sabado_audit_trigger();

drop trigger if exists sabado_audit_events_trg on public.sabado_events;
create trigger sabado_audit_events_trg
after insert or update or delete on public.sabado_events
for each row execute function private.sabado_audit_trigger();


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


-- V49 — Auditoria também para Professores/Usuários e Mães auxiliares
create or replace function private.sabado_audit_trigger()
returns trigger
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
declare
  v_row jsonb;
  v_before jsonb;
  v_after jsonb;
  v_action text;
  v_entity_type text;
  v_entity_name text;
  v_record_id text;
  v_email text;
  v_actor_name text;
  v_actor_login text;
  v_custom_profile uuid;
begin
  if tg_op='INSERT' then
    v_action:='insert';v_row:=to_jsonb(new);v_after:=to_jsonb(new);
  elsif tg_op='UPDATE' then
    v_action:='update';v_row:=to_jsonb(new);v_before:=to_jsonb(old);v_after:=to_jsonb(new);
  else
    v_action:='delete';v_row:=to_jsonb(old);v_before:=to_jsonb(old);
  end if;

  v_record_id:=coalesce(v_row->>'id','');
  v_email:=nullif(auth.jwt()->>'email','');
  v_custom_profile:=public.sabado_custom_profile_id();

  select u.name,u.login_name
    into v_actor_name,v_actor_login
  from public.sabado_users u
  where (v_custom_profile is not null and u.id=v_custom_profile)
     or (auth.uid() is not null and u.auth_user_id=auth.uid())
     or (v_email is not null and lower(coalesce(u.email,''))=lower(v_email))
  order by
    case when v_custom_profile is not null and u.id=v_custom_profile then 0
         when auth.uid() is not null and u.auth_user_id=auth.uid() then 1 else 2 end
  limit 1;

  if lower(coalesce(v_email,''))='andreytrindadedossantos@gmail.com' then
    v_actor_name:=coalesce(nullif(v_actor_name,''),'Administrador');
    v_actor_login:='Administrador';
  end if;

  v_actor_name:=coalesce(nullif(v_actor_name,''),v_actor_login,v_email,'Usuário sem login');

  case tg_table_name
    when 'sabado_students' then
      v_entity_type:='Aluno';
      v_entity_name:=coalesce(v_row->>'name','Aluno');
    when 'sabado_users' then
      v_entity_type:=case when coalesce(v_row->>'role','Professor')='Professor' then 'Professor' else 'Usuário' end;
      v_entity_name:=coalesce(v_row->>'name',v_row->>'login_name','Usuário');
    when 'sabado_mothers' then
      v_entity_type:='Mãe auxiliar';
      v_entity_name:=coalesce(v_row->>'name','Mãe auxiliar');
    when 'sabado_schedules' then
      v_entity_type:='Escala';
      v_entity_name:=concat_ws(' · ',nullif(v_row->>'date',''),nullif(v_row->>'topic',''));
    when 'sabado_attendance' then
      v_entity_type:='Chamada';
      v_entity_name:=concat_ws(' · ',nullif(v_row->>'date',''),nullif(v_row->>'teacher',''));
    when 'sabado_meetings' then
      v_entity_type:='Reunião';
      v_entity_name:=coalesce(v_row->>'title','Reunião');
    when 'sabado_events' then
      v_entity_type:='Evento';
      v_entity_name:=coalesce(v_row->>'title','Evento');
    else
      return coalesce(new,old);
  end case;

  insert into public.sabado_audit_logs(
    action,entity_type,entity_name,table_name,record_id,
    actor_user_id,actor_name,actor_email,before_data,after_data
  ) values (
    v_action,v_entity_type,coalesce(v_entity_name,''),tg_table_name,v_record_id,
    coalesce(auth.uid(),v_custom_profile),v_actor_name,coalesce(v_actor_login,v_email,''),v_before,v_after
  );

  return coalesce(new,old);
end;
$$;

drop trigger if exists sabado_audit_users_trg on public.sabado_users;
create trigger sabado_audit_users_trg
after insert or update or delete on public.sabado_users
for each row execute function private.sabado_audit_trigger();

drop trigger if exists sabado_audit_mothers_trg on public.sabado_mothers;
create trigger sabado_audit_mothers_trg
after insert or update or delete on public.sabado_mothers
for each row execute function private.sabado_audit_trigger();


-- V50 — primeiro acesso com senha numérica de 6 dígitos e retorno ao login
create or replace function public.sabado_username_register(p_username text,p_password text)
returns jsonb
language plpgsql
security definer
set search_path=public,private,extensions,pg_catalog
as $$
declare
  v_user public.sabado_users;
begin
  if coalesce(p_password,'') !~ '^[0-9]{6}$' then
    raise exception 'A senha deve conter exatamente 6 dígitos.';
  end if;

  select * into v_user from private.sabado_find_profile(p_username);
  if v_user.id is null then
    raise exception 'Usuário não cadastrado. Procure o administrador.';
  end if;
  if v_user.status='Inativo' then
    raise exception 'Seu acesso está inativo. Procure o administrador.';
  end if;
  if exists(select 1 from private.sabado_user_credentials c where c.profile_id=v_user.id) then
    raise exception 'A senha deste usuário já foi criada. Use Entrar.';
  end if;

  insert into private.sabado_user_credentials(profile_id,password_hash)
  values(v_user.id,extensions.crypt(p_password,extensions.gen_salt('bf')));

  delete from private.sabado_user_sessions where profile_id=v_user.id;

  update public.sabado_users
     set password_created=true,updated_at=now()
   where id=v_user.id;

  return jsonb_build_object(
    'created',true,
    'user',v_user.login_name
  );
end;
$$;

grant execute on function public.sabado_username_register(text,text) to anon,authenticated;


-- V51 — senha livre com mínimo de 6 caracteres
-- Letras, números e caracteres especiais são permitidos, mas nenhuma categoria é obrigatória.
create or replace function public.sabado_username_register(p_username text,p_password text)
returns jsonb
language plpgsql
security definer
set search_path=public,private,extensions,pg_catalog
as $$
declare
  v_user public.sabado_users;
begin
  if length(coalesce(p_password,''))<6 then
    raise exception 'A senha deve conter pelo menos 6 caracteres.';
  end if;

  select * into v_user from private.sabado_find_profile(p_username);
  if v_user.id is null then
    raise exception 'Usuário não cadastrado. Procure o administrador.';
  end if;
  if v_user.status='Inativo' then
    raise exception 'Seu acesso está inativo. Procure o administrador.';
  end if;
  if exists(select 1 from private.sabado_user_credentials c where c.profile_id=v_user.id) then
    raise exception 'A senha deste usuário já foi criada. Use Entrar.';
  end if;

  insert into private.sabado_user_credentials(profile_id,password_hash)
  values(v_user.id,extensions.crypt(p_password,extensions.gen_salt('bf')));

  delete from private.sabado_user_sessions where profile_id=v_user.id;

  update public.sabado_users
     set password_created=true,updated_at=now()
   where id=v_user.id;

  return jsonb_build_object('created',true,'user',v_user.login_name);
end;
$$;

grant execute on function public.sabado_username_register(text,text) to anon,authenticated;


-- V58: verificação obrigatória em duas etapas TOTP aplicada pela migração `two_factor_auth_totp_v58` no Supabase.
