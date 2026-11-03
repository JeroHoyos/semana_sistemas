-- =============================================
-- JUEGO DE LA SEMANA: TABLA DE RÉCORDS
-- Correr una vez en Supabase → SQL Editor. Se puede volver a correr sin problema.
--
-- Guarda el mejor puntaje de cada persona en cada juego ('snake' esta semana, luego 'doom').
-- La página nunca escribe directo en la tabla: llama a registrar_puntaje_juego, que toma
-- a la persona de su sesión (auth.uid()) y revisa que el puntaje tenga sentido.
-- La tabla de récords se lee con ranking_juego (une los puntajes con el nombre y el monstruo de 'perfiles').
-- =============================================

create table if not exists public.puntajes_juego (
  usuario_id     uuid        not null references auth.users (id) on delete cascade,
  juego          text        not null,
  mejor_puntaje  integer     not null default 0 check (mejor_puntaje >= 0),
  partidas       integer     not null default 0,
  logrado_en     timestamptz not null default now(),   -- cuándo hizo su mejor puntaje: en un empate gana quien llegó primero
  ultima_partida timestamptz not null default now(),
  primary key (usuario_id, juego)
);

create index if not exists puntajes_juego_ranking
  on public.puntajes_juego (juego, mejor_puntaje desc, logrado_en);

-- Todo el mundo puede ver los puntajes; nadie los escribe directamente (solo la función de abajo)
alter table public.puntajes_juego enable row level security;

drop policy if exists "Todos ven los puntajes" on public.puntajes_juego;
create policy "Todos ven los puntajes" on public.puntajes_juego
  for select using (true);

revoke insert, update, delete on public.puntajes_juego from anon, authenticated;


-- ---------- Guardar el puntaje de una partida ----------
-- Devuelve { mejor: <mejor puntaje de la persona>, record: <true si esta partida lo superó> }
create or replace function public.registrar_puntaje_juego(p_juego text, p_puntaje integer)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario  uuid := auth.uid();
  v_tope     integer;
  v_anterior integer;
begin
  if v_usuario is null then
    raise exception 'Inicia sesión para guardar tu puntaje';
  end if;

  -- Puntaje máximo que se puede lograr en cada juego. Cuando llegue un juego nuevo, se agrega aquí.
  -- Snake: 300 casillas, 10 puntos por bug y 50 por cada tinto (sale uno cada 5 bugs) → menos de 6.000.
  v_tope := case p_juego
    when 'snake' then 6000
    else null
  end;

  if v_tope is null then
    raise exception 'Juego desconocido: %', p_juego;
  end if;

  -- En Snake todo vale múltiplos de 10
  if p_puntaje is null or p_puntaje <= 0 or p_puntaje > v_tope or p_puntaje % 10 <> 0 then
    raise exception 'Puntaje no válido';
  end if;

  select mejor_puntaje into v_anterior
  from puntajes_juego
  where usuario_id = v_usuario and juego = p_juego;

  insert into puntajes_juego as p (usuario_id, juego, mejor_puntaje, partidas)
  values (v_usuario, p_juego, p_puntaje, 1)
  on conflict (usuario_id, juego) do update set
    partidas       = p.partidas + 1,
    ultima_partida = now(),
    mejor_puntaje  = greatest(p.mejor_puntaje, excluded.mejor_puntaje),
    logrado_en     = case when excluded.mejor_puntaje > p.mejor_puntaje then now() else p.logrado_en end;

  return json_build_object(
    'mejor',  greatest(coalesce(v_anterior, 0), p_puntaje),
    'record', p_puntaje > coalesce(v_anterior, 0)
  );
end;
$$;

revoke all on function public.registrar_puntaje_juego(text, integer) from public, anon;
grant execute on function public.registrar_puntaje_juego(text, integer) to authenticated;


-- ---------- Tabla de récords de un juego ----------
-- Solo devuelve lo que ya se ve en el Sustómetro: nombre, @usuario (sin el dominio) y monstruo.
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
    p.monstruo::jsonb                                       as monstruo,
    j.mejor_puntaje,
    j.partidas
  from puntajes_juego j
  left join perfiles p on p.id = j.usuario_id
  where j.juego = p_juego and j.mejor_puntaje > 0
  order by j.mejor_puntaje desc, j.logrado_en asc
  limit least(greatest(coalesce(p_limite, 10), 1), 50);
$$;

grant execute on function public.ranking_juego(text, integer) to anon, authenticated;


-- ---------- Tiempo real: la tabla de récords se actualiza sola en la página ----------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'puntajes_juego'
  ) then
    alter publication supabase_realtime add table public.puntajes_juego;
  end if;
end $$;
