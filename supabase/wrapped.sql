-- =============================================
-- WRAPPED DE LA SEMANA DE SISTEMAS
-- Run once in Supabase → SQL Editor. It is safe to run again.
--
-- mi_wrapped() returns the summary of the person who calls it, as one json object, with a few
-- small indexed queries. It takes the person from the session (auth.uid()): it never receives an id,
-- so nobody can ask for someone else's wrapped. The page calls it once and keeps the answer in
-- localStorage (src/scripts/wrapped.ts).
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

  return jsonb_build_object(
    'puntos', v_puntos,
    'puesto', v_puesto,
    'participantes', v_total,
    'juegos', coalesce((
      select jsonb_agg(jsonb_build_object('juego', juego, 'puntaje', mejor_puntaje, 'partidas', partidas))
        from public.puntajes_juego where usuario_id = v_id
    ), '[]'::jsonb),
    'actividades', (
      (select count(*) from public.inscripciones_individuales where usuario_id = v_id)
      + (select count(*) from public.miembros_equipo where usuario_id = v_id)
    ),
    'secretos', (select count(*) from public.secretos_ganadores where usuario_id = v_id)
  );
end;
$$;

revoke all on function public.mi_wrapped() from public, anon;
grant execute on function public.mi_wrapped() to authenticated;
