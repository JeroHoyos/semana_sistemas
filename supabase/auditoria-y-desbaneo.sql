-- =============================================
-- SEMANA DE SISTEMAS: AUDITORÍA DE SUPERVISORES, ACELERACIÓN Y DESBANEO
-- Ejecutar en Supabase → SQL Editor. Idempotente y de ejecución rápida.
--
-- 1. Desbanea a José Miguel García Vélez (@josgarciave) y le asigna sus 5 puntos reales.
-- 2. Asegura rol de Supervisor y limpia cualquier sanción de los administradores oficiales.
-- 3. Crea índices de alto rendimiento en perfiles para que Sustómetro y Tramposos carguen al instante.
-- 4. Blindaje en es_payaso_perfil y tramposos_sustometro (supervisores y José Miguel nunca son payasos).
-- 5. Crea la tabla 'auditoria_puntos' con RLS para registrar qué admin cambió qué puntos y por qué.
-- 6. Actualiza 'modificar_puntos' para registrar cada acción en auditoría y desmarcar flags si un admin asigna puntos.
-- 7. Crea 'listar_auditoria_puntos' para que los supervisores consulten el registro de auditoría.
-- =============================================

-- ---------- 1. Restaurar a José Miguel García Vélez ----------
update public.perfiles
   set es_payaso = false,
       puntos = 5,
       monstruo = (coalesce(monstruo, '{}'::jsonb) - 'es_payaso' - 'tramposo')
 where lower(correo) like '%josgarciave%'
    or split_part(lower(correo), '@', 1) = 'josgarciave'
    or lower(nombre) like '%jos%miguel%garc%a%';

update auth.users
   set raw_user_meta_data = (coalesce(raw_user_meta_data, '{}'::jsonb) - 'es_payaso' - 'tramposo')
 where lower(email) like '%josgarciave%'
    or split_part(lower(email), '@', 1) = 'josgarciave'
    or lower(raw_user_meta_data->>'full_name') like '%jos%miguel%garc%a%';


-- ---------- 2. Restaurar Administradores Oficiales ----------
update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"supervisor": true}'::jsonb
 where lower(email) in (
   'saescobara@unal.edu.co',
   'linavarrop@unal.edu.co',
   'jhoyosbo@unal.edu.co',
   'carangosi@unal.edu.co',
   'carangosl@unal.edu.co',
   'lcanasq@unal.edu.co'
 )
 or split_part(lower(email), '@', 1) in ('saescobara', 'linavarrop', 'jhoyosbo', 'carangosi', 'carangosl', 'juperezl', 'lcanasq')
 or lower(raw_user_meta_data->>'full_name') like '%juan david perez%'
 or lower(raw_user_meta_data->>'name') like '%juan david perez%'
 or lower(raw_user_meta_data->>'full_name') like '%luzarait%'
 or lower(raw_user_meta_data->>'name') like '%luzarait%';

update public.perfiles
   set es_payaso = false,
       monstruo = (coalesce(monstruo, '{}'::jsonb) - 'es_payaso' - 'tramposo')
 where lower(correo) in (
   'saescobara@unal.edu.co',
   'linavarrop@unal.edu.co',
   'jhoyosbo@unal.edu.co',
   'carangosi@unal.edu.co',
   'carangosl@unal.edu.co',
   'lcanasq@unal.edu.co'
 )
 or split_part(lower(correo), '@', 1) in ('saescobara', 'linavarrop', 'jhoyosbo', 'carangosi', 'carangosl', 'juperezl', 'lcanasq')
 or lower(nombre) like '%juan david perez%'
 or lower(nombre) like '%santiago escobar%'
 or lower(nombre) like '%libardo navarro%'
 or lower(nombre) like '%jeronimo hoyos%'
 or lower(nombre) like '%catalina arango%'
 or lower(nombre) like '%luzarait%';


-- ---------- 3. Índices de Alto Rendimiento (Aceleración de Consultas) ----------
create index if not exists idx_perfiles_es_payaso on public.perfiles (es_payaso);
create index if not exists idx_perfiles_puntos on public.perfiles (puntos desc);
create index if not exists idx_perfiles_correo on public.perfiles (lower(correo));
create index if not exists idx_perfiles_creado_en on public.perfiles (creado_en desc);


-- ---------- 4. Filtro Blindado: Supervisores y José Miguel NUNCA son Payasos ----------
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
    -- Administradores legítimos NUNCA son payasos ni tramposos
    when lower(coalesce(p_correo, '')) in ('saescobara@unal.edu.co', 'linavarrop@unal.edu.co', 'jhoyosbo@unal.edu.co', 'carangosi@unal.edu.co', 'carangosl@unal.edu.co', 'lcanasq@unal.edu.co') then false
    when split_part(lower(coalesce(p_correo, '')), '@', 1) in ('saescobara', 'linavarrop', 'jhoyosbo', 'carangosi', 'carangosl', 'juperezl', 'lcanasq') then false
    when lower(coalesce(p_nombre, '')) like any (array['%santiago escobar%', '%libardo navarro%', '%jeronimo hoyos%', '%catalina arango%', '%juan david perez%', '%luzarait%']) then false
    -- Estudiante legítimo José Miguel García Vélez (@josgarciave) NUNCA es payaso
    when lower(coalesce(p_correo, '')) like '%josgarciave%' or split_part(lower(coalesce(p_correo, '')), '@', 1) = 'josgarciave' or lower(coalesce(p_nombre, '')) like '%jos%miguel%garc%a%' then false
    else (
      coalesce(p_es_payaso, false)
      or coalesce((p_monstruo->>'es_payaso' in ('true', 't', '1')), false)
      or lower(coalesce(p_nombre, '')) like any (array['%armarina%', '%argenis%', '%largo%', '%01101100%', '%01101001%'])
      or lower(coalesce(p_correo, '')) like any (array['%armarina%', '%argenis%', '%largo%', '%01101100%', '%01101001%'])
    )
  end;
$$;


-- ---------- 5. Consulta Rápida de la Tabla de Tramposos ----------
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
        then 'Charles Larg0'
      when p.nombre ilike '%argenis%' or p.nombre ilike '%marin%' or p.correo ilike '%armarin%'
        then 'Argy M4rín'
      else coalesce(nullif(trim(p.nombre::text), ''), 'Asustador Sancionado')
    end as nombre,
    case
      when p.nombre ilike '%0110%' or p.nombre ilike '%largo%' or p.correo ilike '%0110%' or p.correo ilike '%largo%'
        then 'charles.larg0'
      when p.nombre ilike '%argenis%' or p.nombre ilike '%marin%' or p.correo ilike '%armarin%'
        then 'armar1n'
      else 'tramposo'
    end as usuario,
    (p.monstruo::jsonb - 'titulos') as monstruo,
    0::integer as puntos,
    p.creado_en
  from public.perfiles p
  where public.es_payaso_perfil(p.nombre, p.correo, p.es_payaso, p.monstruo)
    and not (
      lower(coalesce(p.correo, '')) in ('saescobara@unal.edu.co', 'linavarrop@unal.edu.co', 'jhoyosbo@unal.edu.co', 'carangosi@unal.edu.co', 'carangosl@unal.edu.co', 'lcanasq@unal.edu.co')
      or split_part(lower(coalesce(p.correo, '')), '@', 1) in ('saescobara', 'linavarrop', 'jhoyosbo', 'carangosi', 'carangosl', 'juperezl', 'lcanasq')
      or lower(coalesce(p.nombre, '')) like any (array['%santiago escobar%', '%libardo navarro%', '%jeronimo hoyos%', '%catalina arango%', '%juan david perez%', '%luzarait%'])
      or lower(coalesce(p.correo, '')) like '%josgarciave%'
      or split_part(lower(coalesce(p.correo, '')), '@', 1) = 'josgarciave'
      or lower(coalesce(p.nombre, '')) like '%jos%miguel%garc%a%'
    )
  order by p.creado_en desc
  limit least(greatest(coalesce(p_limite, 50), 1), 100);
$$;

create or replace function public.payasos_sustometro(p_limite int default 50)
returns table (
  id uuid, nombre text, usuario text, monstruo jsonb, puntos integer, creado_en timestamptz
)
language sql stable security definer set search_path = public
as $$ select * from public.tramposos_sustometro(p_limite); $$;

revoke all on function public.tramposos_sustometro(int) from public;
revoke all on function public.payasos_sustometro(int) from public;
grant execute on function public.tramposos_sustometro(int) to anon, authenticated;
grant execute on function public.payasos_sustometro(int) to anon, authenticated;


-- ---------- 6. Tabla de Auditoría de Puntos ----------
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

drop policy if exists "Supervisores leen auditoria" on public.auditoria_puntos;
create policy "Supervisores leen auditoria" on public.auditoria_puntos
  for select to authenticated
  using (public.es_supervisor());


-- ---------- 7. Modificar Puntos con Registro de Auditoría y Limpieza de Flags ----------
drop function if exists public.modificar_puntos(uuid, integer);
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
    -- Intento no autorizado: sancionar
    update public.perfiles
       set es_payaso = true,
           puntos = 0,
           monstruo = jsonb_set(coalesce(monstruo, '{}'::jsonb), '{es_payaso}', 'true'::jsonb)
     where id = v_caller;

    raise exception 'Seguridad: Acceso denegado. No tienes permisos de Supervisor.';
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

  -- Aplicar el cambio de puntos y desmarcar sanción si no es atacante de la lista negra
  update public.perfiles
     set puntos = v_pts_nuevos,
         es_payaso = case
           when v_pts_nuevos > 0 and not (
             lower(coalesce(nombre, '')) like any (array['%armarina%', '%argenis%', '%largo%', '%01101100%', '%01101001%'])
             or lower(coalesce(correo, '')) like any (array['%armarina%', '%argenis%', '%largo%', '%01101100%', '%01101001%'])
           ) then false
           else es_payaso
         end,
         monstruo = case
           when v_pts_nuevos > 0 and not (
             lower(coalesce(nombre, '')) like any (array['%armarina%', '%argenis%', '%largo%', '%01101100%', '%01101001%'])
             or lower(coalesce(correo, '')) like any (array['%armarina%', '%argenis%', '%largo%', '%01101100%', '%01101001%'])
           ) then (monstruo - 'es_payaso' - 'tramposo')
           else monstruo
         end
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


-- ---------- 8. Función para Consultar el Historial de Auditoría ----------
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


-- ---------- 9. Registrar evento inicial de corrección de José Miguel ----------
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
where lower(p.correo) like '%josgarciave%'
   or split_part(lower(p.correo), '@', 1) = 'josgarciave'
   or lower(p.nombre) like '%jos%miguel%garc%a%';
