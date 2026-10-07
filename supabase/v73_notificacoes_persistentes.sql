-- V73 - estado de notificacoes por usuario
-- Esta migracao já foi aplicada ao projeto Supabase conectado em 07/10/2026.
-- Mantenha o arquivo no pacote para reconstrução/portabilidade do projeto.

create table if not exists public.sabado_notification_states (
  user_id uuid not null references public.sabado_users(id) on delete cascade,
  notification_id uuid not null references public.sabado_notifications(id) on delete cascade,
  status text not null check (status in ('read','deleted')),
  updated_at timestamptz not null default now(),
  primary key (user_id, notification_id)
);

create index if not exists sabado_notification_states_user_idx
  on public.sabado_notification_states(user_id, updated_at desc);

grant select, insert, update, delete on public.sabado_notification_states to anon, authenticated;

alter table public.sabado_notification_states enable row level security;

drop policy if exists sabado_notification_states_select_own on public.sabado_notification_states;
drop policy if exists sabado_notification_states_insert_own on public.sabado_notification_states;
drop policy if exists sabado_notification_states_update_own on public.sabado_notification_states;
drop policy if exists sabado_notification_states_delete_own on public.sabado_notification_states;

create policy sabado_notification_states_select_own on public.sabado_notification_states
  for select to anon, authenticated
  using (user_id = public.sabado_custom_profile_id());

create policy sabado_notification_states_insert_own on public.sabado_notification_states
  for insert to anon, authenticated
  with check (user_id = public.sabado_custom_profile_id());

create policy sabado_notification_states_update_own on public.sabado_notification_states
  for update to anon, authenticated
  using (user_id = public.sabado_custom_profile_id())
  with check (user_id = public.sabado_custom_profile_id());

create policy sabado_notification_states_delete_own on public.sabado_notification_states
  for delete to anon, authenticated
  using (user_id = public.sabado_custom_profile_id());

comment on table public.sabado_notification_states is
  'Armazena por usuario se uma notificacao foi lida ou excluida, evitando que volte em outro dispositivo.';
