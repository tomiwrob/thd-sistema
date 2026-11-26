-- =====================================================================
-- THD Argentina - Actualización 006: chofer asignado a cada vehículo
-- Pegar en Supabase > SQL Editor > New query > Run. Se puede repetir sin problema.
-- =====================================================================
alter table vehiculos add column if not exists chofer_id bigint references personal(id) on delete set null;
