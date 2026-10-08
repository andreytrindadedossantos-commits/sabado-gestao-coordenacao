-- V79 — libera Mães, Professores e Ano letivo para professores,
-- mantendo controle individual pelo painel de permissões.
update public.sabado_users
set permissions =
  jsonb_set(
    jsonb_set(
      jsonb_set(coalesce(permissions,'{}'::jsonb), '{view_mothers}', 'true'::jsonb, true),
      '{view_users}', 'true'::jsonb, true
    ),
    '{view_academic_year}', 'true'::jsonb, true
  ),
  updated_at=now()
where role='Professor';

comment on column public.sabado_users.permissions is
'Permissões por usuário. V79 inclui view_mothers, view_users e view_academic_year para controle individual.';
