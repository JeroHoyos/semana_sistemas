-- =============================================
-- SEMANA DE SISTEMAS: AUDITORÍA DE SUPERVISORES Y RESTAURACIÓN
-- Ejecutar en Supabase → SQL Editor. Idempotente.
--
-- 1. Desbanea a José Miguel García Vélez (@josgarciave) y le asigna sus 5 puntos reales.
-- 2. Asegura rol de Supervisor y limpia cualquier sanción previa de los administradores.
-- 3. Crea la tabla 'auditoria_puntos' con RLS para registrar qué admin cambió qué puntos y por qué.
-- 4. Modifica 'modificar_puntos' para registrar cada acción en la tabla de auditoría.
-- 5. Crea la función 'listar_auditoria_puntos' para que los admins consulten el historial.
-- =============================================

-- ---------- 1. Restaurar a José Miguel García Vélez ----------
update public.perfiles
   set es_payaso = false,
       puntos = 5,
       monstruo = monstruo - 'es_payaso' - 'tramposo'
 where lower(correo) = 'josgarciave@unal.edu.co'
    or split_part(lower(correo), '@', 1) = 'josgarciave'
    or lower(nombre) like '%jose miguel garcia%';


-- ---------- 2. Restaurar Administradores Oficiales ----------
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


-- ---------- 3. Tabla de Auditoría de Puntos ----------
create table if not exists public.auditoria_puntos (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  admin_id uuid not null references auth.users(id) on delete cascade,
  admin_nombre text,
  admin_usuario text,
  target_id uuid not null references public.perfiles(id) on delete cascade,
  target_nombre text,
  target_usuario text,
  puntos_anteriores integer not null default 0,
  puntos_nuevos integer not null default 0,
  diferencia integer not null default 0,
  motivo text
);

alter table public.auditoria_puntos enable row level security;
revoke all on public.auditoria_puntos from public, anon;

-- Solo los supervisores pueden leer el historial de auditoría
drop policy if exists "Supervisores leen auditoria" on public.auditoria_puntos;
create policy "Supervisores leen auditoria" on public.auditoria_puntos
  for select to authenticated
  using (public.es_supervisor());


-- ---------- 4. Modificar Puntos con Registro de Auditoría ----------
create or replace function public.modificar_puntos(
  target_id uuid,
  nuevos_puntos integer,
  p_motivo text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_pts_ant integer := 0;
  v_pts_nuevos integer := greatest(0, coalesce(nuevos_puntos, 0));
  v_admin_nom text;
  v_admin_usr text;
  v_target_nom text;
  v_target_usr text;
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

  -- Obtener información previa del target
  select coalesce(puntos, 0), coalesce(nombre, 'Estudiante UNAL'), split_part(coalesce(correo, ''), '@', 1)
    into v_pts_ant, v_target_nom, v_target_usr
    from public.perfiles
   where id = target_id;

  if not found then
    raise exception 'Perfil no encontrado';
  end if;

  -- Obtener datos del admin que ejecuta la modificación
  select coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', email),
         split_part(coalesce(email, ''), '@', 1)
    into v_admin_nom, v_admin_usr
    from auth.users
   where id = v_caller;

  -- Aplicar el cambio de puntos
  update public.perfiles
     set puntos = v_pts_nuevos
   where id = target_id;

  -- Registrar en la tabla de auditoría para supervisores
  insert into public.auditoria_puntos (
    admin_id, admin_nombre, admin_usuario,
    target_id, target_nombre, target_usuario,
    puntos_anteriores, puntos_nuevos, diferencia, motivo
  ) values (
    v_caller, coalesce(v_admin_nom, 'Supervisor'), coalesce(v_admin_usr, 'admin'),
    target_id, v_target_nom, v_target_usr,
    v_pts_ant, v_pts_nuevos, (v_pts_nuevos - v_pts_ant),
    nullif(trim(p_motivo), '')
  );
end;
$$;

revoke all on function public.modificar_puntos(uuid, integer, text) from public, anon;
grant execute on function public.modificar_puntos(uuid, integer, text) to authenticated;


-- ---------- 5. Función para Consultar el Historial de Cambios ----------
create or replace function public.listar_auditoria_puntos(p_limite int default 50)
returns table (
  id uuid,
  creado_en timestamptz,
  admin_nombre text,
  admin_usuario text,
  target_nombre text,
  target_usuario text,
  puntos_anteriores integer,
  puntos_nuevos integer,
  diferencia integer,
  motivo text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id,
    a.creado_en,
    a.admin_nombre,
    a.admin_usuario,
    a.target_nombre,
    a.target_usuario,
    a.puntos_anteriores,
    a.puntos_nuevos,
    a.diferencia,
    a.motivo
  from public.auditoria_puntos a
  where public.es_supervisor()
  order by a.creado_en desc
  limit least(greatest(coalesce(p_limite, 50), 1), 200);
$$;

revoke all on function public.listar_auditoria_puntos(int) from public, anon;
grant execute on function public.listar_auditoria_puntos(int) to authenticated;


-- ---------- 6. Registrar evento inicial de corrección de José Miguel ----------
insert into public.auditoria_puntos (
  admin_id, admin_nombre, admin_usuario,
  target_id, target_nombre, target_usuario,
  puntos_anteriores, puntos_nuevos, diferencia, motivo
)
select
  u.id, 'Equipo Administrador', 'admin',
  p.id, p.nombre, split_part(p.correo, '@', 1),
  999, 5, -994,
  'Corrección de puntos y levantamiento de sanción por solicitud de organizadores'
from public.perfiles p
cross join (
  select id from auth.users
   where (raw_app_meta_data->>'supervisor')::boolean is true
      or lower(email) in ('saescobara@unal.edu.co', 'linavarrop@unal.edu.co')
   limit 1
) u
where lower(p.correo) = 'josgarciave@unal.edu.co'
   or split_part(lower(p.correo), '@', 1) = 'josgarciave'
   or lower(p.nombre) like '%jose miguel garcia%';
