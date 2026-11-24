-- =====================================================================
-- THD Argentina - Actualización 005: registro desde la app con aprobación
--   - Cualquiera puede crearse una cuenta desde la pantalla de ingreso.
--   - La cuenta nueva queda "pendiente": no ve ni carga nada.
--   - Un editor la aprueba en Administración > Usuarios (jefe de obra o editor).
-- Los usuarios que ya existen no cambian.
-- Pegar TODO en Supabase > SQL Editor > New query > Run. Se puede repetir.
-- =====================================================================

-- ---------- Nuevo rol "pendiente" ----------
alter table perfiles drop constraint if exists perfiles_rol_check;
alter table perfiles add constraint perfiles_rol_check check (rol in ('editor','jefe_obra','pendiente'));
alter table perfiles alter column rol set default 'pendiente';

-- ¿El usuario actual está aprobado? (editor o jefe de obra)
create or replace function public.tiene_acceso()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from perfiles where id = auth.uid() and rol in ('editor','jefe_obra'));
$$;

-- El perfil nuevo guarda el nombre que la persona escribió al registrarse
create or replace function public.crear_perfil()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into perfiles (id, email, nombre, rol)
  values (new.id, new.email, nullif(trim(new.raw_user_meta_data->>'nombre'), ''), 'pendiente')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario after insert on auth.users
  for each row execute function public.crear_perfil();

-- ---------- Sólo los usuarios aprobados ven los datos ----------
drop policy if exists "ver perfiles" on perfiles;
create policy "ver perfiles" on perfiles for select to authenticated
  using (id = auth.uid() or tiene_acceso());

do $$
declare t text;
begin
  foreach t in array array['centros_costo','equipos','personal','vehiculos','maquinas','obras',
    'movimientos_caneria','herramientas','epp','cambios_cubiertas','accesorios_maquina',
    'partes_diarios','parte_personal','parte_fotos']
  loop
    execute format('drop policy if exists "todos leen" on %I', t);
    execute format('create policy "todos leen" on %I for select to authenticated using (tiene_acceso())', t);
  end loop;
end $$;

drop policy if exists "fotos todos ven" on storage.objects;
create policy "fotos todos ven" on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and tiene_acceso());

-- Resultado: lista de usuarios y su permiso
select email, nombre, rol from perfiles order by rol, email;
