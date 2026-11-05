-- =============================================
-- SCARE METER (SUSTOMETRO) - PAGINATED RANKING & USER POSITION
-- Run once in Supabase → SQL Editor. Idempotent.
--
-- Replaces downloading the full 'perfiles' table on every page load and realtime reload.
-- Returns only the requested page (e.g. top 10 + "Ver más" batches),
-- the authenticated user's exact position and medal tier, and the clown shadowban list.
--
-- Security:
--   - Functions are security definer with set search_path = public.
--   - Institutional email addresses (correo) are NEVER returned to the browser;
--     only the handle (usuario) is exposed for display (@handle · UNAL).
--   - Clown shadowban filtering is performed entirely on the server.
--   - Search wildcards (% and _) in p_busqueda are escaped to prevent pattern injection.
-- =============================================

-- ---------- Helper: Identifies clown / shadowbanned accounts ----------
create or replace function public.es_payaso_perfil(
  p_nombre    text,
  p_correo    text,
  p_es_payaso boolean,
  p_monstruo  jsonb
)
returns boolean
language sql
immutable
as $$
  select coalesce(p_es_payaso, false)
    or coalesce((p_monstruo->>'es_payaso' in ('true', 't', '1')), false)
    or lower(coalesce(p_nombre, '')) like any (array['%armarina%', '%argenis%', '%largo%', '%01101100%', '%01101001%'])
    or lower(coalesce(p_correo, '')) like any (array['%armarina%', '%argenis%', '%largo%', '%01101100%', '%01101001%']);
$$;


-- ---------- 1. Paginated Scare Meter Ranking ----------
-- shortcut: max limit capped at 50 per page, increase limit or add keyset pagination if leaderboard volume requires larger viewports.
create or replace function public.ranking_sustometro(
  p_limite         int  default 10,
  p_desplazamiento int  default 0,
  p_busqueda       text default null
)
returns table (
  id               uuid,
  nombre           text,
  usuario          text,
  monstruo         jsonb,
  puntos           integer,
  creado_en        timestamptz,
  posicion         integer,
  puesto_medalla   integer,
  medalla          text,
  total_filtrados  integer,
  total_general    integer,
  max_puntos       integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limite   int  := least(greatest(coalesce(p_limite, 10), 1), 50);
  v_offset   int  := greatest(coalesce(p_desplazamiento, 0), 0);
  v_busqueda text := regexp_replace(trim(coalesce(p_busqueda, '')), '([%_\\])', '\\\1', 'g');
begin
  return query
  with clasificados as (
    select
      p.id,
      coalesce(nullif(trim(p.nombre::text), ''), 'Estudiante UNAL') as nombre,
      split_part(p.correo::text, '@', 1) as usuario,
      (p.monstruo::jsonb - 'titulos') as monstruo,
      coalesce(p.puntos, 0)::integer as puntos,
      p.creado_en,
      row_number() over (order by coalesce(p.puntos, 0) desc, p.creado_en asc)::integer as posicion,
      dense_rank() over (order by coalesce(p.puntos, 0) desc)::integer as tier,
      max(coalesce(p.puntos, 0)) over ()::integer as max_pts,
      count(*) over ()::integer as total_gen
    from public.perfiles p
    where not public.es_payaso_perfil(p.nombre, p.correo, p.es_payaso, p.monstruo)
  ),
  con_medalla as (
    select
      c.id,
      c.nombre,
      c.usuario,
      c.monstruo,
      c.puntos,
      c.creado_en,
      c.posicion,
      case
        when c.max_pts = 0 then 1
        when c.puntos = 0 then null
        else c.tier
      end::integer as puesto_medalla,
      case
        when c.max_pts = 0 then 'gold'
        when c.puntos = 0 then null
        when c.tier = 1 then 'gold'
        when c.tier = 2 then 'silver'
        when c.tier = 3 then 'bronze'
        else null
      end::text as medalla,
      c.total_gen as total_general,
      c.max_pts as max_puntos
    from clasificados c
  ),
  filtrados as (
    select
      m.*,
      count(*) over ()::integer as total_filtrados
    from con_medalla m
    where (
      v_busqueda = ''
      or m.nombre ilike ('%' || v_busqueda || '%')
      or m.usuario ilike ('%' || v_busqueda || '%')
    )
  )
  select
    f.id,
    f.nombre,
    f.usuario,
    f.monstruo,
    f.puntos,
    f.creado_en,
    f.posicion,
    f.puesto_medalla,
    f.medalla,
    f.total_filtrados,
    f.total_general,
    f.max_puntos
  from filtrados f
  order by f.posicion asc
  limit v_limite
  offset v_offset;
end;
$$;


-- ---------- 2. Logged-in User Position and Medal Tier ----------
create or replace function public.mi_puesto_sustometro()
returns table (
  posicion       integer,
  puntos         integer,
  puesto_medalla integer,
  medalla        text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid                  uuid := auth.uid();
  v_puntos               integer;
  v_creado               timestamptz;
  v_mas_altos            integer;
  v_tiers_ahead          integer;
  v_total_positive_tiers integer;
  v_max_puntos           integer;
  v_medalla              text;
  v_puesto_medalla       integer;
begin
  if v_uid is null then
    return;
  end if;

  select coalesce(p.puntos, 0), p.creado_en
    into v_puntos, v_creado
    from public.perfiles p
   where p.id = v_uid
     and not public.es_payaso_perfil(p.nombre, p.correo, p.es_payaso, p.monstruo);

  if not found then
    return;
  end if;

  -- Count legitimate scarers with higher points (or equal points and earlier created_en)
  select count(*)
    into v_mas_altos
    from public.perfiles p
   where not public.es_payaso_perfil(p.nombre, p.correo, p.es_payaso, p.monstruo)
     and (
       coalesce(p.puntos, 0) > v_puntos
       or (coalesce(p.puntos, 0) = v_puntos and p.creado_en < v_creado)
     );

  -- Count distinct scores strictly above the user's score to preserve medal ties
  select count(distinct coalesce(p.puntos, 0))
    into v_tiers_ahead
    from public.perfiles p
   where not public.es_payaso_perfil(p.nombre, p.correo, p.es_payaso, p.monstruo)
     and coalesce(p.puntos, 0) > 0
     and coalesce(p.puntos, 0) > v_puntos;

  select count(distinct coalesce(p.puntos, 0)), coalesce(max(p.puntos), 0)
    into v_total_positive_tiers, v_max_puntos
    from public.perfiles p
   where not public.es_payaso_perfil(p.nombre, p.correo, p.es_payaso, p.monstruo)
     and coalesce(p.puntos, 0) > 0;

  if v_total_positive_tiers = 0 then
    v_medalla := 'gold';
    v_puesto_medalla := 1;
  elsif v_puntos = 0 then
    v_medalla := null;
    v_puesto_medalla := null;
  elsif v_tiers_ahead = 0 then
    v_medalla := 'gold';
    v_puesto_medalla := 1;
  elsif v_tiers_ahead = 1 then
    v_medalla := 'silver';
    v_puesto_medalla := 2;
  elsif v_tiers_ahead = 2 then
    v_medalla := 'bronze';
    v_puesto_medalla := 3;
  else
    v_medalla := null;
    v_puesto_medalla := v_tiers_ahead + 1;
  end if;

  posicion := v_mas_altos + 1;
  puntos := v_puntos;
  puesto_medalla := v_puesto_medalla;
  medalla := v_medalla;

  return next;
end;
$$;


-- ---------- 3. Clown Shadowban List ----------
create or replace function public.payasos_sustometro(p_limite int default 20)
returns table (
  id        uuid,
  nombre    text,
  usuario   text,
  monstruo  jsonb,
  puntos    integer,
  creado_en timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    case
      when p.nombre ilike '%0110%' or p.nombre ilike '%largo%' or p.correo ilike '%0110%' or p.correo ilike '%largo%'
        then 'Juan Carlos Largo'
      else coalesce(nullif(trim(p.nombre::text), ''), 'Estudiante UNAL')
    end as nombre,
    case
      when p.nombre ilike '%0110%' or p.nombre ilike '%largo%' or p.correo ilike '%0110%' or p.correo ilike '%largo%'
        then 'imlargo'
      else split_part(p.correo::text, '@', 1)
    end as usuario,
    (p.monstruo::jsonb - 'titulos') as monstruo,
    0::integer as puntos,
    p.creado_en
  from public.perfiles p
  where public.es_payaso_perfil(p.nombre, p.correo, p.es_payaso, p.monstruo)
  order by p.creado_en asc
  limit least(greatest(coalesce(p_limite, 20), 1), 50);
$$;


-- ---------- Permissions ----------
revoke all on function public.es_payaso_perfil(text, text, boolean, jsonb) from public;
revoke all on function public.ranking_sustometro(int, int, text) from public;
revoke all on function public.mi_puesto_sustometro() from public;
revoke all on function public.payasos_sustometro(int) from public;

grant execute on function public.ranking_sustometro(int, int, text) to anon, authenticated;
grant execute on function public.mi_puesto_sustometro() to anon, authenticated;
grant execute on function public.payasos_sustometro(int) to anon, authenticated;
