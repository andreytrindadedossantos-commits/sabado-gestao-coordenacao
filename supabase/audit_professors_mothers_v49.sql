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
