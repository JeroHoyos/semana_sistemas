-- =============================================
-- SEMANA DE SISTEMAS: RESTAURAR ADMINISTRADORES
-- Ejecutar en Supabase → SQL Editor para desbanear de inmediato a los admins
-- y otorgarles su rol oficial de Supervisor en app_metadata.
-- =============================================

-- 1. Asignar rol oficial de Supervisor en app_metadata
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

-- 2. Limpiar flag es_payaso y remover sanción de la tabla perfiles
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

-- 3. Blindar es_payaso_perfil para que NUNCA afecte a los admins en el ranking
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
