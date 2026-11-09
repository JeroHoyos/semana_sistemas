-- =============================================
-- WEEKLY GAME: RECORDS TABLE
-- Run once in Supabase → SQL Editor. It is safe to run again
-- (it must run again each time a new game arrives).
--
-- Stores each person's best score in each game. Highest wins in all of them; on a tie, whoever
-- played fewer games:
--   'snake'  (week 1, finished on 2026-11-08 at 8 p.m.): 10 per bug.
--   'doom'   (week 2, opens on 2026-11-09 at 7 a.m.): up to 1000 for enemies, items, secrets and time in E1M1.
--   'defrag' (week 3, locked for now): 50 per row.
--
-- Each person saves at most 30 results per day in Snake, 10 in Defrag and 5 in Doom (the day is Colombia's).
-- To change a limit, change it in registrar_puntaje_juego and in dailyGames of the game's cartridge (js/).
--
-- Doom used to be a speedrun (its time in tics) and Defrag gave other points. If the table still has
-- results from then (supervisors' tests), delete them ONCE so they do not beat the new ones:
--   delete from public.puntajes_juego where juego in ('doom', 'defrag');
--
-- Table, column and function names stay in Spanish: they are live in the database and the page calls them by name.
--
-- The page never writes directly to the table: it calls registrar_puntaje_juego, which takes
-- the person from their session (auth.uid()) and checks that the result makes sense.
-- The records table is read with ranking_juego (joins the scores with the name and monster from 'perfiles').
-- =============================================

create table if not exists public.puntajes_juego (
  usuario_id     uuid        not null references auth.users (id) on delete cascade,
  juego          text        not null,
  mejor_puntaje  integer     not null default 0 check (mejor_puntaje >= 0),
  partidas       integer     not null default 0,
  logrado_en     timestamptz not null default now(),   -- when they made their best result: on a tie in score and games, whoever got there first goes first
  ultima_partida timestamptz not null default now(),
  primary key (usuario_id, juego)
);

-- Results saved on the day of ultima_partida
alter table public.puntajes_juego add column if not exists partidas_hoy integer not null default 0;

create index if not exists puntajes_juego_ranking
  on public.puntajes_juego (juego, mejor_puntaje desc, logrado_en);

-- Everyone can see the scores; nobody writes them directly (only the function below)
alter table public.puntajes_juego enable row level security;

drop policy if exists "Todos ven los puntajes" on public.puntajes_juego;
create policy "Todos ven los puntajes" on public.puntajes_juego
  for select using (true);

revoke insert, update, delete on public.puntajes_juego from anon, authenticated;


-- ---------- Locked weeks ----------
-- The game of a week that is not open yet can only be saved by supervisors (to test it).
-- To open a week: remove its game from this list, run the script again and remove locked
-- in WEEKS (js/weekly-game.js). To delete the supervisors' test results:
--   delete from public.puntajes_juego where juego = 'doom';   -- or 'defrag'
-- Doom opens by itself at 7 a.m. on 2026-11-09: the same time is in WEEKS (js/weekly-game.js).
create or replace function public.juego_bloqueado(p_juego text)
returns boolean
language sql
stable
as $$
  select p_juego = 'defrag' or (p_juego = 'doom' and now() < timestamptz '2026-11-09 07:00:00-05');
$$;

-- ---------- Finished weeks ----------
-- After its closing time a game saves no more results, not even supervisors', so the final table
-- (and its prizes, supabase/week-1-prizes.sql) does not move. The same time is endsAt in WEEKS
-- (js/weekly-game.js). The time is checked here, so this script can run before it.
create or replace function public.juego_terminado(p_juego text)
returns boolean
language sql
stable
as $$
  select p_juego = 'snake' and now() >= timestamptz '2026-11-08 20:00:00-05';
$$;

-- Supervisor (admin): marked by hand in app_metadata, which only the database can change.
-- The 'supervisor' title lives in user_metadata, which anyone can edit from the browser console:
-- it only shows the buttons on the page (isCurrentSupervisor in js/scare-meter.js).
-- modificar_puntos (Scare Meter) asks this function too. To make someone a supervisor:
--   update auth.users set raw_app_meta_data = raw_app_meta_data || '{"supervisor": true}'
--   where lower(email) = 'correo@unal.edu.co';
create or replace function public.es_supervisor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select (raw_app_meta_data ->> 'supervisor')::boolean from auth.users where id = auth.uid()), false);
$$;


-- ---------- Saving the result of a run ----------
-- Returns { mejor: <the person's best result>, record: <true if this run improved it>,
-- partidas_hoy: <results saved today> }
create or replace function public.registrar_puntaje_juego(p_juego text, p_puntaje integer)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario      uuid := auth.uid();
  v_hoy          date := (now() at time zone 'America/Bogota')::date;
  v_minimo       integer;
  v_maximo       integer;
  v_multiplo     integer := 1;   -- every score of the game is a multiple of this
  v_limite_dia   integer;        -- results per person per day
  v_anterior     integer;
  v_mejor        integer;
  v_partidas_hoy integer;
begin
  if v_usuario is null then
    raise exception 'Inicia sesión para guardar tu puntaje';
  end if;

  -- Sanctioned accounts (clowns, perfiles.es_payaso) do not enter the table.
  -- Supervisors always do: the anti-cheat functions have marked them by mistake.
  if exists (select 1 from perfiles where id = v_usuario and es_payaso) and not es_supervisor() then
    raise exception 'Seguridad: Tu cuenta tiene un Shadowban activo y no puede registrar récords.';
  end if;

  -- What can be achieved in each game. When a new game arrives, add it here.
  case p_juego
    -- Snake: 300 cells and the snake starts with 4, at 10 points per bug → at most 2,960
    when 'snake' then
      v_minimo := 10;
      v_maximo := 3000;
      v_multiplo := 10;
      v_limite_dia := 30;
    -- Doom E1M1: 400 enemies + 200 items + 200 secrets + 200 time (doomScore in js/doom.js)
    when 'doom' then
      v_minimo := 1;
      v_maximo := 1000;
      v_limite_dia := 5;
    -- Defrag: 50 per row; not even hours at the top level reach 10 million
    when 'defrag' then
      v_minimo := 50;
      v_maximo := 9999950;
      v_multiplo := 50;
      v_limite_dia := 10;
    else
      raise exception 'Juego desconocido: %', p_juego;
  end case;

  if juego_bloqueado(p_juego) and not es_supervisor() then
    raise exception 'Semana bloqueada';
  end if;

  if juego_terminado(p_juego) then
    raise exception 'Juego terminado';
  end if;

  -- The page only sends possible results, so an impossible one comes from the console: the account
  -- becomes a clown. It returns instead of raising an error, because an error would undo the update.
  if p_puntaje is null or p_puntaje < v_minimo or p_puntaje > v_maximo or p_puntaje % v_multiplo <> 0 then
    update perfiles
       set es_payaso = true,
           monstruo = jsonb_set(coalesce(monstruo, '{}'::jsonb), '{es_payaso}', 'true'::jsonb)
     where id = v_usuario;
    return json_build_object('error', '🤡 Trampa detectada: tu cuenta ahora tiene Licencia de Payaso.');
  end if;

  -- for update: two results at the same moment cannot both take the last game of the day
  select mejor_puntaje,
         case when (ultima_partida at time zone 'America/Bogota')::date = v_hoy then partidas_hoy else 0 end
    into v_anterior, v_partidas_hoy
  from puntajes_juego
  where usuario_id = v_usuario and juego = p_juego
  for update;

  v_partidas_hoy := coalesce(v_partidas_hoy, 0) + 1;

  -- Supervisors have no limit: they test the games
  if v_partidas_hoy > v_limite_dia and not es_supervisor() then
    raise exception 'Limite diario';
  end if;

  v_mejor := greatest(coalesce(v_anterior, 0), p_puntaje);

  insert into puntajes_juego as p (usuario_id, juego, mejor_puntaje, partidas, partidas_hoy)
  values (v_usuario, p_juego, p_puntaje, 1, 1)
  on conflict (usuario_id, juego) do update set
    partidas       = p.partidas + 1,
    partidas_hoy   = v_partidas_hoy,
    ultima_partida = now(),
    mejor_puntaje  = v_mejor,
    logrado_en     = case when v_mejor <> p.mejor_puntaje then now() else p.logrado_en end;

  return json_build_object(
    'mejor',        v_mejor,
    'record',       v_anterior is null or v_mejor <> v_anterior,
    'partidas_hoy', v_partidas_hoy
  );
end;
$$;

revoke all on function public.registrar_puntaje_juego(text, integer) from public, anon;
grant execute on function public.registrar_puntaje_juego(text, integer) to authenticated;


-- ---------- Records table of a game ----------
-- Only returns what the Scare Meter already shows: name, @user (without the domain) and monster.
-- Highest score first; on a tie, whoever played fewer games, and then whoever got there first.
create or replace function public.ranking_juego(p_juego text, p_limite integer default 10)
returns table (
  usuario_id    uuid,
  nombre        text,
  usuario       text,
  monstruo      jsonb,
  mejor_puntaje integer,
  partidas      integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    j.usuario_id,
    coalesce(nullif(trim(p.nombre::text), ''), 'Asustador') as nombre,
    split_part(coalesce(p.correo::text, ''), '@', 1)       as usuario,
    (p.monstruo::jsonb - 'titulos')                         as monstruo,
    j.mejor_puntaje,
    j.partidas
  from puntajes_juego j
  left join perfiles p on p.id = j.usuario_id
  where j.juego = p_juego and j.mejor_puntaje > 0
    -- clowns do not show; supervisors always do (see registrar_puntaje_juego)
    and (not coalesce(p.es_payaso, false)
         or coalesce((select (u.raw_app_meta_data ->> 'supervisor')::boolean from auth.users u where u.id = j.usuario_id), false))
  order by j.mejor_puntaje desc, j.partidas asc, j.logrado_en asc
  limit least(greatest(coalesce(p_limite, 10), 1), 50);
$$;

grant execute on function public.ranking_juego(text, integer) to anon, authenticated;

-- No game is timed anymore (Doom was): its old helper goes away
drop function if exists public.juego_menor_gana(text);


-- ---------- Real time: the records table updates by itself on the page ----------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'puntajes_juego'
  ) then
    alter publication supabase_realtime add table public.puntajes_juego;
  end if;
end $$;
