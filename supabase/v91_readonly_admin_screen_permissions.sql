-- V91: permissões de leitura para telas administrativas
update public.sabado_users
set permissions = coalesce(permissions,'{}'::jsonb)
  || jsonb_build_object(
    'view_trash', true,
    'view_audit', coalesce((permissions->>'view_audit')::boolean,false),
    'view_system_central', coalesce((permissions->>'view_system_central')::boolean,false),
    'view_settings', coalesce((permissions->>'view_settings')::boolean,false),
    'view_admin', coalesce((permissions->>'view_admin')::boolean,false)
  )
where role='Professor' and deleted_at is null;

-- O banco de produção desta versão já recebeu as funções:
-- public.sabado_get_audit_logs_v91(integer)
-- public.sabado_system_overview_v91()
-- Essas funções validam o usuário logado e as permissões antes de retornar dados.
