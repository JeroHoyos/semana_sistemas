-- =============================================
-- ACTUALIZAR EL PERFIL DESDE "EDITAR CARNET"
-- Se pega una sola vez en Supabase → SQL Editor → Run.
--
-- Por qué existe: la tabla del Sustómetro (sustometro.js) lee de la tabla `perfiles`, pero el carnet
-- editado se guarda en la cuenta (auth.users.raw_user_meta_data). Sin esto, la persona cambia su
-- nombre o su monstruo y el Sustómetro sigue mostrando los anteriores.
--
-- Por qué es una función y no una política de UPDATE sobre `perfiles`: una política dejaría a cada persona
-- editar también su columna `puntos` desde la consola del navegador. Esta función solo toca `nombre` y
-- `monstruo`, y solo en la fila de quien la llama.
--
-- SUPUESTOS (revísalos contra tu tabla antes de correrla; no se pudo probar contra tu base de datos):
--   · `perfiles.id` es el mismo uuid que `auth.users.id`.
--   · `perfiles.nombre` es texto y `perfiles.monstruo` es json o jsonb.
-- =============================================

create or replace function public.actualizar_perfil(nuevo_nombre text, nuevo_monstruo jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;
  if nuevo_nombre is null or length(btrim(nuevo_nombre)) = 0 then
    raise exception 'El nombre no puede estar vacío';
  end if;

  update public.perfiles
     set nombre = left(btrim(nuevo_nombre), 28),   -- el mismo máximo que el campo del carnet
         monstruo = nuevo_monstruo
   where id = auth.uid();
end;
$$;

-- Solo personas con sesión iniciada pueden llamarla
revoke all on function public.actualizar_perfil(text, jsonb) from public;
revoke all on function public.actualizar_perfil(text, jsonb) from anon;
grant execute on function public.actualizar_perfil(text, jsonb) to authenticated;
