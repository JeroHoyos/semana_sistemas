-- =============================================
-- BRACKETS (the "Llaves" section of evento.html?id=<competition>, js/brackets.js)
-- Run in Supabase → SQL Editor after weekly-game.sql (it uses es_supervisor()). Safe to run again.
--
-- One row per competition:
--   participantes: names in bracket order, two by two (1st vs 2nd, 3rd vs 4th…); null = bye.
--                  If the count is not 2, 4, 8, 16 or 32, the page spreads the byes itself.
--   ganadores:     { "<round>-<match>": 0 | 1 }, which side won each match (0 = the one on top).
-- Everyone can read it. Only supervisors change it, through the functions below.
-- =============================================

create table if not exists public.llaves (
  actividad      text        primary key,                   -- activity id in js/data.js
  participantes  jsonb       not null,
  ganadores      jsonb       not null default '{}'::jsonb,
  actualizado_en timestamptz not null default now()
);

alter table public.llaves enable row level security;
revoke all on public.llaves from anon, authenticated;
grant select on public.llaves to anon, authenticated;
drop policy if exists "llaves visibles" on public.llaves;
create policy "llaves visibles" on public.llaves for select using (true);


-- ---------- Replacing the participants (and the results) ----------
-- An empty list deletes the competition's bracket.
create or replace function public.guardar_llave(p_actividad text, p_participantes jsonb, p_ganadores jsonb default '{}')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not es_supervisor() then
    raise exception 'Solo los supervisores pueden editar las llaves';
  end if;

  if jsonb_typeof(p_participantes) is distinct from 'array' or jsonb_typeof(p_ganadores) is distinct from 'object' then
    raise exception 'Llaves inválidas';
  end if;

  if jsonb_array_length(p_participantes) = 0 then
    delete from llaves where actividad = p_actividad;
    return;
  end if;

  insert into llaves (actividad, participantes, ganadores)
  values (p_actividad, p_participantes, p_ganadores)
  on conflict (actividad) do update
    set participantes = excluded.participantes,
        ganadores = excluded.ganadores,
        actualizado_en = now();
end;
$$;


-- ---------- Marking results ----------
-- Merges into the stored ones: { "1-0": 1 } sets a result and { "1-0": null } clears it.
-- Merging lets two supervisors mark different matches at the same time without undoing each other.
create or replace function public.marcar_ganadores(p_actividad text, p_ganadores jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not es_supervisor() then
    raise exception 'Solo los supervisores pueden editar las llaves';
  end if;

  if jsonb_typeof(p_ganadores) is distinct from 'object' then
    raise exception 'Resultados inválidos';
  end if;

  update llaves
     set ganadores = jsonb_strip_nulls(ganadores || p_ganadores),
         actualizado_en = now()
   where actividad = p_actividad;

  if not found then
    raise exception 'Esta competencia todavía no tiene llaves';
  end if;
end;
$$;

revoke all on function public.guardar_llave(text, jsonb, jsonb) from public, anon;
revoke all on function public.marcar_ganadores(text, jsonb) from public, anon;
grant execute on function public.guardar_llave(text, jsonb, jsonb) to authenticated;
grant execute on function public.marcar_ganadores(text, jsonb) to authenticated;


-- ---------- Starting the brackets ----------
-- With whoever is signed up when this runs, in random order. Competitions that already have a
-- bracket are left alone, so running the file again does not reshuffle them.
-- Names as inscritos_individuales (individual-registrations.sql) shows them.
insert into public.llaves (actividad, participantes)
select i.actividad,
       jsonb_agg(coalesce(nullif(trim(p.nombre::text), ''), u.raw_user_meta_data ->> 'full_name', 'Asustador') order by random())
  from public.inscripciones_individuales i
  join auth.users u on u.id = i.usuario_id
  left join public.perfiles p on p.id = i.usuario_id
 where i.actividad in ('clash-royale', 'videojuegos', 'just-dance')
 group by i.actividad
union all
select 'futbol', jsonb_agg(e.nombre order by random())
  from public.equipos e
 where e.actividad = 'futbol'
having count(*) > 0
on conflict (actividad) do nothing;

-- What was started
select actividad, jsonb_array_length(participantes) as participantes from public.llaves order by actividad;
