-- Cierra todas las inscripciones menos la del torneo de fútbol (19 nov).
-- Equipos, integrantes, inscripciones individuales, pre-inscripciones a conferencias y la lista
-- de "buscando equipo" dejan de aceptar filas nuevas. Un supervisor (es_supervisor()) sí puede
-- seguir agregando gente, por ejemplo asistentes de una conferencia.
-- Va en un trigger para no reescribir las funciones que ya están en producción.
-- La misma lista vive en REGISTRATION_OPEN (js/data.js): cambia las dos juntas.
-- Para reabrir todo: drop function public.inscripcion_cerrada() cascade;

create or replace function public.inscripcion_cerrada()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.actividad not in ('futbol') and not public.es_supervisor() then
    raise exception 'Las inscripciones para esta actividad ya cerraron';
  end if;
  return new;
end;
$$;

drop trigger if exists inscripcion_cerrada on public.equipos;
create trigger inscripcion_cerrada before insert on public.equipos
  for each row execute function public.inscripcion_cerrada();

drop trigger if exists inscripcion_cerrada on public.miembros_equipo;
create trigger inscripcion_cerrada before insert on public.miembros_equipo
  for each row execute function public.inscripcion_cerrada();

drop trigger if exists inscripcion_cerrada on public.inscripciones_individuales;
create trigger inscripcion_cerrada before insert on public.inscripciones_individuales
  for each row execute function public.inscripcion_cerrada();

drop trigger if exists inscripcion_cerrada on public.preinscripciones_conferencia;
create trigger inscripcion_cerrada before insert on public.preinscripciones_conferencia
  for each row execute function public.inscripcion_cerrada();

drop trigger if exists inscripcion_cerrada on public.buscando_equipo;
create trigger inscripcion_cerrada before insert on public.buscando_equipo
  for each row execute function public.inscripcion_cerrada();
