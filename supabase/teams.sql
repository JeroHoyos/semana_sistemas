-- =============================================
-- TEAM REGISTRATION (inscripciones.html)
-- Run once in Supabase → SQL Editor. It is safe to run again.
--
-- Competitions that take teams, with the limits the page also shows (team in ACTIVITIES, js/data.js):
--   'observacion': up to 4 people per team, at most 10 teams
--   'maraton':     up to 3 people per team, at most 20 teams
--   'futbol':      up to 5 people per team, at most 8 teams
-- To change a limit, change it here (guardar_equipo / agregar_miembro) and in js/data.js.
--
-- Whoever creates a team is its captain and leaves a phone number. The captain signs up the other
-- members by the email of their account. A person is in at most one team per competition
-- and can leave it; the captain cannot leave, only dissolve the team.
--
-- Table, column and function names stay in Spanish, like the rest of the database.
-- The page never touches the tables: it writes through the functions below, which take the person
-- from their session (auth.uid()), and reads with equipos_inscritos.
-- =============================================

create table if not exists public.equipos (
  id         uuid        primary key default gen_random_uuid(),
  actividad  text        not null,                -- activity id in js/data.js
  nombre     text        not null,
  capitan_id uuid        not null references auth.users (id) on delete cascade,
  celular    text        not null,
  bandera    jsonb       not null,                -- { letras, fondo, tinta, forma, estampado, borde, contorno, fuente, adorno }: see drawBanner in js/icons.js
  creado_en  timestamptz not null default now()
);

-- Two teams in the same competition cannot share a name
create unique index if not exists equipos_nombre_unico on public.equipos (actividad, lower(nombre));

create table if not exists public.miembros_equipo (
  equipo_id  uuid        not null references public.equipos (id) on delete cascade,
  usuario_id uuid        not null references auth.users (id) on delete cascade,
  actividad  text        not null,                -- copy of the team's, so the database enforces one team per competition
  unido_en   timestamptz not null default now(),
  primary key (equipo_id, usuario_id),
  unique (actividad, usuario_id)
);

-- Row level security with no policies: nobody reads or writes the tables directly
alter table public.equipos enable row level security;
alter table public.miembros_equipo enable row level security;
revoke all on public.equipos, public.miembros_equipo from anon, authenticated;

-- Pool of players looking for a team / free agents
create table if not exists public.buscando_equipo (
  id         uuid        primary key default gen_random_uuid(),
  actividad  text        not null check (actividad in ('futbol', 'observacion', 'maraton')),
  usuario_id uuid        not null references auth.users (id) on delete cascade,
  celular    text        not null,
  posiciones jsonb       not null default '[]'::jsonb,
  creado_en  timestamptz not null default now(),
  unique (actividad, usuario_id)
);

alter table public.buscando_equipo enable row level security;
revoke all on public.buscando_equipo from anon, authenticated;


drop function if exists public.guardar_equipo(text, text, text, jsonb);

-- ---------- Creating a team, or editing your own ----------
-- If the person is already captain in that competition, it updates the name, phone and banner.
-- When creating a team, requires at least 2 members besides the captain (at least 3 people total).
-- Returns the team id.
create or replace function public.guardar_equipo(
  p_actividad text,
  p_nombre    text,
  p_celular   text,
  p_bandera   jsonb,
  p_miembros  text[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario          uuid := auth.uid();
  v_usuario_email    text;
  v_nombre           text := trim(coalesce(p_nombre, ''));
  v_celular          text := regexp_replace(coalesce(p_celular, ''), '[\s().-]', '', 'g');
  v_cupos            integer := case p_actividad when 'futbol' then 8 when 'observacion' then 10 when 'maraton' then 20 end;
  v_tamano           integer := case p_actividad when 'futbol' then 5 when 'observacion' then 4 when 'maraton' then 3 end;
  v_bandera jsonb := jsonb_build_object(
    'letras',    trim(coalesce(p_bandera ->> 'letras', '')),
    'fondo',     coalesce(p_bandera ->> 'fondo', ''),
    'tinta',     coalesce(p_bandera ->> 'tinta', ''),
    'forma',     coalesce(p_bandera ->> 'forma', ''),
    'estampado', coalesce(p_bandera ->> 'estampado', ''),
    'borde',     coalesce(p_bandera ->> 'borde', ''),
    'contorno',  coalesce(p_bandera ->> 'contorno', ''),
    'fuente',    coalesce(p_bandera ->> 'fuente', ''),
    'adorno',    coalesce(p_bandera ->> 'adorno', '')
  );
  v_equipo           uuid;
  v_correo           text;
  v_miembro_id       uuid;
  v_miembros_limpios text[] := '{}';
begin
  if v_usuario is null then
    raise exception 'Inicia sesión para inscribir un equipo';
  end if;
  if coalesce(p_actividad, '') not in ('observacion', 'maraton', 'futbol') then
    raise exception 'Esta competencia no tiene inscripciones';
  end if;
  if char_length(v_nombre) not between 2 and 30 then
    raise exception 'El nombre del equipo debe tener entre 2 y 30 caracteres';
  end if;
  if v_celular !~ '^\+?[0-9]{7,15}$' then
    raise exception 'Escribe un número de celular válido';
  end if;
  if char_length(v_bandera ->> 'letras') not between 1 and 4
     or v_bandera ->> 'fondo' !~ '^#[0-9a-fA-F]{6}$'
     or v_bandera ->> 'tinta' !~ '^#[0-9a-fA-F]{6}$'
     -- The options of BANNER_OPTIONS in js/icons.js
     or v_bandera ->> 'forma' not in ('golondrina', 'punta', 'recta', 'ondas')
     or v_bandera ->> 'estampado' not in ('liso', 'rayas', 'franja', 'manchas', 'cuadros')
     or v_bandera ->> 'borde' not in ('ninguno', 'ribete', 'costura')
     or v_bandera ->> 'contorno' not in ('ninguno', 'blanco', 'negro')
     or v_bandera ->> 'fuente' not in ('varsity', 'bloque', 'griega', 'terror', 'pixel', 'circo')
     or v_bandera ->> 'adorno' not in ('ninguno', 'cuernos', 'antenas', 'ojo', 'corona', 'estrellas', 'baba', 'colmillos', 'garras') then
    raise exception 'La bandera no es válida';
  end if;

  select lower(email) into v_usuario_email from auth.users where id = v_usuario;

  -- One sign-up at a time per competition, so two teams cannot take the last spot together
  perform pg_advisory_xact_lock(hashtext('equipos:' || p_actividad));

  select id into v_equipo from equipos where actividad = p_actividad and capitan_id = v_usuario;

  if exists (select 1 from equipos where actividad = p_actividad and lower(nombre) = lower(v_nombre)
             and id is distinct from v_equipo) then
    raise exception 'Ya hay un equipo llamado %', v_nombre;
  end if;

  -- Si el equipo ya existe, el capitán solo actualiza nombre, celular y bandera
  if v_equipo is not null then
    update equipos set nombre = v_nombre, celular = v_celular, bandera = v_bandera where id = v_equipo;
    return v_equipo;
  end if;

  -- CREACIÓN DE EQUIPO NUEVO:
  if exists (select 1 from miembros_equipo where actividad = p_actividad and usuario_id = v_usuario) then
    raise exception 'Ya estás en un equipo de esta competencia: sal de él para crear el tuyo';
  end if;
  if v_cupos is not null and (select count(*) from equipos where actividad = p_actividad) >= v_cupos then
    raise exception 'Ya se inscribieron los % equipos que caben', v_cupos;
  end if;

  -- VALIDACIÓN DE AL MENOS 3 INTEGRANTES (Capitán + mínimo 2 integrantes)
  if p_miembros is not null then
    foreach v_correo in array p_miembros loop
      v_correo := lower(trim(coalesce(v_correo, '')));
      if v_correo <> '' then
        if v_correo = v_usuario_email then
          raise exception 'No te incluyas en los integrantes; tú ya quedas como capitán';
        end if;
        if v_correo = any(v_miembros_limpios) then
          raise exception 'No puedes repetir el correo % dos veces', v_correo;
        end if;
        v_miembros_limpios := array_append(v_miembros_limpios, v_correo);
      end if;
    end loop;
  end if;

  if coalesce(array_length(v_miembros_limpios, 1), 0) < 2 then
    raise exception 'Para crear el equipo debes ingresar al menos 2 integrantes más (mínimo 3 personas con el capitán)';
  end if;

  if (1 + array_length(v_miembros_limpios, 1)) > v_tamano then
    raise exception 'El equipo no puede tener más de % integrantes en esta competencia', v_tamano;
  end if;

  -- Insertar el equipo
  insert into equipos (actividad, nombre, capitan_id, celular, bandera)
  values (p_actividad, v_nombre, v_usuario, v_celular, v_bandera)
  returning id into v_equipo;

  -- Insertar al capitán
  insert into miembros_equipo (equipo_id, usuario_id, actividad) values (v_equipo, v_usuario, p_actividad);

  -- Insertar a cada integrante
  foreach v_correo in array v_miembros_limpios loop
    select id into v_miembro_id from auth.users where lower(email) = v_correo;
    if v_miembro_id is null then
      raise exception 'El correo % no ha emitido su carnet en la página todavía. Pídele que se registre primero', v_correo;
    end if;
    if exists (select 1 from miembros_equipo where actividad = p_actividad and usuario_id = v_miembro_id) then
      raise exception 'La persona con correo % ya está en otro equipo de esta competencia', v_correo;
    end if;
    insert into miembros_equipo (equipo_id, usuario_id, actividad) values (v_equipo, v_miembro_id, p_actividad);
  end loop;

  -- Si alguno de los integrantes o el capitán estaba en la bolsa de jugadores, quitarlo
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'buscando_equipo') then
    delete from public.buscando_equipo
     where actividad = p_actividad
       and usuario_id in (select usuario_id from miembros_equipo where equipo_id = v_equipo);
  end if;

  return v_equipo;
end;
$$;


-- ---------- The captain signs up a member by the email of their account ----------
create or replace function public.agregar_miembro(p_equipo uuid, p_correo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actividad text;
  v_capitan   uuid;
  v_tamano    integer;
  v_nuevo     uuid;
begin
  select actividad, capitan_id into v_actividad, v_capitan from equipos where id = p_equipo;
  if v_capitan is null or v_capitan is distinct from auth.uid() then
    raise exception 'Solo el capitán puede inscribir integrantes';
  end if;

  v_tamano := case v_actividad when 'observacion' then 4 when 'maraton' then 3 when 'futbol' then 5 end;

  perform pg_advisory_xact_lock(hashtext('equipos:' || v_actividad));

  select id into v_nuevo from auth.users where lower(email) = lower(trim(coalesce(p_correo, '')));
  if v_nuevo is null then
    raise exception 'Nadie ha creado un carnet con ese correo. Pídele que cree su cuenta primero';
  end if;
  if exists (select 1 from miembros_equipo where actividad = v_actividad and usuario_id = v_nuevo) then
    raise exception 'Esa persona ya está en un equipo de esta competencia';
  end if;
  if (select count(*) from miembros_equipo where equipo_id = p_equipo) >= v_tamano then
    raise exception 'El equipo ya está completo: son % personas', v_tamano;
  end if;

  insert into miembros_equipo (equipo_id, usuario_id, actividad) values (p_equipo, v_nuevo, v_actividad);
  delete from public.buscando_equipo where actividad = v_actividad and usuario_id = v_nuevo;
end;
$$;


-- ---------- A member leaves, or the captain removes them ----------
create or replace function public.quitar_miembro(p_equipo uuid, p_usuario uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capitan uuid;
begin
  select capitan_id into v_capitan from equipos where id = p_equipo;
  if v_capitan is null then
    raise exception 'Ese equipo ya no existe';
  end if;
  if p_usuario = v_capitan then
    raise exception 'El capitán no puede salirse: disuelve el equipo';
  end if;
  if auth.uid() is distinct from v_capitan and auth.uid() is distinct from p_usuario then
    raise exception 'Solo el capitán puede quitar integrantes';
  end if;

  delete from miembros_equipo where equipo_id = p_equipo and usuario_id = p_usuario;
end;
$$;


-- ---------- The captain dissolves the team (its members are freed) ----------
create or replace function public.eliminar_equipo(p_equipo uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from equipos where id = p_equipo and capitan_id = auth.uid();
  if not found then
    raise exception 'Solo el capitán puede disolver el equipo';
  end if;
end;
$$;

revoke all on function public.guardar_equipo(text, text, text, jsonb, text[]) from public, anon;
revoke all on function public.agregar_miembro(uuid, text) from public, anon;
revoke all on function public.quitar_miembro(uuid, uuid) from public, anon;
revoke all on function public.eliminar_equipo(uuid) from public, anon;
grant execute on function public.guardar_equipo(text, text, text, jsonb, text[]) to authenticated;
grant execute on function public.agregar_miembro(uuid, text) to authenticated;
grant execute on function public.quitar_miembro(uuid, uuid) to authenticated;
grant execute on function public.eliminar_equipo(uuid) to authenticated;


-- ---------- Every registered team, oldest first ----------
-- Members carry what the Scare Meter already shows (name, @user without the domain, monster); captain first.
-- The captain's phone only goes to people with a session, so it is not left open to anyone on the internet.
create or replace function public.equipos_inscritos()
returns table (
  id         uuid,
  actividad  text,
  nombre     text,
  bandera    jsonb,
  capitan_id uuid,
  celular    text,
  miembros   jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.id,
    e.actividad,
    e.nombre,
    e.bandera,
    e.capitan_id,
    case when auth.uid() is not null then e.celular end,
    (
      select jsonb_agg(jsonb_build_object(
          'id',       m.usuario_id,
          'nombre',   coalesce(nullif(trim(p.nombre::text), ''), u.raw_user_meta_data ->> 'full_name', 'Asustador'),
          'usuario',  split_part(u.email, '@', 1),
          'monstruo', p.monstruo::jsonb
        ) order by m.usuario_id = e.capitan_id desc, m.unido_en)
      from miembros_equipo m
      join auth.users u on u.id = m.usuario_id
      left join perfiles p on p.id = m.usuario_id
      where m.equipo_id = e.id
    )
  from equipos e
  order by e.creado_en;
$$;

grant execute on function public.equipos_inscritos() to anon, authenticated;


-- ---------- A player joins the free agents pool ----------
create or replace function public.anotarse_busqueda_equipo(
  p_actividad  text,
  p_celular    text,
  p_posiciones jsonb default '[]'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario uuid := auth.uid();
  v_celular text := regexp_replace(coalesce(p_celular, ''), '[\s().-]', '', 'g');
begin
  if v_usuario is null then
    raise exception 'Inicia sesión para anotarte en la lista';
  end if;
  if p_actividad not in ('futbol', 'observacion', 'maraton') then
    raise exception 'Competencia no válida';
  end if;
  if length(v_celular) < 7 or length(v_celular) > 15 then
    raise exception 'Escribe un número de celular válido';
  end if;
  if exists (select 1 from miembros_equipo where actividad = p_actividad and usuario_id = v_usuario) then
    raise exception 'Ya haces parte de un equipo en esta competencia';
  end if;

  insert into public.buscando_equipo (actividad, usuario_id, celular, posiciones)
  values (p_actividad, v_usuario, v_celular, coalesce(p_posiciones, '[]'::jsonb))
  on conflict (actividad, usuario_id) do update
    set celular = excluded.celular,
        posiciones = excluded.posiciones,
        creado_en = now();
end;
$$;


-- ---------- A player leaves the free agents pool ----------
create or replace function public.salir_busqueda_equipo(p_actividad text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión para realizar esta acción';
  end if;
  delete from public.buscando_equipo
   where actividad = p_actividad and usuario_id = auth.uid();
end;
$$;


-- ---------- List players looking for a team in a competition ----------
create or replace function public.personas_buscando_equipo(p_actividad text)
returns table (
  usuario_id uuid,
  nombre     text,
  usuario    text,
  monstruo   jsonb,
  celular    text,
  posiciones jsonb,
  creado_en  timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    b.usuario_id,
    coalesce(nullif(trim(p.nombre::text), ''), u.raw_user_meta_data ->> 'full_name', 'Asustador') as nombre,
    split_part(u.email, '@', 1) as usuario,
    p.monstruo::jsonb as monstruo,
    case when auth.uid() is not null then b.celular else null end as celular,
    b.posiciones,
    b.creado_en
  from public.buscando_equipo b
  join auth.users u on u.id = b.usuario_id
  left join public.perfiles p on p.id = b.usuario_id
  where b.actividad = p_actividad
  order by b.creado_en desc;
$$;

revoke all on function public.anotarse_busqueda_equipo(text, text, jsonb) from public, anon;
grant execute on function public.anotarse_busqueda_equipo(text, text, jsonb) to authenticated;

revoke all on function public.salir_busqueda_equipo(text) from public, anon;
grant execute on function public.salir_busqueda_equipo(text) to authenticated;

revoke all on function public.personas_buscando_equipo(text) from public;
grant execute on function public.personas_buscando_equipo(text) to anon, authenticated;
