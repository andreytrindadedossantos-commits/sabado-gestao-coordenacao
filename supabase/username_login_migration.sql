-- V44 — Login por usuário + senha própria + sessão de 30 dias
create extension if not exists pgcrypto with schema extensions;

alter table public.sabado_users add column if not exists login_name text;
alter table public.sabado_users add column if not exists password_created boolean not null default false;

with ranked as (
  select
    id,
    split_part(trim(name),' ',1) as base_login,
    row_number() over (
      partition by lower(split_part(trim(name),' ',1))
      order by created_at,id
    ) as rn
  from public.sabado_users
  where coalesce(trim(login_name),'')=''
)
update public.sabado_users u
set login_name=case when ranked.rn=1 then ranked.base_login else ranked.base_login||ranked.rn::text end
from ranked
where ranked.id=u.id;

create unique index if not exists sabado_users_login_name_unique
on public.sabado_users(lower(login_name))
where login_name is not null and trim(login_name)<>'';

create schema if not exists private;

create table if not exists private.sabado_user_credentials (
  profile_id uuid primary key references public.sabado_users(id) on delete cascade,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists private.sabado_user_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.sabado_users(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now()
);

create index if not exists sabado_user_sessions_profile_idx
  on private.sabado_user_sessions(profile_id);
create index if not exists sabado_user_sessions_expires_idx
  on private.sabado_user_sessions(expires_at);

revoke all on private.sabado_user_credentials from public, anon, authenticated;
revoke all on private.sabado_user_sessions from public, anon, authenticated;

create or replace function private.sabado_normalize_login(p_value text)
returns text
language sql
immutable
set search_path=pg_catalog
as $$
  select regexp_replace(
    translate(
      lower(trim(coalesce(p_value,''))),
      'áàãâäéèêëíìîïóòõôöúùûüç',
      'aaaaaeeeeiiiiooooouuuuc'
    ),
    '\s+','','g'
  )
$$;

create or replace function private.sabado_find_profile(p_username text)
returns public.sabado_users
language sql
stable
security definer
set search_path=public,private,pg_catalog
as $$
  select u
  from public.sabado_users u
  where lower(coalesce(u.email,'')) <> 'andreytrindadedossantos@gmail.com'
    and (
      private.sabado_normalize_login(u.login_name)=private.sabado_normalize_login(p_username)
      or private.sabado_normalize_login(u.name)=private.sabado_normalize_login(p_username)
    )
  order by case when private.sabado_normalize_login(u.login_name)=private.sabado_normalize_login(p_username) then 0 else 1 end
  limit 1
$$;

create or replace function public.sabado_username_register(p_username text,p_password text)
returns jsonb
language plpgsql
security definer
set search_path=public,private,extensions,pg_catalog
as $$
declare
  v_user public.sabado_users;
  v_token text;
  v_expires timestamptz;
begin
  if length(coalesce(p_password,''))<6 then
    raise exception 'A senha precisa ter pelo menos 6 caracteres.';
  end if;

  select * into v_user from private.sabado_find_profile(p_username);
  if v_user.id is null then raise exception 'Usuário não cadastrado. Procure o administrador.'; end if;
  if v_user.status='Inativo' then raise exception 'Seu acesso está inativo. Procure o administrador.'; end if;
  if exists(select 1 from private.sabado_user_credentials c where c.profile_id=v_user.id) then
    raise exception 'A senha deste usuário já foi criada. Use Entrar.';
  end if;

  insert into private.sabado_user_credentials(profile_id,password_hash)
  values(v_user.id,extensions.crypt(p_password,extensions.gen_salt('bf')));

  v_token:=encode(extensions.gen_random_bytes(32),'hex');
  v_expires:=now()+interval '30 days';

  insert into private.sabado_user_sessions(profile_id,token_hash,expires_at)
  values(v_user.id,encode(extensions.digest(v_token,'sha256'),'hex'),v_expires);

  update public.sabado_users set password_created=true,updated_at=now() where id=v_user.id;

  return jsonb_build_object('token',v_token,'expires_at',v_expires,'user',v_user.login_name);
end;
$$;

create or replace function public.sabado_username_login(p_username text,p_password text)
returns jsonb
language plpgsql
security definer
set search_path=public,private,extensions,pg_catalog
as $$
declare
  v_user public.sabado_users;
  v_hash text;
  v_token text;
  v_expires timestamptz;
begin
  select * into v_user from private.sabado_find_profile(p_username);
  if v_user.id is null then raise exception 'Usuário ou senha incorretos.'; end if;
  if v_user.status='Inativo' then raise exception 'Seu acesso está inativo. Procure o administrador.'; end if;

  select c.password_hash into v_hash from private.sabado_user_credentials c where c.profile_id=v_user.id;
  if v_hash is null then raise exception 'Primeiro acesso: toque em Primeiro acesso? Criar senha.'; end if;
  if extensions.crypt(p_password,v_hash)<>v_hash then raise exception 'Usuário ou senha incorretos.'; end if;

  delete from private.sabado_user_sessions where expires_at<=now();

  v_token:=encode(extensions.gen_random_bytes(32),'hex');
  v_expires:=now()+interval '30 days';

  insert into private.sabado_user_sessions(profile_id,token_hash,expires_at)
  values(v_user.id,encode(extensions.digest(v_token,'sha256'),'hex'),v_expires);

  return jsonb_build_object('token',v_token,'expires_at',v_expires,'user',v_user.login_name);
end;
$$;

create or replace function private.sabado_profile_id_from_token(p_token text)
returns uuid
language sql
stable
security definer
set search_path=private,extensions,pg_catalog
as $$
  select s.profile_id
  from private.sabado_user_sessions s
  where s.token_hash=encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex')
    and s.expires_at>now()
  limit 1
$$;

create or replace function public.sabado_username_session(p_token text)
returns jsonb
language plpgsql
security definer
set search_path=public,private,extensions,pg_catalog
as $$
declare
  v_profile_id uuid;
  v_user public.sabado_users;
  v_expires timestamptz;
begin
  v_profile_id:=private.sabado_profile_id_from_token(p_token);
  if v_profile_id is null then return null; end if;

  select * into v_user from public.sabado_users where id=v_profile_id;
  if v_user.id is null or v_user.status='Inativo' then return null; end if;

  select expires_at into v_expires
  from private.sabado_user_sessions
  where profile_id=v_profile_id
    and token_hash=encode(extensions.digest(p_token,'sha256'),'hex')
    and expires_at>now()
  limit 1;

  update private.sabado_user_sessions
  set last_seen_at=now()
  where profile_id=v_profile_id
    and token_hash=encode(extensions.digest(p_token,'sha256'),'hex');

  return jsonb_build_object(
    'id',v_user.id,
    'name',v_user.name,
    'login_name',v_user.login_name,
    'phone',v_user.phone,
    'role',v_user.role,
    'group_name',v_user.group_name,
    'status',v_user.status,
    'permissions',v_user.permissions,
    'expires_at',v_expires
  );
end;
$$;

create or replace function public.sabado_username_logout(p_token text)
returns boolean
language plpgsql
security definer
set search_path=private,extensions,pg_catalog
as $$
begin
  delete from private.sabado_user_sessions
  where token_hash=encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex');
  return true;
end;
$$;

create or replace function public.sabado_username_reset_access(p_profile_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public,private,pg_catalog
as $$
begin
  if not public.sabado_is_admin() then
    raise exception 'Somente o Super Administrador pode liberar uma nova senha.';
  end if;

  delete from private.sabado_user_sessions where profile_id=p_profile_id;
  delete from private.sabado_user_credentials where profile_id=p_profile_id;
  update public.sabado_users set password_created=false,updated_at=now() where id=p_profile_id;
  return found;
end;
$$;

create or replace function public.sabado_custom_profile_id()
returns uuid
language plpgsql
stable
security definer
set search_path=private,extensions,pg_catalog
as $$
declare
  v_headers jsonb;
  v_token text;
begin
  begin
    v_headers:=current_setting('request.headers',true)::jsonb;
  exception when others then
    return null;
  end;
  v_token:=coalesce(v_headers->>'x-sabado-session','');
  if v_token='' then return null; end if;
  return private.sabado_profile_id_from_token(v_token);
end;
$$;

grant execute on function public.sabado_username_register(text,text) to anon,authenticated;
grant execute on function public.sabado_username_login(text,text) to anon,authenticated;
grant execute on function public.sabado_username_session(text) to anon,authenticated;
grant execute on function public.sabado_username_logout(text) to anon,authenticated;
grant execute on function public.sabado_username_reset_access(uuid) to authenticated;
grant execute on function public.sabado_custom_profile_id() to anon,authenticated;

-- Auditoria reconhece tanto Super Administrador/Supabase Auth quanto sessão por usuário.
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
    v_actor_login:='Super Administrador';
  end if;

  v_actor_name:=coalesce(nullif(v_actor_name,''),v_actor_login,v_email,'Usuário sem login');

  case tg_table_name
    when 'sabado_students' then v_entity_type:='Aluno';v_entity_name:=coalesce(v_row->>'name','Aluno');
    when 'sabado_schedules' then v_entity_type:='Escala';v_entity_name:=concat_ws(' · ',nullif(v_row->>'date',''),nullif(v_row->>'topic',''));
    when 'sabado_attendance' then v_entity_type:='Chamada';v_entity_name:=concat_ws(' · ',nullif(v_row->>'date',''),nullif(v_row->>'teacher',''));
    when 'sabado_meetings' then v_entity_type:='Reunião';v_entity_name:=coalesce(v_row->>'title','Reunião');
    when 'sabado_events' then v_entity_type:='Evento';v_entity_name:=coalesce(v_row->>'title','Evento');
    else return coalesce(new,old);
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
