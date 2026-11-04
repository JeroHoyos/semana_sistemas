-- =============================================
-- INSCRIPCIONES INDIVIDUALES (inscripciones.html)
-- Se pega una vez en Supabase → SQL Editor → Run.
--
-- Aplica para las competencias individuales:
--   'atletismo':   Carrera de atletismo 8-bit (hasta 45 personas)
--   'videojuegos': Torneo de videojuegos Overcooked 2 (hasta 16 personas)
--
-- No requiere equipos ni búsqueda de equipo: cada estudiante se inscribe
-- directamente con su cuenta y su número de celular.
-- =============================================

create table if not exists public.inscripciones_individuales (
  id          uuid        primary key default gen_random_uuid(),
  actividad   text        not null check (actividad in ('atletismo', 'videojuegos')),
  usuario_id  uuid        not null references auth.users (id) on delete cascade,
  celular     text        not null,
  creado_en   timestamptz not null default now(),
  unique (actividad, usuario_id)
);

-- RLS: Nadie lee ni escribe la tabla directamente; todo se hace mediante las funciones
alter table public.inscripciones_individuales enable row level security;
revoke all on public.inscripciones_individuales from anon, authenticated;


-- ---------- Inscribirse a una competencia individual ----------
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
  v_cupos   integer := case p_actividad when 'atletismo' then 45 when 'videojuegos' then 16 else null end;
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


-- ---------- Cancelar inscripción individual ----------
create or replace function public.cancelar_inscripcion_individual(p_actividad text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario uuid := auth.uid();
begin
  if v_usuario is null then
    raise exception 'Inicia sesión para realizar esta acción';
  end if;

  delete from public.inscripciones_individuales
   where actividad = p_actividad
     and usuario_id = v_usuario;
end;
$$;


-- ---------- Listar participantes inscritos en una competencia individual ----------
-- El celular solo es visible para personas con sesión iniciada
create or replace function public.inscritos_individuales(p_actividad text)
returns table (
  usuario_id uuid,
  nombre     text,
  usuario    text,
  monstruo   jsonb,
  celular    text,
  creado_en  timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    i.usuario_id,
    coalesce(nullif(trim(p.nombre::text), ''), u.raw_user_meta_data ->> 'full_name', 'Asustador') as nombre,
    split_part(u.email, '@', 1) as usuario,
    p.monstruo::jsonb as monstruo,
    case when auth.uid() is not null then i.celular else null end as celular,
    i.creado_en
  from public.inscripciones_individuales i
  join auth.users u on u.id = i.usuario_id
  left join public.perfiles p on p.id = i.usuario_id
  where i.actividad = p_actividad
  order by i.creado_en asc;
$$;


-- Permisos de ejecución
revoke all on function public.inscribirse_individual(text, text) from public, anon;
revoke all on function public.cancelar_inscripcion_individual(text) from public, anon;
revoke all on function public.inscritos_individuales(text) from public;

grant execute on function public.inscribirse_individual(text, text) to authenticated;
grant execute on function public.cancelar_inscripcion_individual(text) to authenticated;
grant execute on function public.inscritos_individuales(text) to anon, authenticated;
