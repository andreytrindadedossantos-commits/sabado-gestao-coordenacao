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
