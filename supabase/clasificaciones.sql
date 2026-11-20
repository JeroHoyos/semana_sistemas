-- =============================================
-- CLASIFICACIONES / TABLA DE POSICIONES
-- Aplica para competencias sin llaves de eliminación directa:
--   'observacion': Carrera de observación (equipos)
--   'atletismo':   Carrera de atletismo 8-bit (individual)
--   'maraton':     Maratón de programación (equipos)
--
-- Almacena los resultados oficiales:
--   actividad: id de la actividad ('observacion', 'atletismo', 'maraton')
--   resultados: jsonb array de [
--     { "nombre": "Equipo Alfa", "puesto": 1 },
--     { "nombre": "Equipo Beta", "puesto": 2 },
--     { "nombre": "Equipo Gamma", "puesto": "DNF" }
--   ]
--
-- Lectura pública para cualquier visitante.
-- Modificación exclusiva para administradores/supervisores (es_supervisor()).
-- =============================================

create table if not exists public.clasificaciones (
  actividad      text        primary key,
  resultados     jsonb       not null default '[]'::jsonb,
  actualizado_en timestamptz not null default now()
);

-- RLS: Visibilidad pública para lectura
alter table public.clasificaciones enable row level security;
revoke all on public.clasificaciones from anon, authenticated;
grant select on public.clasificaciones to anon, authenticated;

drop policy if exists "clasificaciones visibles" on public.clasificaciones;
create policy "clasificaciones visibles" on public.clasificaciones for select using (true);


-- ---------- Guardar resultados de clasificación ----------
create or replace function public.guardar_clasificacion(p_actividad text, p_resultados jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not es_supervisor() then
    raise exception 'Solo los supervisores pueden editar las clasificaciones';
  end if;

  if jsonb_typeof(p_resultados) is distinct from 'array' then
    raise exception 'Resultados inválidos: debe ser un arreglo JSON';
  end if;

  insert into public.clasificaciones (actividad, resultados, actualizado_en)
  values (p_actividad, p_resultados, now())
  on conflict (actividad) do update
    set resultados = excluded.resultados,
        actualizado_en = now();
end;
$$;

revoke all on function public.guardar_clasificacion(text, jsonb) from public, anon;
grant execute on function public.guardar_clasificacion(text, jsonb) to authenticated;

-- Agregar a publicación en tiempo real de Supabase si existe
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'clasificaciones'
  ) then
    alter publication supabase_realtime add table public.clasificaciones;
  end if;
end $$;
