-- V77 — congela presença, faltas, frequência e medalha por aluno no fechamento anual
create or replace function public.sabado_close_academic_year(p_year integer)
returns jsonb
language plpgsql
security definer
set search_path='public','private','pg_catalog'
as $$
declare
  v_profile uuid;
  v_snapshot jsonb;
  v_existing jsonb;
begin
  if not public.sabado_is_admin() then
    raise exception 'Somente o Administrador pode encerrar o ano letivo.';
  end if;
  if p_year < 2020 or p_year > 2100 then
    return jsonb_build_object('ok',false,'error','Ano inválido.');
  end if;

  select snapshot into v_existing
  from public.sabado_academic_years
  where year=p_year and status='closed';

  if v_existing is not null then
    return jsonb_build_object('ok',true,'already_closed',true,'snapshot',v_existing);
  end if;

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
    'student_presence',coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'studentId',s.id,
          'name',s.name,
          'presences',coalesce(x.presences,0),
          'absences',coalesce(x.absences,0),
          'frequency',case when coalesce(x.presences,0)+coalesce(x.absences,0)>0
            then round((coalesce(x.presences,0)::numeric/(coalesce(x.presences,0)+coalesce(x.absences,0))::numeric)*100)::int
            else 0 end,
          'medal',case
            when coalesce(x.presences,0)>=20 then '🥇'
            when coalesce(x.presences,0)>=15 then '🥉'
            when coalesce(x.presences,0)>=10 then '🥈'
            else '—' end
        )
        order by coalesce(x.presences,0) desc,s.name
      )
      from public.sabado_students s
      left join lateral (
        select
          count(*) filter(where coalesce((e->>'present')::boolean,false)=true) presences,
          count(*) filter(where coalesce((e->>'present')::boolean,false)=false) absences
        from public.sabado_attendance a
        cross join lateral jsonb_array_elements(a.entries) e
        where a.deleted_at is null
          and extract(year from a.date)::int=p_year
          and e->>'studentId'=s.id::text
      ) x on true
      where s.deleted_at is null
    ),'[]'::jsonb),
    'closed_generated_at',now()
  ) into v_snapshot;

  insert into public.sabado_academic_years(year,status,closed_at,closed_by,snapshot,updated_at)
  values(p_year,'closed',now(),v_profile,v_snapshot,now())
  on conflict(year) do update
    set status='closed',closed_at=excluded.closed_at,closed_by=excluded.closed_by,snapshot=excluded.snapshot,updated_at=now();

  return jsonb_build_object('ok',true,'already_closed',false,'snapshot',v_snapshot);
end;
$$;

grant execute on function public.sabado_close_academic_year(integer) to anon,authenticated;
