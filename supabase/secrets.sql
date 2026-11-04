-- =============================================
-- SECRET CODES (js/secrets.js)
-- Run once in Supabase → SQL Editor. It is safe to run again.
--
-- Hidden challenges on the site. Only the first person who completes each one gets its code
-- (to send to the representative); whoever comes later learns that someone got there first:
--   'konami'        the Konami code on the Scare Meter console (d-pad and buttons)
--   'video-futbol'  the whole video on the football tournament page
--
-- The codes are NOT in this file (the repository is public). Insert them by hand, once:
--   insert into public.secretos (id, codigo, segundos) values
--     ('konami', 'EL CODIGO', 0),
--     ('video-futbol', 'EL OTRO CODIGO', 240);
-- segundos: the least time between starting the challenge and claiming it. The video lasts 4:13 (253 s);
-- 240 leaves room for the page's own checks. 0 = no minimum time.
-- To see who won:  select id, ganador, encontrado_en from public.secretos;
--
-- Table and function names stay in Spanish, like the rest of the database.
-- =============================================

create table if not exists public.secretos (
  id            text        primary key,
  codigo        text        not null,
  segundos      integer     not null default 0,
  ganador       uuid        references auth.users (id) on delete set null,
  encontrado_en timestamptz
);

-- When each person started a challenge that has a minimum time (the video)
create table if not exists public.secretos_inicio (
  secreto     text        not null references public.secretos (id) on delete cascade,
  usuario_id  uuid        not null references auth.users (id) on delete cascade,
  empezado_en timestamptz not null default now(),
  primary key (secreto, usuario_id)
);

-- Row level security with no policies: nobody reads the codes directly, only through the functions
alter table public.secretos enable row level security;
alter table public.secretos_inicio enable row level security;
revoke all on public.secretos, public.secretos_inicio from anon, authenticated;


-- ---------- Starting a challenge with a minimum time ----------
-- Only the first start counts: pausing or playing it again does not move it.
create or replace function public.empezar_secreto(p_secreto text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión para reclamar el secreto';
  end if;

  insert into secretos_inicio (secreto, usuario_id)
  select id, auth.uid() from secretos where id = p_secreto and segundos > 0
  on conflict do nothing;
end;
$$;


-- ---------- Claiming ----------
-- Returns { estado: 'primero', codigo } to the first person (again if they repeat it),
-- { estado: 'tarde' } to everyone else and { estado: 'incompleto' } if the minimum time has not gone by.
create or replace function public.reclamar_secreto(p_secreto text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario uuid := auth.uid();
  v_secreto secretos%rowtype;
begin
  if v_usuario is null then
    raise exception 'Inicia sesión para reclamar el secreto';
  end if;

  -- for update: two people claiming at the same moment cannot both be first
  select * into v_secreto from secretos where id = p_secreto for update;
  if not found then
    raise exception 'Secreto desconocido';
  end if;

  if v_secreto.segundos > 0 and not exists (
    select 1 from secretos_inicio
    where secreto = p_secreto and usuario_id = v_usuario
      and empezado_en <= now() - make_interval(secs => v_secreto.segundos)
  ) then
    return json_build_object('estado', 'incompleto');
  end if;

  if v_secreto.ganador is null then
    update secretos set ganador = v_usuario, encontrado_en = now() where id = p_secreto;
  elsif v_secreto.ganador <> v_usuario then
    return json_build_object('estado', 'tarde');
  end if;

  return json_build_object('estado', 'primero', 'codigo', v_secreto.codigo);
end;
$$;

revoke all on function public.empezar_secreto(text) from public, anon;
revoke all on function public.reclamar_secreto(text) from public, anon;
grant execute on function public.empezar_secreto(text) to authenticated;
grant execute on function public.reclamar_secreto(text) to authenticated;
