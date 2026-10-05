-- V44 — aplicar somente DEPOIS de publicar a V44.
-- Endurece o banco para que cada usuário só use as permissões liberadas.

create or replace function public.sabado_is_active()
returns boolean
language sql stable security definer set search_path=public
as $$
  select public.sabado_is_admin() or exists(
    select 1 from public.sabado_users u
    where u.id=public.sabado_custom_profile_id()
      and u.status<>'Inativo'
  )
$$;

create or replace function public.sabado_has_permission(p_key text)
returns boolean
language sql stable security definer set search_path=public
as $$
  select public.sabado_is_admin() or coalesce((
    select (u.permissions->>p_key)::boolean
    from public.sabado_users u
    where u.id=public.sabado_custom_profile_id()
      and u.status<>'Inativo'
    limit 1
  ),false)
$$;

create or replace function public.sabado_current_profile_id()
returns uuid
language sql stable security definer set search_path=public
as $$
  select coalesce(
    (select u.id from public.sabado_users u where u.auth_user_id=auth.uid() limit 1),
    public.sabado_custom_profile_id()
  )
$$;

-- Depois de validar a V44 online, substituir as políticas públicas antigas
-- por políticas baseadas em sabado_has_permission(...).
