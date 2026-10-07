-- V73 - notificação detalhada de alteração de escala
-- Esta migração já foi aplicada ao projeto Supabase conectado em 07/10/2026.

create or replace function public.sabado_schedule_notice_trigger()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_changes text[] := array[]::text[];
  v_body text;
begin
  if tg_op='UPDATE' and
    (old.adolescent_teacher,old.younger_teacher,old.cleaning_helper,old.topic,old.date,old.replacement_reason)
    is distinct from
    (new.adolescent_teacher,new.younger_teacher,new.cleaning_helper,new.topic,new.date,new.replacement_reason) then

    if old.adolescent_teacher is distinct from new.adolescent_teacher then
      v_changes := array_append(v_changes,
        'Adolescentes: '||coalesce(old.adolescent_teacher,'—')||' → '||coalesce(new.adolescent_teacher,'—'));
    end if;

    if old.younger_teacher is distinct from new.younger_teacher then
      v_changes := array_append(v_changes,
        'Menores: '||coalesce(old.younger_teacher,'—')||' → '||coalesce(new.younger_teacher,'—'));
    end if;

    if old.cleaning_helper is distinct from new.cleaning_helper then
      v_changes := array_append(v_changes,
        'Mãe auxiliar: '||coalesce(old.cleaning_helper,'—')||' → '||coalesce(new.cleaning_helper,'—'));
    end if;

    if old.date is distinct from new.date then
      v_changes := array_append(v_changes,
        'Data: '||to_char(old.date,'DD/MM/YYYY')||' → '||to_char(new.date,'DD/MM/YYYY'));
    end if;

    if old.topic is distinct from new.topic then
      v_changes := array_append(v_changes,
        'Assunto: '||coalesce(old.topic,'—')||' → '||coalesce(new.topic,'—'));
    end if;

    v_body := 'Escala de '||to_char(new.date,'DD/MM/YYYY')||'. '||
      case when coalesce(array_length(v_changes,1),0)>0 then array_to_string(v_changes,' | ') else 'Escala atualizada.' end ||
      case when coalesce(new.replacement_reason,'')<>'' then ' · Motivo: '||new.replacement_reason else '' end;

    perform public.sabado_notice_once(
      '🔄 Alteração na escala',
      v_body,
      'schedule',
      'schedule-updated-'||new.id||'-'||extract(epoch from new.updated_at)::bigint,
      null
    );
  end if;
  return new;
end;
$function$;
