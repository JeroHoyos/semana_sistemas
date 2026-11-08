-- =============================================
-- SEMANA DE SISTEMAS: SEGURIDAD, RESTAURACIÓN DE ADMINS Y TRAMPOSOS
-- Ejecutar en Supabase → SQL Editor. Idempotente.
--
-- 1. Asigna rol oficial de Supervisor en app_metadata a todos los administradores legítimos.
-- 2. Limpia cualquier bandera de sanción/payaso/tramposo de sus perfiles y restaura su estatus.
-- 3. Protege las funciones del Sustómetro para que los admins NUNCA puedan ser marcados como tramposos.
-- 4. Bloquea la modificación indebida de puntos por usuarios no autorizados.
-- 5. Deja en la Tabla de Tramposos ÚNICAMENTE a los atacantes reales (Largo, Argenis, etc.).
-- =============================================

-- ---------- 1. Asegurar columnas de seguridad en perfiles ----------
alter table public.perfiles add column if not exists es_payaso boolean default false;
alter table public.perfiles add column if not exists puntos integer default 0;


-- ---------- 2. Otorgar Rol de Supervisor a los Administradores Legítimos ----------
update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"supervisor": true}'::jsonb
 where lower(email) in (
   'saescobara@unal.edu.co',
   'linavarrop@unal.edu.co',
   'jhoyosbo@unal.edu.co',
   'carangosi@unal.edu.co',
   'carangosl@unal.edu.co'
 )
 or split_part(lower(email), '@', 1) in ('saescobara', 'linavarrop', 'jhoyosbo', 'carangosi', 'carangosl', 'juperezl')
 or lower(raw_user_meta_data->>'full_name') like '%juan david perez%'
 or lower(raw_user_meta_data->>'name') like '%juan david perez%';


-- ---------- 3. Limpiar Sanción de Tramposo de los Administradores ----------
update public.perfiles
   set es_payaso = false,
       monstruo = monstruo - 'es_payaso' - 'tramposo'
 where lower(correo) in (
   'saescobara@unal.edu.co',
   'linavarrop@unal.edu.co',
   'jhoyosbo@unal.edu.co',
   'carangosi@unal.edu.co',
   'carangosl@unal.edu.co'
 )
 or split_part(lower(correo), '@', 1) in ('saescobara', 'linavarrop', 'jhoyosbo', 'carangosi', 'carangosl', 'juperezl')
 or lower(nombre) like '%juan david perez%'
 or lower(nombre) like '%santiago escobar%'
 or lower(nombre) like '%libardo navarro%'
 or lower(nombre) like '%jeronimo hoyos%'
 or lower(nombre) like '%catalina arango%';


-- ---------- 4. Verificación de Supervisor en Base de Datos ----------
create or replace function public.es_supervisor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select (raw_app_meta_data ->> 'supervisor')::boolean from auth.users where id = auth.uid()), false)
     or exists (
       select 1 from auth.users
       where id = auth.uid()
         and (
           lower(email) in ('saescobara@unal.edu.co', 'linavarrop@unal.edu.co', 'jhoyosbo@unal.edu.co', 'carangosi@unal.edu.co', 'carangosl@unal.edu.co')
           or split_part(lower(email), '@', 1) in ('saescobara', 'linavarrop', 'jhoyosbo', 'carangosi', 'carangosl', 'juperezl')
           or lower(raw_user_meta_data->>'full_name') like '%juan david perez%'
           or lower(raw_user_meta_data->>'name') like '%juan david perez%'
         )
     );
$$;

revoke all on function public.es_supervisor() from public, anon;
grant execute on function public.es_supervisor() to authenticated;


-- ---------- 5. Función de Filtro: Los Administradores NUNCA son Payasos ----------
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
  select case
    -- Si es administrador legítimo, NUNCA es payaso ni tramposo
    when lower(coalesce(p_correo, '')) in ('saescobara@unal.edu.co', 'linavarrop@unal.edu.co', 'jhoyosbo@unal.edu.co', 'carangosi@unal.edu.co', 'carangosl@unal.edu.co') then false
    when split_part(lower(coalesce(p_correo, '')), '@', 1) in ('saescobara', 'linavarrop', 'jhoyosbo', 'carangosi', 'carangosl', 'juperezl') then false
    when lower(coalesce(p_nombre, '')) like any (array['%santiago escobar%', '%libardo navarro%', '%jeronimo hoyos%', '%catalina arango%', '%juan david perez%']) then false
    else (
      coalesce(p_es_payaso, false)
      or coalesce((p_monstruo->>'es_payaso' in ('true', 't', '1')), false)
      or lower(coalesce(p_nombre, '')) like any (array['%armarina%', '%argenis%', '%largo%', '%01101100%', '%01101001%'])
      or lower(coalesce(p_correo, '')) like any (array['%armarina%', '%argenis%', '%largo%', '%01101100%', '%01101001%'])
    )
  end;
$$;


-- ---------- 6. Modificar Puntos Blindado ----------
create or replace function public.modificar_puntos(target_id uuid, nuevos_puntos integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
begin
  if v_caller is null then
    raise exception 'Debes iniciar sesión';
  end if;

  if not public.es_supervisor() then
    -- TRAMPA DETECTADA: Sancionar inmediatamente a atacantes no autorizados
    update public.perfiles
       set es_payaso = true,
           puntos = 0,
           monstruo = jsonb_set(coalesce(monstruo, '{}'::jsonb), '{es_payaso}', 'true'::jsonb)
     where id = v_caller;

    raise exception 'Seguridad: Acceso denegado. No tienes permisos de Supervisor. Intento de trampa registrado.';
  end if;

  update public.perfiles
     set puntos = greatest(0, coalesce(nuevos_puntos, 0))
   where id = target_id;
end;
$$;

revoke all on function public.modificar_puntos(uuid, integer) from public, anon;
grant execute on function public.modificar_puntos(uuid, integer) to authenticated;


-- ---------- 7. Reportar Tramposo ----------
create or replace function public.reportar_tramposo(motivo text default 'Trampa detectada')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
begin
  if v_caller is null then return; end if;
  if public.es_supervisor() then return; end if; -- Los administradores están protegidos

  update public.perfiles
     set es_payaso = true,
         puntos = 0,
         monstruo = jsonb_set(coalesce(monstruo, '{}'::jsonb), '{es_payaso}', 'true'::jsonb)
   where id = v_caller;
end;
$$;

revoke all on function public.reportar_tramposo(text) from public, anon;
grant execute on function public.reportar_tramposo(text) to authenticated;


-- ---------- 8. Permisos de Columna en perfiles ----------
alter table public.perfiles enable row level security;
revoke update on table public.perfiles from anon, authenticated;
grant update (nombre, monstruo) on table public.perfiles to authenticated;

drop policy if exists "Los usuarios solo editan su propio perfil" on public.perfiles;
create policy "Los usuarios solo editan su propio perfil" on public.perfiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);


-- ---------- 9. Sancionar Únicamente a Hackers Reales (No Admins) ----------
update public.perfiles p
   set es_payaso = true,
       puntos = 0,
       monstruo = jsonb_set(coalesce(monstruo, '{}'::jsonb), '{es_payaso}', 'true'::jsonb)
  from auth.users u
 where p.id = u.id
   and (
     (u.raw_user_meta_data ->> 'titulo' = 'supervisor')
     or ((u.raw_user_meta_data -> 'titulos')::jsonb ? 'supervisor')
     or ((u.raw_user_meta_data -> 'monstruo' -> 'titulos')::jsonb ? 'supervisor')
   )
   and not (
     lower(coalesce(p.correo, u.email, '')) in ('saescobara@unal.edu.co', 'linavarrop@unal.edu.co', 'jhoyosbo@unal.edu.co', 'carangosi@unal.edu.co', 'carangosl@unal.edu.co')
     or split_part(lower(coalesce(p.correo, u.email, '')), '@', 1) in ('saescobara', 'linavarrop', 'jhoyosbo', 'carangosi', 'carangosl', 'juperezl')
     or lower(coalesce(p.nombre, u.raw_user_meta_data->>'full_name', '')) like any (array['%santiago escobar%', '%libardo navarro%', '%jeronimo hoyos%', '%catalina arango%', '%juan david perez%'])
   );


-- ---------- 10. Consulta de la Tabla de Tramposos (Excluye Admins) ----------
create or replace function public.tramposos_sustometro(p_limite int default 50)
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
    and not (
      lower(coalesce(p.correo, '')) in ('saescobara@unal.edu.co', 'linavarrop@unal.edu.co', 'jhoyosbo@unal.edu.co', 'carangosi@unal.edu.co', 'carangosl@unal.edu.co')
      or split_part(lower(coalesce(p.correo, '')), '@', 1) in ('saescobara', 'linavarrop', 'jhoyosbo', 'carangosi', 'carangosl', 'juperezl')
      or lower(coalesce(p.nombre, '')) like any (array['%santiago escobar%', '%libardo navarro%', '%jeronimo hoyos%', '%catalina arango%', '%juan david perez%'])
    )
  order by p.creado_en desc
  limit least(greatest(coalesce(p_limite, 50), 1), 100);
$$;

create or replace function public.payasos_sustometro(p_limite int default 20)
returns table (
  id uuid, nombre text, usuario text, monstruo jsonb, puntos integer, creado_en timestamptz
)
language sql stable security definer set search_path = public
as $$ select * from public.tramposos_sustometro(p_limite); $$;

revoke all on function public.tramposos_sustometro(int) from public;
revoke all on function public.payasos_sustometro(int) from public;

grant execute on function public.tramposos_sustometro(int) to anon, authenticated;
grant execute on function public.payasos_sustometro(int) to anon, authenticated;
