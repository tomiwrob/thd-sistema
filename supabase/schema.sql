-- =====================================================================
-- THD Argentina - Sistema de obras
-- Pegar TODO este archivo en Supabase > SQL Editor > New query > Run
-- Se puede volver a ejecutar sin romper nada.
-- =====================================================================

-- ---------- Estructura de la empresa ----------
create table if not exists centros_costo (
  id bigint generated always as identity primary key,
  codigo text not null unique,
  nombre text not null,
  created_at timestamptz default now()
);

create table if not exists equipos (
  id bigint generated always as identity primary key,
  centro_costo_id bigint not null references centros_costo(id) on delete restrict,
  nombre text not null,
  created_at timestamptz default now()
);

create table if not exists personal (
  id bigint generated always as identity primary key,
  equipo_id bigint references equipos(id) on delete set null,
  nombre text not null,
  apellido text not null,
  cuil text unique,
  funcion text,
  created_at timestamptz default now()
);

create table if not exists vehiculos (
  id bigint generated always as identity primary key,
  equipo_id bigint references equipos(id) on delete set null,
  marca text not null,
  modelo text,
  patente text,
  chofer_id bigint references personal(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists maquinas (
  id bigint generated always as identity primary key,
  equipo_id bigint references equipos(id) on delete set null,
  descripcion text not null,
  identificacion text,
  created_at timestamptz default now()
);

-- ---------- Obras ----------
create table if not exists obras (
  id bigint generated always as identity primary key,
  nombre text not null,
  cliente text,
  ubicacion text,
  fecha date,
  centro_costo_id bigint references centros_costo(id) on delete set null,
  created_at timestamptz default now()
);

-- ---------- Stock de cañería ----------
create table if not exists movimientos_caneria (
  id bigint generated always as identity primary key,
  fecha date not null default current_date,
  tipo text not null check (tipo in ('ingreso','egreso')),
  material text not null check (material in (
    'PEAD PN8 110mm','PEAD PN8 160mm','PEAD PN8 200mm','PEAD PN8 250mm','Rollo tritubo')),
  cantidad numeric not null check (cantidad > 0),
  obra_id bigint references obras(id) on delete set null,
  centro_costo_id bigint references centros_costo(id) on delete set null,
  observaciones text,
  usuario text,
  created_at timestamptz default now()
);

-- ---------- Herramientas y elementos por equipo ----------
create table if not exists herramientas (
  id bigint generated always as identity primary key,
  equipo_id bigint not null references equipos(id) on delete restrict,
  nombre text not null,
  cantidad numeric not null default 1,
  observaciones text,
  created_at timestamptz default now()
);

create table if not exists epp (
  id bigint generated always as identity primary key,
  equipo_id bigint not null references equipos(id) on delete restrict,
  personal_id bigint references personal(id) on delete set null,
  elemento text not null,
  talle text,
  cantidad numeric not null default 1,
  fecha_entrega date,
  created_at timestamptz default now()
);

create table if not exists cambios_cubiertas (
  id bigint generated always as identity primary key,
  vehiculo_id bigint not null references vehiculos(id) on delete restrict,
  fecha date not null default current_date,
  posicion text,
  cantidad numeric not null default 1,
  medida_marca text,
  kilometraje numeric,
  observaciones text,
  created_at timestamptz default now()
);

create table if not exists accesorios_maquina (
  id bigint generated always as identity primary key,
  maquina_id bigint not null references maquinas(id) on delete restrict,
  accesorio text not null,
  cantidad numeric not null default 1,
  observaciones text,
  created_at timestamptz default now()
);

-- ---------- Parte diario ----------
create table if not exists partes_diarios (
  id bigint generated always as identity primary key,
  fecha date not null default current_date,
  obra_id bigint references obras(id) on delete set null,
  ubicacion text,
  cliente text,
  centro_costo_id bigint references centros_costo(id) on delete set null,
  equipo_id bigint references equipos(id) on delete set null,
  vactor_contratado boolean not null default false,
  tareas text,
  observaciones text,
  usuario text,
  created_at timestamptz default now()
);

-- Copia del personal presente ese día (queda guardado aunque después cambie el equipo)
create table if not exists parte_personal (
  id bigint generated always as identity primary key,
  parte_id bigint not null references partes_diarios(id) on delete cascade,
  personal_id bigint references personal(id) on delete set null,
  nombre text not null,
  apellido text not null,
  cuil text
);

create table if not exists parte_fotos (
  id bigint generated always as identity primary key,
  parte_id bigint not null references partes_diarios(id) on delete cascade,
  tipo text not null check (tipo in ('remito_vactor','planilla_perforacion','ats')),
  path text not null,
  created_at timestamptz default now()
);

-- ---------- Vista de stock ----------
create or replace view stock_caneria with (security_invoker = true) as
select material,
       coalesce(sum(case when tipo = 'ingreso' then cantidad end), 0) as ingresos,
       coalesce(sum(case when tipo = 'egreso'  then cantidad end), 0) as egresos,
       coalesce(sum(case when tipo = 'ingreso' then cantidad else -cantidad end), 0) as stock
from movimientos_caneria
group by material;

-- ---------- Seguridad: sólo usuarios con login ----------
do $$
declare t text;
begin
  foreach t in array array['centros_costo','equipos','personal','vehiculos','maquinas','obras',
    'movimientos_caneria','herramientas','epp','cambios_cubiertas','accesorios_maquina',
    'partes_diarios','parte_personal','parte_fotos']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "usuarios logueados" on %I', t);
    execute format('create policy "usuarios logueados" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- ---------- Fotos (Storage privado) ----------
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', false)
on conflict (id) do nothing;

drop policy if exists "fotos usuarios logueados" on storage.objects;
create policy "fotos usuarios logueados" on storage.objects
  for all to authenticated
  using (bucket_id = 'fotos') with check (bucket_id = 'fotos');
