-- V74 — Corrige carregamento da auditoria para login individual/customizado.
create or replace function public.sabado_get_audit_logs(p_limit integer default 1000)
returns table(
  id uuid,
  action text,
  entity_type text,
  entity_name text,
  table_name text,
  record_id text,
  actor_user_id uuid,
  actor_name text,
  actor_email text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz
)
language plpgsql
security definer
set search_path to 'public','private','pg_catalog'
as $function$
begin
  if not public.sabado_is_admin() then
    raise exception 'Somente o Administrador pode visualizar a auditoria.';
  end if;

  return query
  select
    a.id,a.action,a.entity_type,a.entity_name,a.table_name,a.record_id,
    a.actor_user_id,a.actor_name,a.actor_email,a.before_data,a.after_data,a.created_at
  from public.sabado_audit_logs a
  order by a.created_at desc
  limit greatest(1,least(coalesce(p_limit,1000),5000));
end;
$function$;

revoke all on function public.sabado_get_audit_logs(integer) from public;
grant execute on function public.sabado_get_audit_logs(integer) to anon, authenticated;
