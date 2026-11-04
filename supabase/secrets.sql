-- =============================================
-- SECRET CODES (js/secrets.js)
-- Run once in Supabase → SQL Editor. It is safe to run again.
--
-- Hidden challenges on the site. Only the first few people who complete each one win (the page gives
-- them the secret's title); whoever comes later learns that the places are taken:
--   'konami'        the Konami code on the Scare Meter console (d-pad and buttons)
--   'video-futbol'  the whole video on the football tournament page
--
-- Each secret also keeps a code, which the page used to show to the winner and no longer does.
-- The column still needs a value. The codes are NOT in this file (the repository is public). Insert them by hand, once:
--   insert into public.secretos (id, codigo, segundos) values
--     ('konami', 'EL CODIGO', 0),
--     ('video-futbol', 'EL OTRO CODIGO', 240);
-- segundos: the least time between starting the challenge and claiming it. The video lasts 4:13 (253 s);
-- 240 leaves room for the page's own checks. 0 = no minimum time.
-- How many people can win each secret: v_cupos in reclamar_secreto (5 for 'konami', 3 for 'video-futbol'),
-- the same as limit in the secret's title (TITLES, js/data.js). Change both together.
-- To see who won:  select * from public.secretos_ganadores order by secreto, encontrado_en;
-- To start a secret over (after testing it yourself):
--   delete from public.secretos_ganadores where secreto = 'konami';
-- The winners also get the title with the secret's id on their ID card (js/secrets.js).
--
-- Table and function names stay in Spanish, like the rest of the database.
-- =============================================

create table if not exists public.secretos (
  id            text        primary key,
  codigo        text        not null,
  segundos      integer     not null default 0
);

-- When each person started a challenge that has a minimum time (the video)
create table if not exists public.secretos_inicio (
  secreto     text        not null references public.secretos (id) on delete cascade,
  usuario_id  uuid        not null references auth.users (id) on delete cascade,
  empezado_en timestamptz not null default now(),
  primary key (secreto, usuario_id)
);

-- Who won each secret, and when
create table if not exists public.secretos_ganadores (
  secreto       text        not null references public.secretos (id) on delete cascade,
  usuario_id    uuid        not null references auth.users (id) on delete cascade,
  encontrado_en timestamptz not null default now(),
  primary key (secreto, usuario_id)
);

-- Each secret used to have a single winner (secretos.ganador): it moves to secretos_ganadores
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'secretos' and column_name = 'ganador') then
    insert into public.secretos_ganadores (secreto, usuario_id, encontrado_en)
    select id, ganador, coalesce(encontrado_en, now()) from public.secretos where ganador is not null
    on conflict do nothing;
    alter table public.secretos drop column ganador, drop column if exists encontrado_en;
  end if;
end $$;

-- Row level security with no policies: nobody reads the codes directly, only through the functions
alter table public.secretos enable row level security;
alter table public.secretos_inicio enable row level security;
alter table public.secretos_ganadores enable row level security;
revoke all on public.secretos, public.secretos_inicio, public.secretos_ganadores from anon, authenticated;


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
-- Returns { estado: 'primero', codigo } to the winners (again if they repeat it),
-- { estado: 'tarde' } once the places are taken and { estado: 'incompleto' } if the minimum time has not gone by.
create or replace function public.reclamar_secreto(p_secreto text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario uuid := auth.uid();
  v_secreto secretos%rowtype;
  -- How many people can win it: the same as limit in its title (TITLES, js/data.js)
  v_cupos   integer := case p_secreto when 'konami' then 5 when 'video-futbol' then 3 else 1 end;
begin
  if v_usuario is null then
    raise exception 'Inicia sesión para reclamar el secreto';
  end if;

  -- for update: two people claiming at the same moment cannot take the same last place
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

  if not exists (select 1 from secretos_ganadores where secreto = p_secreto and usuario_id = v_usuario) then
    if (select count(*) from secretos_ganadores where secreto = p_secreto) >= v_cupos then
      return json_build_object('estado', 'tarde');
    end if;
    insert into secretos_ganadores (secreto, usuario_id) values (p_secreto, v_usuario);
  end if;

  return json_build_object('estado', 'primero', 'codigo', v_secreto.codigo);
end;
$$;

revoke all on function public.empezar_secreto(text) from public, anon;
revoke all on function public.reclamar_secreto(text) from public, anon;
grant execute on function public.empezar_secreto(text) to authenticated;
grant execute on function public.reclamar_secreto(text) to authenticated;


-- ---------- The tank sticker easter egg (js/scare-meter.js) ----------
-- Its function, reclamar_easter_egg, lives only in Supabase (it keeps the order and the code).
-- Like the secrets above, only people with a session can claim it.
revoke all on function public.reclamar_easter_egg(text) from public, anon;
grant execute on function public.reclamar_easter_egg(text) to authenticated;
