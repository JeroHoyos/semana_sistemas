-- =============================================
-- SEMANA 2: PREMIOS DE DOOM Y BIENVENIDA AL SUSTÓMETRO
-- Ejecutar en Supabase → SQL Editor.
-- Es seguro e idempotente (si se corre varias veces no duplica puntos ni premios).
--
-- Reglas de puntos para Semana 2:
-- - Puesto 1: 7 puntos
-- - Puesto 2: 5 puntos
-- - Puesto 3: 4 puntos
-- - Puestos 4 al 10: 3 puntos
-- - Puesto 11 en adelante (participantes de Doom): 2 puntos
-- - No participantes: 1 punto de bienvenida a la Semana de Sistemas
-- =============================================

-- 1. Asegurar la tabla de premios y su política de seguridad
create table if not exists public.premios_juego (
  usuario_id uuid not null references auth.users(id) on delete cascade,
  juego text not null,
  puesto integer,
  puntos integer not null default 0,
  entregado_en timestamptz not null default now(),
  primary key (usuario_id, juego)
);

-- Si ya existía con 'puesto' NOT NULL, permitir NULL para quienes no participaron
alter table public.premios_juego alter column puesto drop not null;

alter table public.premios_juego enable row level security;

drop policy if exists "Los usuarios ven sus premios" on public.premios_juego;
create policy "Los usuarios ven sus premios"
  on public.premios_juego
  for select
  using (auth.uid() = usuario_id);

-- 2. Asignar los puntos e insertar en premios_juego
do $$
declare
  r record;
  v_puntos integer;
begin
  -- A. Participantes de Doom (Semana 2)
  for r in (
    select
      j.usuario_id,
      rank() over (order by j.mejor_puntaje desc, j.partidas asc) as puesto
    from public.puntajes_juego j
    join public.perfiles p on p.id = j.usuario_id
    where j.juego = 'doom'
      and j.mejor_puntaje > 0
      and (not coalesce(p.es_payaso, false)
           or coalesce((select (u.raw_app_meta_data ->> 'supervisor')::boolean from auth.users u where u.id = j.usuario_id), false))
  ) loop
    if r.puesto = 1 then
      v_puntos := 7;
    elsif r.puesto = 2 then
      v_puntos := 5;
    elsif r.puesto = 3 then
      v_puntos := 4;
    elsif r.puesto between 4 and 10 then
      v_puntos := 3;
    else
      v_puntos := 2;
    end if;

    -- Solo si aún no tiene registrado su premio de Doom
    if not exists (select 1 from public.premios_juego where usuario_id = r.usuario_id and juego = 'doom') then
      insert into public.premios_juego (usuario_id, juego, puesto, puntos)
      values (r.usuario_id, 'doom', r.puesto, v_puntos);

      update public.perfiles
         set puntos = coalesce(puntos, 0) + v_puntos
       where id = r.usuario_id;
    end if;
  end loop;

  -- B. Punto de bienvenida para todos los demás que no participaron en Doom
  for r in (
    select p.id as usuario_id
    from public.perfiles p
    where not exists (
      select 1 from public.puntajes_juego j
      where j.usuario_id = p.id and j.juego = 'doom' and j.mejor_puntaje > 0
    )
    and not exists (
      select 1 from public.premios_juego pr
      where pr.usuario_id = p.id and pr.juego = 'doom'
    )
    and (not coalesce(p.es_payaso, false)
         or coalesce((select (u.raw_app_meta_data ->> 'supervisor')::boolean from auth.users u where u.id = p.id), false))
  ) loop
    insert into public.premios_juego (usuario_id, juego, puesto, puntos)
    values (r.usuario_id, 'doom', null, 1);

    update public.perfiles
       set puntos = coalesce(puntos, 0) + 1
     where id = r.usuario_id;
  end loop;
end;
$$;
