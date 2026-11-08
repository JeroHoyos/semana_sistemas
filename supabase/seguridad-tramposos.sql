-- =============================================
-- SEMANA DE SISTEMAS: SEGURIDAD Y PARCHE DE TRAMPOSOS
-- Ejecutar en Supabase → SQL Editor. Idempotente.
--
-- Corrige:
-- 1. Intento de auto-otorgarse rol de Supervisor desde la consola (raw_user_meta_data).
-- 2. Modificación indebida de puntos (RPC modificar_puntos y UPDATE directo en perfiles).
-- 3. Restringe permisos de columnas en la tabla perfiles (nadie puede editar 'puntos' ni 'es_payaso' directamente).
-- 4. Sanciona inmediatamente a todos los infractores y los traslada a la Tabla de Tramposos.
-- 5. Provee las funciones para consultar la Tabla de Tramposos en tiempo real.
-- =============================================

-- ---------- 1. Asegurar columnas de seguridad en perfiles ----------
alter table public.perfiles add column if not exists es_payaso boolean default false;
alter table public.perfiles add column if not exists puntos integer default 0;

-- ---------- 2. Verificación estricta de Supervisor ----------
-- Solo confía en app_metadata.supervisor (controlado exclusivamente desde la BD o dashboard de Supabase).
-- Nunca confía en raw_user_meta_data ya que cualquier usuario puede escribir ahí desde el navegador.
create or replace function public.es_supervisor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select (raw_app_meta_data ->> 'supervisor')::boolean from auth.users where id = auth.uid()), false);
$$;

revoke all on function public.es_supervisor() from public, anon;
grant execute on function public.es_supervisor() to authenticated;


-- ---------- 3. Función Segura: Modificar Puntos ----------
-- Solo los verdaderos supervisores pueden modificar puntos.
-- Si un usuario no supervisor intenta llamarla desde la consola, el sistema detecta
-- el intento de trampa, sanciona su cuenta a la Tabla de Tramposos (0 pts) y lanza un error.
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

  -- Comprobación estricta de permisos de supervisor
  if not public.es_supervisor() then
    -- TRAMPA DETECTADA: Sancionar inmediatamente al usuario que intentó el exploit
    update public.perfiles
       set es_payaso = true,
           puntos = 0,
           monstruo = jsonb_set(coalesce(monstruo, '{}'::jsonb), '{es_payaso}', 'true'::jsonb)
     where id = v_caller;

    raise exception 'Seguridad: Acceso denegado. No tienes permisos de Supervisor. Intento de trampa registrado. Tu cuenta ha sido sancionada en la Tabla de Tramposos.';
  end if;

  -- Actualización legítima por el supervisor
  update public.perfiles
     set puntos = greatest(0, coalesce(nuevos_puntos, 0))
   where id = target_id;
end;
$$;

revoke all on function public.modificar_puntos(uuid, integer) from public, anon;
grant execute on function public.modificar_puntos(uuid, integer) to authenticated;


-- ---------- 4. Reporte y Sanción de Tramposos ----------
-- Llamado cuando el frontend detecta inyecciones ilegales de títulos de supervisor
create or replace function public.reportar_tramposo(motivo text default 'Trampa detectada')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
begin
  if v_caller is null then
    return;
  end if;

  update public.perfiles
     set es_payaso = true,
         puntos = 0,
         monstruo = jsonb_set(coalesce(monstruo, '{}'::jsonb), '{es_payaso}', 'true'::jsonb)
   where id = v_caller;
end;
$$;

revoke all on function public.reportar_tramposo(text) from public, anon;
grant execute on function public.reportar_tramposo(text) to authenticated;


-- ---------- 5. Blindaje de la tabla perfiles (RLS & Permisos de Columna) ----------
-- Evita que cualquier usuario ejecute: supabaseClient.from('perfiles').update({ puntos: 99999 })
alter table public.perfiles enable row level security;

-- Revocar actualización general
revoke update on table public.perfiles from anon, authenticated;

-- Permitir únicamente editar nombre y monstruo (puntos y es_payaso quedan bloqueados contra UPDATE directo)
grant update (nombre, monstruo) on table public.perfiles to authenticated;

-- Política RLS para asegurar que un usuario solo pueda editar su propia fila
drop policy if exists "Los usuarios solo editan su propio perfil" on public.perfiles;
create policy "Los usuarios solo editan su propio perfil" on public.perfiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);


-- ---------- 6. Sanción Inmediata a Cuentas que Inyectaron Supervisor ----------
-- Localiza a cualquier usuario que tenga 'supervisor' en su user_metadata sin ser supervisor real,
-- y congela sus puntos en 0 marcándolo en la tabla de tramposos.
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
   and not coalesce((u.raw_app_meta_data ->> 'supervisor')::boolean, false);


-- ---------- 7. Consultar la Tabla de Tramposos ----------
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
  order by p.creado_en desc
  limit least(greatest(coalesce(p_limite, 50), 1), 100);
$$;

-- Compatibilidad con llamadas a payasos_sustometro
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
  select * from public.tramposos_sustometro(p_limite);
$$;

revoke all on function public.tramposos_sustometro(int) from public;
revoke all on function public.payasos_sustometro(int) from public;

grant execute on function public.tramposos_sustometro(int) to anon, authenticated;
grant execute on function public.payasos_sustometro(int) to anon, authenticated;
