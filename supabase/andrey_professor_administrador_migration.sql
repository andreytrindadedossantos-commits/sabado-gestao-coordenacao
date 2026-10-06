-- V47 — Andrey escolhe Professor ou Administrador ao entrar
alter table private.sabado_user_sessions
  add column if not exists session_mode text not null default 'professor';

alter table private.sabado_user_sessions
  drop constraint if exists sabado_user_sessions_session_mode_check;

alter table private.sabado_user_sessions
  add constraint sabado_user_sessions_session_mode_check
  check (session_mode in ('professor','admin'));

create or replace function public.sabado_username_select_mode(p_token text,p_mode text)
returns jsonb
language plpgsql
security definer
set search_path=public,private,extensions,pg_catalog
as $$
declare
  v_profile_id uuid;
  v_login text;
  v_mode text;
begin
  v_profile_id:=private.sabado_profile_id_from_token(p_token);
  if v_profile_id is null then raise exception 'Sessão inválida ou expirada.'; end if;
  v_mode:=lower(trim(coalesce(p_mode,'')));
  if v_mode not in ('professor','admin') then raise exception 'Opção de acesso inválida.'; end if;

  select private.sabado_normalize_login(u.login_name) into v_login
  from public.sabado_users u where u.id=v_profile_id;

  if v_mode='admin' and v_login<>'andrey' then
    raise exception 'A opção Administrador está disponível somente para Andrey.';
  end if;

  update private.sabado_user_sessions
     set session_mode=v_mode,last_seen_at=now()
   where profile_id=v_profile_id
     and token_hash=encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex')
     and expires_at>now();

  return jsonb_build_object('ok',true,'mode',v_mode);
end;
$$;

create or replace function public.sabado_custom_session_mode()
returns text
language plpgsql
stable
security definer
set search_path=private,extensions,pg_catalog
as $$
declare
  v_headers jsonb;
  v_token text;
  v_mode text;
begin
  begin v_headers:=current_setting('request.headers',true)::jsonb;
  exception when others then return null;
  end;
  v_token:=coalesce(v_headers->>'x-sabado-session','');
  if v_token='' then return null; end if;
  select s.session_mode into v_mode
  from private.sabado_user_sessions s
  where s.token_hash=encode(extensions.digest(v_token,'sha256'),'hex') and s.expires_at>now()
  limit 1;
  return v_mode;
end;
$$;

create or replace function public.sabado_is_admin()
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select coalesce((auth.jwt()->>'email')='andreytrindadedossantos@gmail.com',false)
      or (public.sabado_custom_session_mode()='admin' and public.sabado_custom_profile_id() is not null)
$$;

grant execute on function public.sabado_username_select_mode(text,text) to anon,authenticated;
grant execute on function public.sabado_custom_session_mode() to anon,authenticated;
grant execute on function public.sabado_username_reset_access(uuid) to anon,authenticated;

-- O banco do projeto já recebeu também as atualizações de sabado_username_login,
-- sabado_username_register e sabado_username_session para devolver e armazenar session_mode.
