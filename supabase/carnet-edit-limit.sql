-- =============================================
-- LIMIT CARNET EDITS TO 2 TIMES PER DAY
-- Run once in Supabase → SQL Editor. Idempotent.
--
-- Enforces a maximum of 2 manual carnet edits per user per day (Colombia timezone UTC-5).
-- Supervisors have no limit.
-- Optional p_contar_edicion (default true): allows internal background syncs (e.g. title unlocks)
-- to update without consuming the user's 2 daily manual edits.
-- =============================================

alter table public.perfiles add column if not exists ediciones_hoy integer default 0;
alter table public.perfiles add column if not exists ultima_edicion timestamptz default now();

create or replace function public.actualizar_perfil(
  nuevo_nombre text,
  nuevo_monstruo jsonb,
  p_contar_edicion boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid          uuid := auth.uid();
  v_hoy          date := (now() at time zone 'America/Bogota')::date;
  v_ultima       timestamptz;
  v_ediciones    integer;
  v_es_admin     boolean := false;
begin
  if v_uid is null then
    raise exception 'Debes iniciar sesión';
  end if;
  if nuevo_nombre is null or length(btrim(nuevo_nombre)) = 0 then
    raise exception 'El nombre no puede estar vacío';
  end if;

  -- Check if caller is supervisor (by app_metadata or supervisor title)
  if es_supervisor() or exists (
    select 1 from auth.users
    where id = v_uid and (
      (raw_app_meta_data ->> 'supervisor')::boolean is true
      or (raw_user_meta_data -> 'titulos')::jsonb ? 'supervisor'
      or raw_user_meta_data ->> 'titulo' = 'supervisor'
    )
  ) then
    v_es_admin := true;
  end if;

  select ultima_edicion, coalesce(ediciones_hoy, 0)
    into v_ultima, v_ediciones
    from public.perfiles
   where id = v_uid
   for update;

  if p_contar_edicion and not v_es_admin then
    if v_ultima is not null and (v_ultima at time zone 'America/Bogota')::date = v_hoy then
      if v_ediciones >= 2 then
        raise exception 'Límite de ediciones alcanzado: solo puedes editar tu carnet 2 veces al día.';
      end if;
      v_ediciones := v_ediciones + 1;
    else
      v_ediciones := 1;
    end if;
  end if;

  update public.perfiles
     set nombre = left(btrim(nuevo_nombre), 28),
         monstruo = nuevo_monstruo,
         ediciones_hoy = case when p_contar_edicion then v_ediciones else ediciones_hoy end,
         ultima_edicion = case when p_contar_edicion then now() else ultima_edicion end
   where id = v_uid;
end;
$$;

revoke all on function public.actualizar_perfil(text, jsonb, boolean) from public, anon;
grant execute on function public.actualizar_perfil(text, jsonb, boolean) to authenticated;
