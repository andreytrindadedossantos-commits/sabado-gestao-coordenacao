create table if not exists public.sabado_schedule_substitutions(
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.sabado_schedules(id) on delete cascade,
  assignment text not null check (assignment in ('adolescentes','menores')),
  original_user_id uuid not null references public.sabado_users(id) on delete cascade,
  original_teacher_name text not null,
  status text not null default 'open' check (status in ('open','filled','cancelled')),
  claimed_by uuid references public.sabado_users(id) on delete set null,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  updated_at timestamptz not null default now()
);

create unique index if not exists sabado_schedule_substitutions_one_open_idx
on public.sabado_schedule_substitutions(schedule_id,assignment) where status='open';
create index if not exists sabado_schedule_substitutions_status_idx
on public.sabado_schedule_substitutions(status,created_at desc);

alter table public.sabado_schedule_substitutions enable row level security;
drop policy if exists sabado_schedule_substitutions_select on public.sabado_schedule_substitutions;
create policy sabado_schedule_substitutions_select
on public.sabado_schedule_substitutions for select to anon,authenticated
using (
  public.sabado_is_admin()
  or original_user_id=public.sabado_custom_profile_id()
  or claimed_by=public.sabado_custom_profile_id()
);
grant select on public.sabado_schedule_substitutions to anon,authenticated;

create or replace function public.sabado_list_my_substitution_opportunities()
returns table(request_id uuid,schedule_id uuid,date date,"time" time,topic text,assignment text,group_label text,original_teacher text)
language plpgsql security definer set search_path='public','private','pg_catalog'
as $function$
declare v_user uuid; v_name text; v_login text; v_group text;
begin
  v_user:=public.sabado_custom_profile_id();
  if v_user is null then return; end if;
  select u.name,u.login_name,coalesce(nullif(u.group_name,''),'Geral')
    into v_name,v_login,v_group
  from public.sabado_users u
  where u.id=v_user and u.deleted_at is null and u.status='Ativo';
  if v_name is null then return; end if;

  return query
  select sr.id,s.id,s.date,s.time,s.topic,sr.assignment,
         case sr.assignment when 'adolescentes' then 'Adolescentes' else 'Menores' end,
         sr.original_teacher_name
  from public.sabado_schedule_substitutions sr
  join public.sabado_schedules s on s.id=sr.schedule_id
  where sr.status='open' and s.deleted_at is null and s.date>=current_date
    and sr.original_user_id<>v_user
    and ((sr.assignment='adolescentes' and private.sabado_normalize_login(s.adolescent_teacher)=private.sabado_normalize_login(sr.original_teacher_name))
      or (sr.assignment='menores' and private.sabado_normalize_login(s.younger_teacher)=private.sabado_normalize_login(sr.original_teacher_name)))
    and (v_group='Geral' or (sr.assignment='adolescentes' and v_group='Adolescentes') or (sr.assignment='menores' and v_group='Menores'))
    and not exists(select 1 from public.sabado_teacher_unavailability tu where tu.user_id=v_user and tu.date=s.date)
    and private.sabado_normalize_login(coalesce(s.adolescent_teacher,'')) not in (private.sabado_normalize_login(coalesce(v_name,'')),private.sabado_normalize_login(coalesce(v_login,'')))
    and private.sabado_normalize_login(coalesce(s.younger_teacher,'')) not in (private.sabado_normalize_login(coalesce(v_name,'')),private.sabado_normalize_login(coalesce(v_login,'')))
    and not exists(select 1 from public.sabado_schedule_confirmations c where c.schedule_id=s.id and c.user_id=v_user and c.status='declined')
  order by s.date,s.time nulls last;
end;
$function$;
revoke all on function public.sabado_list_my_substitution_opportunities() from public;
grant execute on function public.sabado_list_my_substitution_opportunities() to anon,authenticated;

create or replace function public.sabado_claim_schedule_substitution(p_request_id uuid)
returns jsonb
language plpgsql security definer set search_path='public','private','pg_catalog'
as $function$
declare
  v_user uuid; v_name text; v_login text; v_group text;
  v_req public.sabado_schedule_substitutions;
  v_schedule public.sabado_schedules;
  v_owner uuid; v_current_teacher text;
begin
  v_user:=public.sabado_custom_profile_id();
  if v_user is null then return jsonb_build_object('ok',false,'error','Sessão inválida.'); end if;

  select u.name,u.login_name,coalesce(nullif(u.group_name,''),'Geral')
    into v_name,v_login,v_group
  from public.sabado_users u
  where u.id=v_user and u.deleted_at is null and u.status='Ativo';
  if v_name is null then return jsonb_build_object('ok',false,'error','Professor não encontrado ou inativo.'); end if;

  select * into v_req from public.sabado_schedule_substitutions where id=p_request_id for update;
  if v_req.id is null or v_req.status<>'open' then
    return jsonb_build_object('ok',false,'error','Esta vaga já foi preenchida ou não está mais disponível.');
  end if;

  select * into v_schedule from public.sabado_schedules where id=v_req.schedule_id and deleted_at is null for update;
  if v_schedule.id is null or v_schedule.date<current_date then
    return jsonb_build_object('ok',false,'error','Esta escala não está mais disponível.');
  end if;
  if v_req.original_user_id=v_user then
    return jsonb_build_object('ok',false,'error','Você não pode assumir a própria vaga de substituição.');
  end if;
  if not (v_group='Geral' or (v_req.assignment='adolescentes' and v_group='Adolescentes') or (v_req.assignment='menores' and v_group='Menores')) then
    return jsonb_build_object('ok',false,'error','Sua turma cadastrada não permite assumir esta vaga.');
  end if;
  if exists(select 1 from public.sabado_teacher_unavailability tu where tu.user_id=v_user and tu.date=v_schedule.date) then
    return jsonb_build_object('ok',false,'error','Você marcou indisponibilidade para este sábado.');
  end if;
  if private.sabado_normalize_login(coalesce(v_schedule.adolescent_teacher,'')) in (private.sabado_normalize_login(coalesce(v_name,'')),private.sabado_normalize_login(coalesce(v_login,'')))
     or private.sabado_normalize_login(coalesce(v_schedule.younger_teacher,'')) in (private.sabado_normalize_login(coalesce(v_name,'')),private.sabado_normalize_login(coalesce(v_login,''))) then
    return jsonb_build_object('ok',false,'error','Você já está escalado(a) neste sábado.');
  end if;

  v_current_teacher:=case when v_req.assignment='adolescentes' then v_schedule.adolescent_teacher else v_schedule.younger_teacher end;
  if private.sabado_normalize_login(coalesce(v_current_teacher,''))<>private.sabado_normalize_login(coalesce(v_req.original_teacher_name,'')) then
    update public.sabado_schedule_substitutions set status='cancelled',updated_at=now() where id=v_req.id;
    return jsonb_build_object('ok',false,'error','A escala já foi alterada e esta vaga não está mais disponível.');
  end if;

  update public.sabado_schedule_substitutions
     set status='filled',claimed_by=v_user,claimed_at=now(),updated_at=now()
   where id=v_req.id and status='open';
  if not found then return jsonb_build_object('ok',false,'error','Outro professor acabou de assumir esta vaga.'); end if;

  if v_req.assignment='adolescentes' then
    update public.sabado_schedules
       set adolescent_teacher=v_name,replacement_reason='Substituição voluntária: '||v_req.original_teacher_name||' → '||v_name,updated_at=now()
     where id=v_schedule.id;
  else
    update public.sabado_schedules
       set younger_teacher=v_name,replacement_reason='Substituição voluntária: '||v_req.original_teacher_name||' → '||v_name,updated_at=now()
     where id=v_schedule.id;
  end if;

  update public.sabado_schedule_confirmations
     set status='confirmed',responded_at=now(),updated_at=now()
   where schedule_id=v_schedule.id and user_id=v_user and assignment=v_req.assignment;

  select id into v_owner from public.sabado_users
  where deleted_at is null and private.sabado_normalize_login(login_name)='andrey' limit 1;

  insert into public.sabado_notifications(title,body,kind,notice_key,recipient_user_id,schedule_id)
  values('✅ Substituição preenchida',v_name||' assumiu a escala de '||case v_req.assignment when 'adolescentes' then 'Adolescentes' else 'Menores' end||' do dia '||to_char(v_schedule.date,'DD/MM/YYYY')||' no lugar de '||v_req.original_teacher_name||'.','schedule-substitution-filled','schedule-substitution-filled-admin-'||v_req.id,v_owner,v_schedule.id)
  on conflict(notice_key) where notice_key<>'' do nothing;

  insert into public.sabado_notifications(title,body,kind,notice_key,recipient_user_id,schedule_id)
  values('✅ Sua substituição foi encontrada',v_name||' assumiu sua escala de '||case v_req.assignment when 'adolescentes' then 'Adolescentes' else 'Menores' end||' do dia '||to_char(v_schedule.date,'DD/MM/YYYY')||'.','schedule-substitution-filled','schedule-substitution-filled-original-'||v_req.id,v_req.original_user_id,v_schedule.id)
  on conflict(notice_key) where notice_key<>'' do nothing;

  return jsonb_build_object('ok',true,'schedule_id',v_schedule.id,'assignment',v_req.assignment,'teacher',v_name);
end;
$function$;
revoke all on function public.sabado_claim_schedule_substitution(uuid) from public;
grant execute on function public.sabado_claim_schedule_substitution(uuid) to anon,authenticated;

create or replace function public.sabado_respond_schedule(p_schedule_id uuid,p_status text)
returns jsonb
language plpgsql security definer set search_path='public','private','pg_catalog'
as $function$
declare
  v_user uuid; v_name text; v_schedule public.sabado_schedules; v_updated integer:=0;
  v_owner uuid; v_status text; v_assignments text; v_assignment text; v_request_id uuid;
  v_candidate record; v_candidate_count integer:=0;
begin
  v_user:=public.sabado_custom_profile_id();
  if v_user is null then return jsonb_build_object('ok',false,'error','Sessão inválida.'); end if;
  v_status:=lower(coalesce(p_status,''));
  if v_status not in ('confirmed','declined') then return jsonb_build_object('ok',false,'error','Resposta inválida.'); end if;

  select * into v_schedule from public.sabado_schedules where id=p_schedule_id and deleted_at is null;
  if v_schedule.id is null then return jsonb_build_object('ok',false,'error','Escala não encontrada.'); end if;

  update public.sabado_schedule_confirmations set status=v_status,responded_at=now(),updated_at=now()
   where schedule_id=p_schedule_id and user_id=v_user;
  get diagnostics v_updated=row_count;
  if v_updated=0 then return jsonb_build_object('ok',false,'error','Esta escala não pertence ao seu usuário.'); end if;

  select name into v_name from public.sabado_users where id=v_user;
  select string_agg(case assignment when 'adolescentes' then 'Adolescentes' else 'Menores' end,' e ' order by assignment)
    into v_assignments from public.sabado_schedule_confirmations where schedule_id=p_schedule_id and user_id=v_user;

  if v_status='declined' then
    select id into v_owner from public.sabado_users where deleted_at is null and private.sabado_normalize_login(login_name)='andrey' limit 1;
    insert into public.sabado_notifications(title,body,kind,notice_key,recipient_user_id,schedule_id)
    values('⚠️ Professor não poderá participar',coalesce(v_name,'Professor')||' informou que não poderá participar da escala de '||to_char(v_schedule.date,'DD/MM/YYYY')||' ('||coalesce(v_assignments,'turma')||'). Tema: '||coalesce(nullif(v_schedule.topic,''),'A definir')||'. O sistema abriu a vaga para substituição.','schedule-declined','schedule-declined-'||p_schedule_id||'-'||v_user||'-'||extract(epoch from now())::bigint,v_owner,p_schedule_id);

    for v_assignment in select c.assignment from public.sabado_schedule_confirmations c where c.schedule_id=p_schedule_id and c.user_id=v_user and c.status='declined'
    loop
      insert into public.sabado_schedule_substitutions(schedule_id,assignment,original_user_id,original_teacher_name,status,updated_at)
      values(p_schedule_id,v_assignment,v_user,coalesce(v_name,'Professor'),'open',now())
      on conflict(schedule_id,assignment) where status='open'
      do update set original_user_id=excluded.original_user_id,original_teacher_name=excluded.original_teacher_name,updated_at=now()
      returning id into v_request_id;

      for v_candidate in
        select u.id,u.name from public.sabado_users u
        where u.deleted_at is null and u.status='Ativo' and u.id<>v_user
          and (coalesce(nullif(u.group_name,''),'Geral')='Geral' or (v_assignment='adolescentes' and u.group_name='Adolescentes') or (v_assignment='menores' and u.group_name='Menores'))
          and not exists(select 1 from public.sabado_teacher_unavailability tu where tu.user_id=u.id and tu.date=v_schedule.date)
          and private.sabado_normalize_login(coalesce(v_schedule.adolescent_teacher,'')) not in (private.sabado_normalize_login(coalesce(u.name,'')),private.sabado_normalize_login(coalesce(u.login_name,'')))
          and private.sabado_normalize_login(coalesce(v_schedule.younger_teacher,'')) not in (private.sabado_normalize_login(coalesce(u.name,'')),private.sabado_normalize_login(coalesce(u.login_name,'')))
          and not exists(select 1 from public.sabado_schedule_confirmations c2 where c2.schedule_id=p_schedule_id and c2.user_id=u.id and c2.status='declined')
      loop
        insert into public.sabado_notifications(title,body,kind,notice_key,recipient_user_id,schedule_id)
        values('🔄 Vaga disponível para substituição','Precisamos de um professor para '||case v_assignment when 'adolescentes' then 'Adolescentes' else 'Menores' end||' em '||to_char(v_schedule.date,'DD/MM/YYYY')||case when v_schedule.time is null then '' else ' às '||to_char(v_schedule.time,'HH24:MI') end||'. Tema: '||coalesce(nullif(v_schedule.topic,''),'A definir')||'. Se estiver disponível, você pode assumir em Minhas Escalas.','schedule-substitution-open','schedule-substitution-open-'||v_request_id||'-'||v_candidate.id,v_candidate.id,p_schedule_id)
        on conflict(notice_key) where notice_key<>'' do nothing;
        v_candidate_count:=v_candidate_count+1;
      end loop;
    end loop;
  end if;

  return jsonb_build_object('ok',true,'status',v_status,'updated',v_updated,'substitution_candidates',v_candidate_count);
end;
$function$;

create or replace function public.sabado_system_overview_v89()
returns jsonb language sql security invoker set search_path='public','pg_catalog'
as $$ select jsonb_set(public.sabado_system_overview_v88(),'{app_version}',to_jsonb('V89'::text),true) $$;
grant execute on function public.sabado_system_overview_v89() to anon,authenticated;
