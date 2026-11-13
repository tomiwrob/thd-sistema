-- =====================================================================
-- THD Argentina - Actualización 003
-- Agrega "Ubicación" (texto libre) al parte diario.
-- Pegar en Supabase > SQL Editor > New query > Run. Se puede repetir sin problema.
-- =====================================================================
alter table partes_diarios add column if not exists ubicacion text;
