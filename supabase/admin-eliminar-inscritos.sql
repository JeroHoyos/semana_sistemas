-- =============================================
-- ADMINISTRACIÓN: ELIMINAR INSCRITOS (solo supervisores)
-- Se pega una vez en Supabase → SQL Editor → Run. Idempotente.
--
-- Da a los supervisores (saescobara y demás administradores, marcados con app_metadata.supervisor)
-- el poder de:
--   1. Quitar a CUALQUIER integrante de CUALQUIER equipo (incluso al capitán, sin disolver el equipo).
--   2. Eliminar a CUALQUIER participante inscrito en una competencia individual.
--   3. Eliminar la pre-inscripción de CUALQUIER persona en una conferencia.
--
-- La verificación real es es_supervisor() (lee app_metadata.supervisor, puesto a mano con SQL):
-- los botones en el navegador solo muestran la opción, la base de datos es la que decide.
--
-- Requiere que ya se hayan corrido:
--   supabase/teams.sql, supabase/individual-registrations.sql,
--   supabase/preinscripciones-conferencias.sql y supabase/weekly-game.sql (es_supervisor()).
-- =============================================

-- ---------- 0. es_supervisor() ESTRICTO: solo app_metadata.supervisor ----------
-- Punto de seguridad clave: la verificación de supervisor se basa ÚNICAMENTE en
-- app_metadata.supervisor, un campo que solo se puede poner a mano con SQL en Supabase y que el
-- navegador NO puede falsificar. No confía en el título 'Supervisor de Sustos' (vive en
-- user_metadata, editable desde la consola del navegador) ni en el nombre o correo de la cuenta.
-- Así, aunque alguien se ponga de nombre "Santiago Escobar" o se autoasigne el título, estas
-- funciones de borrado y de puntos lo rechazan. Esta definición reemplaza cualquier versión previa
-- que tuviera un fallback por correo/nombre (p. ej. la de supabase/seguridad-tramposos.sql):
-- córrela DESPUÉS de las demás para que quede esta.
create or replace function public.es_supervisor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select (raw_app_meta_data ->> 'supervisor')::boolean from auth.users where id = auth.uid()),
    false
  );
$$;

revoke all on function public.es_supervisor() from public, anon;
grant execute on function public.es_supervisor() to authenticated;

-- ---------- 1. Supervisor: quitar a cualquier integrante de cualquier equipo ----------
-- A diferencia de quitar_miembro (solo el capitán o uno mismo), esta la usa un administrador.
-- Si se quita al capitán y el equipo queda sin integrantes, el equipo se disuelve.
-- Si se quita al capitán y aún quedan integrantes, el más antiguo pasa a ser el nuevo capitán.
create or replace function public.admin_quitar_miembro(p_equipo uuid, p_usuario uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capitan uuid;
  v_restantes integer;
  v_nuevo_capitan uuid;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;
  if not public.es_supervisor() then
    raise exception 'Seguridad: Acceso denegado. Solo un Supervisor de Sustos puede eliminar integrantes de cualquier equipo.';
  end if;

  select capitan_id into v_capitan from public.equipos where id = p_equipo;
  if v_capitan is null then
    raise exception 'Ese equipo ya no existe';
  end if;

  delete from public.miembros_equipo where equipo_id = p_equipo and usuario_id = p_usuario;
  if not found then
    raise exception 'Esa persona no está en el equipo';
  end if;

  -- Si se quitó al capitán, reasignar o disolver
  if p_usuario = v_capitan then
    select count(*) into v_restantes from public.miembros_equipo where equipo_id = p_equipo;
    if v_restantes = 0 then
      delete from public.equipos where id = p_equipo;
    else
      select usuario_id into v_nuevo_capitan
        from public.miembros_equipo
       where equipo_id = p_equipo
       order by unido_en asc
       limit 1;
      update public.equipos set capitan_id = v_nuevo_capitan where id = p_equipo;
    end if;
  end if;
end;
$$;


-- ---------- 2. Supervisor: disolver cualquier equipo ----------
create or replace function public.admin_eliminar_equipo(p_equipo uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;
  if not public.es_supervisor() then
    raise exception 'Seguridad: Acceso denegado. Solo un Supervisor de Sustos puede disolver cualquier equipo.';
  end if;

  delete from public.equipos where id = p_equipo;
  if not found then
    raise exception 'Ese equipo ya no existe';
  end if;
end;
$$;


-- ---------- 3. Supervisor: eliminar a cualquier participante de una competencia individual ----------
create or replace function public.admin_eliminar_inscripcion_individual(p_actividad text, p_usuario uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;
  if not public.es_supervisor() then
    raise exception 'Seguridad: Acceso denegado. Solo un Supervisor de Sustos puede eliminar participantes.';
  end if;

  delete from public.inscripciones_individuales
   where actividad = p_actividad and usuario_id = p_usuario;
  if not found then
    raise exception 'Esa persona no está inscrita en esta competencia';
  end if;
end;
$$;


-- ---------- 4. Supervisor: eliminar la pre-inscripción de cualquier persona en una conferencia ----------
-- Si la persona ya tenía puntos otorgados por asistencia, se los descuenta antes de eliminar.
create or replace function public.admin_eliminar_preinscripcion_conferencia(p_actividad text, p_usuario uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_otorgados integer;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;
  if not public.es_supervisor() then
    raise exception 'Seguridad: Acceso denegado. Solo un Supervisor de Sustos puede eliminar pre-inscripciones.';
  end if;

  select puntos_otorgados into v_otorgados
    from public.preinscripciones_conferencia
   where actividad = p_actividad and usuario_id = p_usuario;
  if not found then
    raise exception 'Esa persona no está pre-inscrita a esta conferencia';
  end if;

  if coalesce(v_otorgados, 0) > 0 then
    update public.perfiles
       set puntos = greatest(0, coalesce(puntos, 0) - v_otorgados)
     where id = p_usuario;
  end if;

  delete from public.preinscripciones_conferencia
   where actividad = p_actividad and usuario_id = p_usuario;
end;
$$;


-- ---------- Permisos ----------
revoke all on function public.admin_quitar_miembro(uuid, uuid) from public, anon;
revoke all on function public.admin_eliminar_equipo(uuid) from public, anon;
revoke all on function public.admin_eliminar_inscripcion_individual(text, uuid) from public, anon;
revoke all on function public.admin_eliminar_preinscripcion_conferencia(text, uuid) from public, anon;

grant execute on function public.admin_quitar_miembro(uuid, uuid) to authenticated;
grant execute on function public.admin_eliminar_equipo(uuid) to authenticated;
grant execute on function public.admin_eliminar_inscripcion_individual(text, uuid) to authenticated;
grant execute on function public.admin_eliminar_preinscripcion_conferencia(text, uuid) to authenticated;
