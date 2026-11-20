-- Cierra Defrag (semana 3) el 20 nov a las 2 p. m.: desde esa hora no se guarda ningún resultado,
-- ni de supervisores. Es solo juego_terminado() de supabase/weekly-game.sql, para no correr ese
-- archivo entero sobre producción. Se puede correr ya: la hora se revisa adentro.
-- La misma hora está en WEEK_3_ENDS (js/common.js).
create or replace function public.juego_terminado(p_juego text)
returns boolean
language sql
stable
as $$
  select (p_juego = 'snake' and now() >= timestamptz '2026-11-08 20:00:00-05')
      or (p_juego = 'doom' and now() >= timestamptz '2026-11-15 20:00:00-05')
      or (p_juego = 'defrag' and now() >= timestamptz '2026-11-20 14:00:00-05');
$$;
