-- =============================================
-- COUNT TITLE REDEMPTIONS
-- Run once in Supabase → SQL Editor.
--
-- Counts how many profiles have redeemed a limited title, checking both
-- the active title (monstruo.titulo) and unlocked collection (monstruo.titulos),
-- without downloading the monster payload of all profiles to the browser.
-- =============================================

create or replace function public.contar_canjes(p_titulo text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
    from public.perfiles
   where (
     (monstruo::jsonb ->> 'titulo') = p_titulo
     or (
       jsonb_typeof(monstruo::jsonb -> 'titulos') = 'array'
       and (monstruo::jsonb -> 'titulos') ? p_titulo
     )
   );
$$;

revoke all on function public.contar_canjes(text) from public;
grant execute on function public.contar_canjes(text) to anon, authenticated;
