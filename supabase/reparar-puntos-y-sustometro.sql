-- =============================================
-- SEMANA DE SISTEMAS: CARGA DE PUESTO Y TABLAS (RECARGA / F5)
-- Ejecutar en Supabase → SQL Editor. Seguro e idempotente.
--
-- Actualiza 'mi_puesto_sustometro' para aceptar 'p_user_id' opcional.
-- Esto elimina cualquier problema al recargar la página (F5) donde
-- auth.uid() no alcanza a estar listo en el primer milisegundo.
-- =============================================

create or replace function public.mi_puesto_sustometro(p_user_id uuid default null)
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
  v_uid                  uuid := coalesce(p_user_id, auth.uid());
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

  -- Contar asustadores legítimos con más puntos (o igual puntaje y menor fecha)
  select count(*)
    into v_mas_altos
    from public.perfiles p
   where not public.es_payaso_perfil(p.nombre, p.correo, p.es_payaso, p.monstruo)
     and not (
       lower(coalesce(p.correo, '')) in ('saescobara@unal.edu.co', 'linavarrop@unal.edu.co', 'jhoyosbo@unal.edu.co', 'carangosi@unal.edu.co', 'carangosl@unal.edu.co')
       or split_part(lower(coalesce(p.correo, '')), '@', 1) in ('saescobara', 'linavarrop', 'jhoyosbo', 'carangosi', 'carangosl', 'juperezl')
       or lower(coalesce(p.nombre, '')) like any (array['%santiago escobar%', '%libardo navarro%', '%jeronimo hoyos%', '%catalina arango%', '%juan david perez%'])
     )
     and (
       coalesce(p.puntos, 0) > v_puntos
       or (coalesce(p.puntos, 0) = v_puntos and p.creado_en < v_creado)
     );

  posicion := v_mas_altos + 1;
  puntos   := v_puntos;

  select coalesce(max(p.puntos), 0)
    into v_max_puntos
    from public.perfiles p
   where not public.es_payaso_perfil(p.nombre, p.correo, p.es_payaso, p.monstruo)
     and not (
       lower(coalesce(p.correo, '')) in ('saescobara@unal.edu.co', 'linavarrop@unal.edu.co', 'jhoyosbo@unal.edu.co', 'carangosi@unal.edu.co', 'carangosl@unal.edu.co')
       or split_part(lower(coalesce(p.correo, '')), '@', 1) in ('saescobara', 'linavarrop', 'jhoyosbo', 'carangosi', 'carangosl', 'juperezl')
       or lower(coalesce(p.nombre, '')) like any (array['%santiago escobar%', '%libardo navarro%', '%jeronimo hoyos%', '%catalina arango%', '%juan david perez%'])
     );

  if v_puntos > 0 and v_max_puntos > 0 then
    select count(distinct p.puntos)
      into v_tiers_ahead
      from public.perfiles p
     where not public.es_payaso_perfil(p.nombre, p.correo, p.es_payaso, p.monstruo)
       and not (
         lower(coalesce(p.correo, '')) in ('saescobara@unal.edu.co', 'linavarrop@unal.edu.co', 'jhoyosbo@unal.edu.co', 'carangosi@unal.edu.co', 'carangosl@unal.edu.co')
         or split_part(lower(coalesce(p.correo, '')), '@', 1) in ('saescobara', 'linavarrop', 'jhoyosbo', 'carangosi', 'carangosl', 'juperezl')
         or lower(coalesce(p.nombre, '')) like any (array['%santiago escobar%', '%libardo navarro%', '%jeronimo hoyos%', '%catalina arango%', '%juan david perez%'])
       )
       and coalesce(p.puntos, 0) > v_puntos;

    select count(distinct p.puntos)
      into v_total_positive_tiers
      from public.perfiles p
     where not public.es_payaso_perfil(p.nombre, p.correo, p.es_payaso, p.monstruo)
       and not (
         lower(coalesce(p.correo, '')) in ('saescobara@unal.edu.co', 'linavarrop@unal.edu.co', 'jhoyosbo@unal.edu.co', 'carangosi@unal.edu.co', 'carangosl@unal.edu.co')
         or split_part(lower(coalesce(p.correo, '')), '@', 1) in ('saescobara', 'linavarrop', 'jhoyosbo', 'carangosi', 'carangosl', 'juperezl')
         or lower(coalesce(p.nombre, '')) like any (array['%santiago escobar%', '%libardo navarro%', '%jeronimo hoyos%', '%catalina arango%', '%juan david perez%'])
       )
       and coalesce(p.puntos, 0) > 0;

    puesto_medalla := v_tiers_ahead + 1;
    medalla := case
      when puesto_medalla = 1 then 'gold'
      when puesto_medalla = 2 and v_total_positive_tiers >= 2 then 'silver'
      when puesto_medalla = 3 and v_total_positive_tiers >= 3 then 'bronze'
      else null
    end;
  else
    puesto_medalla := null;
    medalla := null;
  end if;

  return next;
end;
$$;

-- Compatibilidad para llamadas existentes sin argumentos
create or replace function public.mi_puesto_sustometro()
returns table (
  posicion       integer,
  puntos         integer,
  puesto_medalla integer,
  medalla        text
)
language sql
stable
security definer
set search_path = public
as $$
  select * from public.mi_puesto_sustometro(auth.uid());
$$;

revoke all on function public.mi_puesto_sustometro(uuid) from public;
revoke all on function public.mi_puesto_sustometro() from public;
grant execute on function public.mi_puesto_sustometro(uuid) to anon, authenticated;
grant execute on function public.mi_puesto_sustometro() to anon, authenticated;
