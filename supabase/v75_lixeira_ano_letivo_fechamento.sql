-- V75 — Lixeira, Ano letivo e Fechamento anual
-- Esta migração já foi aplicada no banco conectado durante a criação da V75.

alter table public.sabado_students add column if not exists deleted_at timestamptz;
alter table public.sabado_mothers add column if not exists deleted_at timestamptz;
alter table public.sabado_schedules add column if not exists deleted_at timestamptz;
alter table public.sabado_meetings add column if not exists deleted_at timestamptz;
alter table public.sabado_attendance add column if not exists deleted_at timestamptz;
alter table public.sabado_events add column if not exists deleted_at timestamptz;

create index if not exists sabado_students_deleted_at_idx on public.sabado_students(deleted_at);
create index if not exists sabado_mothers_deleted_at_idx on public.sabado_mothers(deleted_at);
create index if not exists sabado_schedules_deleted_at_idx on public.sabado_schedules(deleted_at);
create index if not exists sabado_meetings_deleted_at_idx on public.sabado_meetings(deleted_at);
create index if not exists sabado_attendance_deleted_at_idx on public.sabado_attendance(deleted_at);
create index if not exists sabado_events_deleted_at_idx on public.sabado_events(deleted_at);

create table if not exists public.sabado_academic_years(
  year integer primary key check(year between 2020 and 2100),
  status text not null default 'open' check(status in ('open','closed')),
  closed_at timestamptz,
  closed_by uuid references public.sabado_users(id) on delete set null,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sabado_academic_years enable row level security;

drop policy if exists sabado_academic_years_read on public.sabado_academic_years;
drop policy if exists sabado_academic_years_admin_insert on public.sabado_academic_years;
drop policy if exists sabado_academic_years_admin_update on public.sabado_academic_years;
drop policy if exists sabado_academic_years_admin_delete on public.sabado_academic_years;

create policy sabado_academic_years_read on public.sabado_academic_years
for select to anon,authenticated using (public.sabado_custom_profile_id() is not null or auth.uid() is not null);
create policy sabado_academic_years_admin_insert on public.sabado_academic_years
for insert to anon,authenticated with check (public.sabado_is_admin());
create policy sabado_academic_years_admin_update on public.sabado_academic_years
for update to anon,authenticated using (public.sabado_is_admin()) with check (public.sabado_is_admin());
create policy sabado_academic_years_admin_delete on public.sabado_academic_years
for delete to anon,authenticated using (public.sabado_is_admin());

grant select,insert,update,delete on public.sabado_academic_years to anon,authenticated;

create or replace function public.sabado_year_is_closed(p_year integer)
returns boolean language sql stable security definer
set search_path='public','private','pg_catalog'
as $$ select exists(select 1 from public.sabado_academic_years where year=p_year and status='closed'); $$;

create or replace function private.sabado_guard_closed_year()
returns trigger language plpgsql security definer
set search_path='public','private','pg_catalog'
as $$
declare v_date date; v_year integer;
begin
  if tg_op='DELETE' then return old; end if;
  v_date:=new.date;
  if v_date is null then return new; end if;
  v_year:=extract(year from v_date)::integer;
  if public.sabado_year_is_closed(v_year) then
    raise exception 'O ano letivo % está encerrado. Os registros desse ano estão congelados.',v_year;
  end if;
  return new;
end; $$;

do $$
declare t text;
begin
  foreach t in array array['sabado_attendance','sabado_schedules','sabado_meetings','sabado_events'] loop
    execute format('drop trigger if exists sabado_closed_year_guard_trg on public.%I',t);
    execute format('create trigger sabado_closed_year_guard_trg before insert or update on public.%I for each row execute function private.sabado_guard_closed_year()',t);
  end loop;
end $$;

create or replace function public.sabado_close_academic_year(p_year integer)
returns jsonb language plpgsql security definer
set search_path='public','private','pg_catalog'
as $$
declare v_profile uuid; v_snapshot jsonb; v_existing jsonb;
begin
  if not public.sabado_is_admin() then raise exception 'Somente o Administrador pode encerrar o ano letivo.'; end if;
  select snapshot into v_existing from public.sabado_academic_years where year=p_year and status='closed';
  if v_existing is not null then return jsonb_build_object('ok',true,'already_closed',true,'snapshot',v_existing); end if;
  v_profile:=public.sabado_custom_profile_id();
  select jsonb_build_object(
    'year',p_year,
    'students_total',(select count(*) from public.sabado_students where deleted_at is null),
    'attendance_classes',(select count(*) from public.sabado_attendance where deleted_at is null and extract(year from date)::int=p_year),
    'presences',coalesce((select sum((select count(*) from jsonb_array_elements(a.entries) e where coalesce((e->>'present')::boolean,false)=true)) from public.sabado_attendance a where a.deleted_at is null and extract(year from a.date)::int=p_year),0),
    'absences',coalesce((select sum((select count(*) from jsonb_array_elements(a.entries) e where coalesce((e->>'present')::boolean,false)=false)) from public.sabado_attendance a where a.deleted_at is null and extract(year from a.date)::int=p_year),0),
    'schedules',(select count(*) from public.sabado_schedules where deleted_at is null and extract(year from date)::int=p_year),
    'meetings',(select count(*) from public.sabado_meetings where deleted_at is null and extract(year from date)::int=p_year),
    'events',(select count(*) from public.sabado_events where deleted_at is null and extract(year from date)::int=p_year),
    'student_presence',coalesce((select jsonb_agg(jsonb_build_object('studentId',x.student_id,'name',x.student_name,'presences',x.presences) order by x.student_name) from (select e->>'studentId' student_id,max(e->>'name') student_name,count(*) filter(where coalesce((e->>'present')::boolean,false)=true) presences from public.sabado_attendance a cross join lateral jsonb_array_elements(a.entries) e where a.deleted_at is null and extract(year from a.date)::int=p_year group by e->>'studentId') x),'[]'::jsonb),
    'closed_generated_at',now()
  ) into v_snapshot;
  insert into public.sabado_academic_years(year,status,closed_at,closed_by,snapshot,updated_at)
  values(p_year,'closed',now(),v_profile,v_snapshot,now())
  on conflict(year) do update set status='closed',closed_at=excluded.closed_at,closed_by=excluded.closed_by,snapshot=excluded.snapshot,updated_at=now();
  return jsonb_build_object('ok',true,'already_closed',false,'snapshot',v_snapshot);
end; $$;

create or replace function public.sabado_purge_trash()
returns jsonb language plpgsql security definer
set search_path='public','private','pg_catalog'
as $$
declare c_students integer:=0;c_mothers integer:=0;c_schedules integer:=0;c_meetings integer:=0;c_attendance integer:=0;c_events integer:=0;
begin
  if not public.sabado_is_admin() then raise exception 'Somente o Administrador pode limpar a lixeira.'; end if;
  delete from public.sabado_students where deleted_at is not null and deleted_at<now()-interval '30 days';get diagnostics c_students=row_count;
  delete from public.sabado_mothers where deleted_at is not null and deleted_at<now()-interval '30 days';get diagnostics c_mothers=row_count;
  delete from public.sabado_schedules where deleted_at is not null and deleted_at<now()-interval '30 days';get diagnostics c_schedules=row_count;
  delete from public.sabado_attendance where deleted_at is not null and deleted_at<now()-interval '30 days';get diagnostics c_attendance=row_count;
  delete from public.sabado_events where deleted_at is not null and deleted_at<now()-interval '30 days';get diagnostics c_events=row_count;
  update public.sabado_notifications set meeting_id=null where meeting_id in(select id from public.sabado_meetings where deleted_at is not null and deleted_at<now()-interval '30 days');
  delete from public.sabado_meeting_responses where meeting_id in(select id from public.sabado_meetings where deleted_at is not null and deleted_at<now()-interval '30 days');
  delete from public.sabado_meetings where deleted_at is not null and deleted_at<now()-interval '30 days';get diagnostics c_meetings=row_count;
  return jsonb_build_object('ok',true,'removed',jsonb_build_object('students',c_students,'mothers',c_mothers,'schedules',c_schedules,'meetings',c_meetings,'attendance',c_attendance,'events',c_events));
end; $$;

grant execute on function public.sabado_close_academic_year(integer) to anon,authenticated;
grant execute on function public.sabado_purge_trash() to anon,authenticated;
grant execute on function public.sabado_year_is_closed(integer) to anon,authenticated;
