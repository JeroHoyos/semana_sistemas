-- ================================================================
-- AGREGAR ADMINISTRADORA: LUZARAIT CAÑAS QUINTERO (lcanasq@unal.edu.co)
-- Ejecutar en Supabase → SQL Editor → Run. Idempotente y seguro.
--
-- 1. Asigna rol oficial de Supervisor en auth.users (app_metadata.supervisor = true).
-- 2. Desbloquea y activa el título 'supervisor' (Supervisora de Sustos) en su metadata y perfil.
-- 3. Limpia cualquier flag de sanción (es_payaso = false, remueve tramposo del monstruo).
-- 4. Actualiza la función es_payaso_perfil para blindarla permanentemente.
-- ================================================================

-- 1. Asignar rol Supervisor en auth.users (si la cuenta ya está creada)
update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"supervisor": true}'::jsonb,
       raw_user_meta_data = jsonb_set(
         jsonb_set(
           coalesce(raw_user_meta_data, '{}'::jsonb),
           '{titulo}',
           '"supervisor"'::jsonb
         ),
         '{titulos}',
         case
           when raw_user_meta_data->'titulos' is not null and (raw_user_meta_data->'titulos')::jsonb ? 'supervisor'
             then raw_user_meta_data->'titulos'
           when raw_user_meta_data->'titulos' is not null
             then (raw_user_meta_data->'titulos')::jsonb || '["supervisor"]'::jsonb
           else '["asustador", "supervisor"]'::jsonb
         end
       )
 where lower(email) in ('lcanasq@unal.edu.co')
    or split_part(lower(email), '@', 1) in ('lcanasq')
    or lower(coalesce(raw_user_meta_data->>'full_name', '')) like '%luzarait%'
    or lower(coalesce(raw_user_meta_data->>'name', '')) like '%luzarait%';

-- 2. Desbloquear título de Supervisora y asegurar 0 sanciones en public.perfiles
update public.perfiles
   set es_payaso = false,
       monstruo = jsonb_set(
         jsonb_set(
           (coalesce(monstruo, '{}'::jsonb) - 'es_payaso' - 'tramposo'),
           '{titulo}',
           '"supervisor"'::jsonb
         ),
         '{titulos}',
         case
           when monstruo->'titulos' is not null and (monstruo->'titulos')::jsonb ? 'supervisor'
             then monstruo->'titulos'
           when monstruo->'titulos' is not null
             then (monstruo->'titulos')::jsonb || '["supervisor"]'::jsonb
           else '["asustador", "supervisor"]'::jsonb
         end
       )
 where lower(correo) in ('lcanasq@unal.edu.co')
    or split_part(lower(correo), '@', 1) in ('lcanasq')
    or lower(nombre) like '%luzarait%';

-- 3. Blindaje permanente: Administradores oficiales NUNCA son payasos
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
    -- Administradores oficiales legítimos NUNCA son payasos
    when lower(coalesce(p_correo, '')) in (
      'saescobara@unal.edu.co',
      'linavarrop@unal.edu.co',
      'jhoyosbo@unal.edu.co',
      'carangosi@unal.edu.co',
      'carangosl@unal.edu.co',
      'lcanasq@unal.edu.co'
    ) then false
    when split_part(lower(coalesce(p_correo, '')), '@', 1) in (
      'saescobara', 'linavarrop', 'jhoyosbo', 'carangosi', 'carangosl', 'juperezl', 'lcanasq'
    ) then false
    when lower(coalesce(p_nombre, '')) like any (array[
      '%santiago escobar%',
      '%libardo navarro%',
      '%jeronimo hoyos%',
      '%catalina arango%',
      '%juan david perez%',
      '%luzarait%'
    ]) then false
    -- Estudiante legítimo José Miguel García Vélez (@josgarciave)
    when lower(coalesce(p_correo, '')) like '%josgarciave%'
      or split_part(lower(coalesce(p_correo, '')), '@', 1) = 'josgarciave'
      or lower(coalesce(p_nombre, '')) like '%jos%miguel%garc%a%' then false
    else (
      coalesce(p_es_payaso, false)
      or coalesce((p_monstruo->>'es_payaso' in ('true', 't', '1')), false)
      or lower(coalesce(p_nombre, '')) like any (array['%armarina%', '%argenis%', '%largo%', '%01101100%', '%01101001%'])
      or lower(coalesce(p_correo, '')) like any (array['%armarina%', '%argenis%', '%largo%', '%01101100%', '%01101001%'])
    )
  end;
$$;

-- 4. Verificación de estado de la cuenta
select id, email, raw_app_meta_data->>'supervisor' as es_supervisor, raw_user_meta_data->>'titulo' as titulo
  from auth.users
 where lower(email) like '%lcanasq%' or split_part(lower(email), '@', 1) = 'lcanasq';
