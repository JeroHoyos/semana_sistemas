-- =============================================
-- AGREGAR INSCRIPCIÓN INDIVIDUAL: TORNEO DE CLASH ROYALE
-- Ejecutar en Supabase → SQL Editor → Run
-- Habilita 16 cupos individuales con registro de celular para 'clash-royale'
-- =============================================

-- 1. Actualizar la restricción de actividades permitidas en inscripciones_individuales
alter table public.inscripciones_individuales
  drop constraint if exists inscripciones_individuales_actividad_check;

alter table public.inscripciones_individuales
  add constraint inscripciones_individuales_actividad_check
  check (actividad in ('atletismo', 'videojuegos', 'just-dance', 'clash-royale'));

-- 2. Actualizar la función de inscripción con el límite de 16 cupos para 'clash-royale'
create or replace function public.inscribirse_individual(
  p_actividad text,
  p_celular   text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario uuid := auth.uid();
  v_celular text := regexp_replace(coalesce(p_celular, ''), '[\s().-]', '', 'g');
  v_cupos   integer := case p_actividad
    when 'atletismo' then 45
    when 'videojuegos' then 16
    when 'just-dance' then 16
    when 'clash-royale' then 16
    else null
  end;
  v_actual  integer;
begin
  if v_usuario is null then
    raise exception 'Inicia sesión con tu carnet para inscribirte';
  end if;

  if v_cupos is null then
    raise exception 'Esta actividad no tiene inscripción individual';
  end if;

  if length(v_celular) < 7 or length(v_celular) > 15 then
    raise exception 'Escribe un número de celular válido';
  end if;

  -- Bloqueo concurrente por actividad para proteger el último cupo ante inscripciones simultáneas
  perform pg_advisory_xact_lock(hashtext('individual:' || p_actividad));

  select count(*) into v_actual
    from public.inscripciones_individuales
   where actividad = p_actividad
     and usuario_id <> v_usuario;

  if v_actual >= v_cupos then
    raise exception 'Ya se llenaron los % cupos para esta competencia', v_cupos;
  end if;

  insert into public.inscripciones_individuales (actividad, usuario_id, celular)
  values (p_actividad, v_usuario, v_celular)
  on conflict (actividad, usuario_id) do update
    set celular = excluded.celular;
end;
$$;

grant execute on function public.inscribirse_individual(text, text) to authenticated;
