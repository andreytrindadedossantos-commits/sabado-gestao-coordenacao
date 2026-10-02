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
