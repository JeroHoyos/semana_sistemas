-- =============================================
-- PRE-INSCRIPCIONES A CONFERENCIAS (evento.html?id=<conferencia>)
-- Se pega una vez en Supabase → SQL Editor → Run. Es idempotente: se puede volver a correr.
--
-- Cada conferencia (type: 'talk' en js/data.js) abre una pre-inscripción con cupos limitados
-- según la modalidad del espacio. El mismo cupo aparece en preRegister.max en js/data.js: cambia los dos.
--   'aula-maxima' → 100 cupos   (conferencias en el Aula Máxima)
--   'aula'        →  40 cupos   (conferencias en aulas/salones)
--   'virtual'     →  70 cupos   (conferencias virtuales)
--
-- GANCHO (marketing) que muestra la página:
--   • Te pre-inscribes Y asistes  → 10 puntos en el Sustómetro.
--   • Asistes sin pre-inscribirte →  8 puntos.
--   • Te pre-inscribes pero NO asistes → 0 puntos.
-- Premio: quienes MÁS puntos acumulen en el Sustómetro se llevan un peluche de Nacho (no es un sorteo).
--
-- La pre-inscripción solo reserva el cupo. La asistencia la confirma un supervisor el día del evento
-- con marcar_asistencia_conferencia, que suma los puntos correctos al perfil.
--
-- Nombres de tablas, columnas y funciones en español, como el resto de la base de datos.
-- La página nunca toca la tabla directamente: escribe por estas funciones (toman a la persona de su
-- sesión con auth.uid()) y lee con preinscritos_conferencia.
-- =============================================

-- ---------- Cupos por modalidad del espacio ----------
-- Cambia aquí y en preRegister.max de js/data.js si ajustas un cupo.
create or replace function public.cupos_conferencia(p_modalidad text)
returns integer
language sql
immutable
as $$
  select case p_modalidad
    when 'aula-maxima' then 100
    when 'aula'        then 40
    when 'virtual'     then 70
    else null
  end;
$$;


create table if not exists public.preinscripciones_conferencia (
  id         uuid        primary key default gen_random_uuid(),
  actividad  text        not null,                 -- id de la conferencia en js/data.js
  modalidad  text        not null check (modalidad in ('aula-maxima', 'aula', 'virtual')),
  usuario_id uuid        not null references auth.users (id) on delete cascade,
  asistio    boolean     not null default false,   -- lo marca un supervisor el día del evento
  puntos_otorgados integer not null default 0,     -- puntos ya sumados por asistencia (para no sumar dos veces)
  creado_en  timestamptz not null default now(),
  unique (actividad, usuario_id)
);

create index if not exists idx_preinscripciones_actividad on public.preinscripciones_conferencia (actividad);

-- RLS sin políticas: nadie lee ni escribe la tabla directamente; todo pasa por las funciones
alter table public.preinscripciones_conferencia enable row level security;
revoke all on public.preinscripciones_conferencia from anon, authenticated;


-- ---------- Pre-inscribirse a una conferencia ----------
-- p_modalidad llega desde js/data.js (preRegister.modalidad) y debe coincidir con una modalidad válida.
create or replace function public.preinscribirse_conferencia(
  p_actividad text,
  p_modalidad text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario uuid := auth.uid();
  v_cupos   integer := public.cupos_conferencia(p_modalidad);
  v_actual  integer;
begin
  if v_usuario is null then
    raise exception 'Inicia sesión con tu carnet para pre-inscribirte';
  end if;

  if coalesce(trim(p_actividad), '') = '' then
    raise exception 'Conferencia no válida';
  end if;

  if v_cupos is null then
    raise exception 'Esta conferencia no tiene pre-inscripción';
  end if;

  -- Bloqueo concurrente por conferencia para proteger el último cupo ante pre-inscripciones simultáneas
  perform pg_advisory_xact_lock(hashtext('preinscripcion:' || p_actividad));

  -- Si ya estaba pre-inscrito no cuenta como cupo nuevo
  select count(*) into v_actual
    from public.preinscripciones_conferencia
   where actividad = p_actividad
     and usuario_id <> v_usuario;

  if v_actual >= v_cupos then
    raise exception 'Ya se llenaron los % cupos de pre-inscripción para esta conferencia', v_cupos;
  end if;

  insert into public.preinscripciones_conferencia (actividad, modalidad, usuario_id)
  values (p_actividad, p_modalidad, v_usuario)
  on conflict (actividad, usuario_id) do nothing;
end;
$$;


-- ---------- Cancelar la pre-inscripción ----------
create or replace function public.cancelar_preinscripcion_conferencia(p_actividad text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario uuid := auth.uid();
begin
  if v_usuario is null then
    raise exception 'Inicia sesión para realizar esta acción';
  end if;

  -- No se puede cancelar una vez el supervisor marcó la asistencia (ya se otorgaron puntos)
  delete from public.preinscripciones_conferencia
   where actividad = p_actividad
     and usuario_id = v_usuario
     and asistio = false;
end;
$$;


-- ---------- Listar pre-inscritos a una conferencia ----------
-- Visible para supervisores (ven asistencia y pueden gestionar) y, para el resto, solo el conteo
-- importa; aquí se devuelve la lista con el monstruo y el @usuario (sin el correo institucional).
create or replace function public.preinscritos_conferencia(p_actividad text)
returns table (
  usuario_id uuid,
  nombre     text,
  usuario    text,
  monstruo   jsonb,
  asistio    boolean,
  creado_en  timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pi.usuario_id,
    coalesce(nullif(trim(p.nombre::text), ''), u.raw_user_meta_data ->> 'full_name', 'Asustador') as nombre,
    split_part(u.email, '@', 1) as usuario,
    (p.monstruo::jsonb - 'titulos') as monstruo,
    pi.asistio,
    pi.creado_en
  from public.preinscripciones_conferencia pi
  join auth.users u on u.id = pi.usuario_id
  left join public.perfiles p on p.id = pi.usuario_id
  where pi.actividad = p_actividad
  order by pi.creado_en asc;
$$;


-- ---------- Conteo de pre-inscritos (para la barra de cupos, sin exponer la lista a anónimos) ----------
create or replace function public.conteo_preinscritos_conferencia(p_actividad text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
    from public.preinscripciones_conferencia
   where actividad = p_actividad;
$$;


-- ---------- Supervisor: marcar/retirar la asistencia a una conferencia ----------
-- Al marcar asistencia (p_asistio = true) a quien SÍ se pre-inscribió, se le suman 10 puntos
-- en el Sustómetro (una sola vez). Si se desmarca, se le descuentan esos puntos otorgados.
-- Para quien asiste SIN pre-inscripción (8 puntos) usa la pre-inscripción manual del supervisor
-- (preinscribir_manual_conferencia) o modifica sus puntos directamente desde el Sustómetro.
create or replace function public.marcar_asistencia_conferencia(
  p_actividad text,
  p_usuario   uuid,
  p_asistio   boolean,
  p_puntos    integer default 10   -- 10 si se pre-inscribió y asistió; 8 si asistió sin pre-inscripción
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_otorgados integer;
  v_delta     integer;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;
  if not public.es_supervisor() then
    raise exception 'Seguridad: Acceso denegado. Solo un Supervisor de Sustos puede marcar asistencia.';
  end if;
  if p_puntos not in (8, 10) then
    raise exception 'Los puntos por asistencia deben ser 8 (sin pre-inscripción) o 10 (con pre-inscripción)';
  end if;

  select puntos_otorgados into v_otorgados
    from public.preinscripciones_conferencia
   where actividad = p_actividad and usuario_id = p_usuario
   for update;

  if not found then
    raise exception 'Esa persona no está pre-inscrita a esta conferencia';
  end if;

  if p_asistio then
    -- Otorgar la diferencia hasta p_puntos (si ya tenía otorgados, no los duplica)
    v_delta := greatest(0, p_puntos - coalesce(v_otorgados, 0));
    update public.preinscripciones_conferencia
       set asistio = true,
           puntos_otorgados = greatest(coalesce(puntos_otorgados, 0), p_puntos)
     where actividad = p_actividad and usuario_id = p_usuario;
  else
    -- Retirar la asistencia: descontar lo que se había otorgado
    v_delta := -coalesce(v_otorgados, 0);
    update public.preinscripciones_conferencia
       set asistio = false,
           puntos_otorgados = 0
     where actividad = p_actividad and usuario_id = p_usuario;
  end if;

  if v_delta <> 0 then
    update public.perfiles
       set puntos = greatest(0, coalesce(puntos, 0) + v_delta)
     where id = p_usuario
       and not public.es_payaso_perfil(nombre, correo, es_payaso, monstruo);
  end if;
end;
$$;


-- ---------- Supervisor: pre-inscribir manualmente a una persona por su correo ----------
-- Útil para quien llega el día del evento sin pre-inscribirse (asistencia de 8 puntos):
-- se crea su registro ya marcado como asistido con los puntos indicados (8 por defecto).
create or replace function public.preinscribir_manual_conferencia(
  p_actividad text,
  p_modalidad text,
  p_correo    text,
  p_asistio   boolean default true,
  p_puntos    integer default 8
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_destino uuid;
  v_cupos   integer := public.cupos_conferencia(p_modalidad);
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;
  if not public.es_supervisor() then
    raise exception 'Seguridad: Acceso denegado. Solo un Supervisor de Sustos puede inscribir manualmente.';
  end if;
  if v_cupos is null then
    raise exception 'Modalidad de conferencia no válida';
  end if;

  select id into v_destino from auth.users where lower(email) = lower(trim(coalesce(p_correo, '')));
  if v_destino is null then
    raise exception 'Nadie ha creado un carnet con ese correo. Pídele que cree su cuenta primero';
  end if;

  insert into public.preinscripciones_conferencia (actividad, modalidad, usuario_id)
  values (p_actividad, p_modalidad, v_destino)
  on conflict (actividad, usuario_id) do nothing;

  if p_asistio then
    perform public.marcar_asistencia_conferencia(p_actividad, v_destino, true, p_puntos);
  end if;
end;
$$;


-- ---------- Permisos ----------
revoke all on function public.cupos_conferencia(text) from public;
revoke all on function public.preinscribirse_conferencia(text, text) from public, anon;
revoke all on function public.cancelar_preinscripcion_conferencia(text) from public, anon;
revoke all on function public.preinscritos_conferencia(text) from public;
revoke all on function public.conteo_preinscritos_conferencia(text) from public;
revoke all on function public.marcar_asistencia_conferencia(text, uuid, boolean, integer) from public, anon;
revoke all on function public.preinscribir_manual_conferencia(text, text, text, boolean, integer) from public, anon;

grant execute on function public.cupos_conferencia(text) to anon, authenticated;
grant execute on function public.preinscribirse_conferencia(text, text) to authenticated;
grant execute on function public.cancelar_preinscripcion_conferencia(text) to authenticated;
grant execute on function public.preinscritos_conferencia(text) to anon, authenticated;
grant execute on function public.conteo_preinscritos_conferencia(text) to anon, authenticated;
grant execute on function public.marcar_asistencia_conferencia(text, uuid, boolean, integer) to authenticated;
grant execute on function public.preinscribir_manual_conferencia(text, text, text, boolean, integer) to authenticated;
