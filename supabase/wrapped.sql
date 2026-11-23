-- =============================================
-- WRAPPED DE LA SEMANA DE SISTEMAS
-- Run once in Supabase → SQL Editor. It is safe to run again.
--
-- mi_wrapped() returns the summary of the person who calls it, as one json object, with a few
-- small indexed queries. It takes the person from the session (auth.uid()): it never receives an id,
-- so nobody can ask for someone else's wrapped. The page calls it once and keeps the answer in
-- localStorage (src/scripts/wrapped.ts). Bump WRAPPED_VERSION in src/lib/wrapped.ts when the shape changes.
--
-- What the story (src/scripts/wrapped-story.ts) needs besides the banner numbers:
--   nombre, monstruo         the person's ID card monster
--   vecinos                  the (up to) 2 people right above in the Sustómetro
--   monstruos, sustos        totals of the whole week
--   asistencias              talks and workshops a supervisor marked as attended
--   individuales             individual competitions signed up for
--   equipos                  teams, with each teammate's id, name and monster
--   clasificaciones, llaves  official results of those competitions (already public)
--
-- Names stay in Spanish: they are live in the database and the page calls them by name.
-- =============================================
create or replace function public.mi_wrapped()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_id      uuid := auth.uid();
  v_puntos  integer;
  v_puesto  integer;
  v_total   integer;
  v_acts    text[];
begin
  if v_id is null then
    return null;
  end if;

  select coalesce(puntos, 0) into v_puntos from public.perfiles where id = v_id;
  if not found then
    return null;
  end if;

  select count(*) + 1 into v_puesto
    from public.perfiles
   where coalesce(puntos, 0) > v_puntos and coalesce(es_payaso, false) = false;
  select count(*) into v_total
    from public.perfiles
   where coalesce(puntos, 0) > 0 and coalesce(es_payaso, false) = false;

  -- Every competition the person took part in, to bring only those results
  select array_agg(actividad) into v_acts from (
    select actividad from public.inscripciones_individuales where usuario_id = v_id
    union select actividad from public.miembros_equipo where usuario_id = v_id
  ) a;

  return jsonb_build_object(
    'puntos', v_puntos,
    'puesto', v_puesto,
    'participantes', v_total,
    'juegos', coalesce((
      select jsonb_agg(jsonb_build_object('juego', juego, 'puntaje', mejor_puntaje, 'partidas', partidas))
        from public.puntajes_juego where usuario_id = v_id
    ), '[]'::jsonb),
    'actividades', coalesce(array_length(v_acts, 1), 0),
    'secretos', (select count(*) from public.secretos_ganadores where usuario_id = v_id),

    'nombre', (select coalesce(nombre, '') from public.perfiles where id = v_id),
    'monstruo', (select coalesce(monstruo, '{}'::jsonb) from public.perfiles where id = v_id),
    'vecinos', coalesce((
      select jsonb_agg(jsonb_build_object('nombre', nombre, 'monstruo', monstruo, 'puntos', puntos) order by puntos)
        from (select coalesce(nombre, '') nombre, coalesce(monstruo, '{}'::jsonb) monstruo, coalesce(puntos, 0) puntos
                from public.perfiles
               where coalesce(puntos, 0) > v_puntos and coalesce(es_payaso, false) = false
               order by puntos asc limit 2) v
    ), '[]'::jsonb),
    'monstruos', (select count(*) from public.perfiles where coalesce(es_payaso, false) = false),
    'sustos', (select coalesce(sum(puntos), 0) from public.perfiles where coalesce(es_payaso, false) = false),
    'asistencias', coalesce((
      select jsonb_agg(actividad) from public.preinscripciones_conferencia where usuario_id = v_id and asistio
    ), '[]'::jsonb),
    'individuales', coalesce((
      select jsonb_agg(actividad) from public.inscripciones_individuales where usuario_id = v_id
    ), '[]'::jsonb),
    'equipos', coalesce((
      select jsonb_agg(jsonb_build_object(
               'actividad', e.actividad,
               'nombre', e.nombre,
               'companeros', coalesce((
                 select jsonb_agg(jsonb_build_object('id', p.id, 'nombre', coalesce(p.nombre, ''), 'monstruo', coalesce(p.monstruo, '{}'::jsonb)))
                   from public.miembros_equipo o join public.perfiles p on p.id = o.usuario_id
                  where o.equipo_id = e.id and o.usuario_id <> v_id
               ), '[]'::jsonb)))
        from public.miembros_equipo m join public.equipos e on e.id = m.equipo_id
       where m.usuario_id = v_id
    ), '[]'::jsonb),
    'clasificaciones', coalesce((
      select jsonb_agg(jsonb_build_object('actividad', actividad, 'resultados', resultados))
        from public.clasificaciones where actividad = any (v_acts)
    ), '[]'::jsonb),
    'llaves', coalesce((
      select jsonb_agg(jsonb_build_object('actividad', actividad, 'participantes', participantes, 'ganadores', ganadores))
        from public.llaves where actividad = any (v_acts)
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.mi_wrapped() from public, anon;
grant execute on function public.mi_wrapped() to authenticated;
