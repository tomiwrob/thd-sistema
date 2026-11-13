-- =====================================================================
-- THD Argentina - Actualización 004: permisos por usuario
--   editor  -> puede ver, cargar, editar y borrar
--   lector  -> solo puede ver y descargar Excel
-- Los usuarios nuevos quedan como "lector" hasta que un editor los cambie
-- desde la app (Administración > Usuarios).
--
-- ANTES DE EJECUTAR: cambiá el email de la última línea por el tuyo.
-- Pegar TODO en Supabase > SQL Editor > New query > Run. Se puede repetir.
-- =====================================================================

-- ---------- Tabla de perfiles ----------
create table if not exists perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  nombre text,
  rol text not null default 'lector' check (rol in ('editor','lector')),
  created_at timestamptz default now()
);

-- ¿El usuario actual es editor?
create or replace function public.es_editor()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from perfiles where id = auth.uid() and rol = 'editor');
$$;

-- Crear el perfil automáticamente cuando se agrega un usuario en Supabase
create or replace function public.crear_perfil()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into perfiles (id, email) values (new.id, new.email) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario after insert on auth.users
  for each row execute function public.crear_perfil();

-- Perfiles para los usuarios que ya existen
insert into perfiles (id, email)
select id, email from auth.users
on conflict (id) do update set email = excluded.email;

-- ---------- Reglas de acceso ----------
alter table perfiles enable row level security;
drop policy if exists "ver perfiles" on perfiles;
drop policy if exists "editores cambian perfiles" on perfiles;
create policy "ver perfiles" on perfiles for select to authenticated using (true);
create policy "editores cambian perfiles" on perfiles for update to authenticated
  using (es_editor()) with check (es_editor());

do $$
declare t text;
begin
  foreach t in array array['centros_costo','equipos','personal','vehiculos','maquinas','obras',
    'movimientos_caneria','herramientas','epp','cambios_cubiertas','accesorios_maquina',
    'partes_diarios','parte_personal','parte_fotos']
  loop
    execute format('drop policy if exists "usuarios logueados" on %I', t);
    execute format('drop policy if exists "todos leen" on %I', t);
    execute format('drop policy if exists "editores cargan" on %I', t);
    execute format('drop policy if exists "editores modifican" on %I', t);
    execute format('drop policy if exists "editores borran" on %I', t);
    execute format('create policy "todos leen" on %I for select to authenticated using (true)', t);
    execute format('create policy "editores cargan" on %I for insert to authenticated with check (es_editor())', t);
    execute format('create policy "editores modifican" on %I for update to authenticated using (es_editor()) with check (es_editor())', t);
    execute format('create policy "editores borran" on %I for delete to authenticated using (es_editor())', t);
  end loop;
end $$;

-- Fotos
drop policy if exists "fotos usuarios logueados" on storage.objects;
drop policy if exists "fotos todos ven" on storage.objects;
drop policy if exists "fotos editores suben" on storage.objects;
drop policy if exists "fotos editores modifican" on storage.objects;
drop policy if exists "fotos editores borran" on storage.objects;
create policy "fotos todos ven" on storage.objects for select to authenticated using (bucket_id = 'fotos');
create policy "fotos editores suben" on storage.objects for insert to authenticated with check (bucket_id = 'fotos' and es_editor());
create policy "fotos editores modifican" on storage.objects for update to authenticated using (bucket_id = 'fotos' and es_editor());
create policy "fotos editores borran" on storage.objects for delete to authenticated using (bucket_id = 'fotos' and es_editor());

-- ---------- Primer editor ----------
-- Cambiá este email por el tuyo (el que usás para entrar a la app):
update perfiles set rol = 'editor' where lower(email) = lower('TU-EMAIL@ejemplo.com');

-- Resultado: lista de usuarios y su permiso
select email, rol from perfiles order by rol, email;
