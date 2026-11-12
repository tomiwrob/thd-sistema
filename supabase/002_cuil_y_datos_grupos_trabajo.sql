-- =====================================================================
-- THD Argentina - Actualización 002
--  1) Cambia DNI por CUIL, agrega "función" al personal y marca/modelo a vehículos
--  2) Carga centros de costo, equipos, personal y vehículos
--     (fuente: 0420-R-2020-4 2-REV1 CONTROL DE VENCIMIENTOS, hoja "Grupos de Trabajo")
-- Pegar TODO en Supabase > SQL Editor > New query > Run.
-- Se puede volver a ejecutar: no duplica datos.
-- =====================================================================

-- ---------- 1) Cambios de estructura ----------
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='personal' and column_name='dni') then
    alter table personal rename column dni to cuil;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='parte_personal' and column_name='dni') then
    alter table parte_personal rename column dni to cuil;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='vehiculos' and column_name='descripcion') then
    alter table vehiculos rename column descripcion to marca;
  end if;
end $$;

alter table personal alter column cuil drop not null;
alter table personal add column if not exists funcion text;
alter table parte_personal alter column cuil drop not null;
alter table vehiculos add column if not exists modelo text;

-- ---------- 2) Centros de costo y equipos ----------

insert into centros_costo (codigo, nombre) values ('H510', 'Hanlyma 510 - Sup: Javier Graneros') on conflict (codigo) do nothing;
insert into centros_costo (codigo, nombre) values ('H520', 'Hanlyma 520 - Sup: Carlos Sarmiento') on conflict (codigo) do nothing;
insert into centros_costo (codigo, nombre) values ('H520IR', 'Hanlyma 520 IR - Sup: Carlos Sarmiento') on conflict (codigo) do nothing;
insert into centros_costo (codigo, nombre) values ('H532', 'Hanlyma 532 - Sup: Luciano Wrob') on conflict (codigo) do nothing;
insert into centros_costo (codigo, nombre) values ('LOG', 'Logística') on conflict (codigo) do nothing;
insert into centros_costo (codigo, nombre) values ('OC', 'Obra civil') on conflict (codigo) do nothing;
insert into centros_costo (codigo, nombre) values ('OBR', 'Obrador') on conflict (codigo) do nothing;
insert into centros_costo (codigo, nombre) values ('SUP', 'Supervisores') on conflict (codigo) do nothing;
insert into centros_costo (codigo, nombre) values ('GER', 'Gerentes de Obra e Ingeniería') on conflict (codigo) do nothing;

insert into equipos (centro_costo_id, nombre) select id, 'Hanlyma 510' from centros_costo where codigo = 'H510' and not exists (select 1 from equipos x where x.centro_costo_id = centros_costo.id);
insert into equipos (centro_costo_id, nombre) select id, 'Hanlyma 520' from centros_costo where codigo = 'H520' and not exists (select 1 from equipos x where x.centro_costo_id = centros_costo.id);
insert into equipos (centro_costo_id, nombre) select id, 'Hanlyma 520 IR' from centros_costo where codigo = 'H520IR' and not exists (select 1 from equipos x where x.centro_costo_id = centros_costo.id);
insert into equipos (centro_costo_id, nombre) select id, 'Hanlyma 532' from centros_costo where codigo = 'H532' and not exists (select 1 from equipos x where x.centro_costo_id = centros_costo.id);
insert into equipos (centro_costo_id, nombre) select id, 'Logística' from centros_costo where codigo = 'LOG' and not exists (select 1 from equipos x where x.centro_costo_id = centros_costo.id);
insert into equipos (centro_costo_id, nombre) select id, 'Equipo 1' from centros_costo where codigo = 'OC' and not exists (select 1 from equipos x where x.centro_costo_id = centros_costo.id);
insert into equipos (centro_costo_id, nombre) select id, 'Obrador' from centros_costo where codigo = 'OBR' and not exists (select 1 from equipos x where x.centro_costo_id = centros_costo.id);
insert into equipos (centro_costo_id, nombre) select id, 'Supervisores' from centros_costo where codigo = 'SUP' and not exists (select 1 from equipos x where x.centro_costo_id = centros_costo.id);
insert into equipos (centro_costo_id, nombre) select id, 'Gerentes de Obra e Ingeniería' from centros_costo where codigo = 'GER' and not exists (select 1 from equipos x where x.centro_costo_id = centros_costo.id);

-- ---------- Personal ----------
-- H510
insert into personal (apellido, nombre, funcion, cuil, equipo_id) values ('Corvela', 'Sandro', 'Ayudante', '20-39709150-4', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='H510' limit 1)) on conflict (cuil) do nothing;
insert into personal (apellido, nombre, funcion, cuil, equipo_id) values ('Carcedo', 'Enzo', 'Chofer', '20-42197649-0', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='H510' limit 1)) on conflict (cuil) do nothing;
insert into personal (apellido, nombre, funcion, cuil, equipo_id) values ('Salvatierra', 'Luciano', 'Ayudante', '20-40670827-7', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='H510' limit 1)) on conflict (cuil) do nothing;
insert into personal (apellido, nombre, funcion, cuil, equipo_id) values ('Herrera', 'Victor', 'Maquinista', '20-31679488-3', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='H510' limit 1)) on conflict (cuil) do nothing;
-- H520
insert into personal (apellido, nombre, funcion, cuil, equipo_id) values ('Acosta', 'Dario', 'Maquinista', '24-36951533-7', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='H520' limit 1)) on conflict (cuil) do nothing;
insert into personal (apellido, nombre, funcion, cuil, equipo_id) values ('Acosta', 'Joaquin', 'Detectorista', '20-42572118-7', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='H520' limit 1)) on conflict (cuil) do nothing;
insert into personal (apellido, nombre, funcion, cuil, equipo_id) values ('Montiel', 'Ezequiel', 'Chofer', '20-30871954-6', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='H520' limit 1)) on conflict (cuil) do nothing;
insert into personal (apellido, nombre, funcion, cuil, equipo_id) values ('Acosta', 'Kevin', 'Ayudante', '20-45129098-4', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='H520' limit 1)) on conflict (cuil) do nothing;
insert into personal (apellido, nombre, funcion, cuil, equipo_id) values ('Graneros', 'Cristian', 'Detectorista', '20-37198077-7', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='H520' limit 1)) on conflict (cuil) do nothing;
-- H520IR
insert into personal (apellido, nombre, funcion, cuil, equipo_id) values ('Roldán', 'Aaron', 'Maquinista', '20-42624348-3', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='H520IR' limit 1)) on conflict (cuil) do nothing;
insert into personal (apellido, nombre, funcion, cuil, equipo_id) values ('Enriquez', 'Nestor', 'Ayudante', '20-23557897-3', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='H520IR' limit 1)) on conflict (cuil) do nothing;
insert into personal (apellido, nombre, funcion, cuil, equipo_id) values ('Salvatierra', 'Damian', 'Chofer', '20-38670123-8', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='H520IR' limit 1)) on conflict (cuil) do nothing;
insert into personal (apellido, nombre, funcion, cuil, equipo_id) values ('Salvatierra', 'Franco Joaquin', 'Ayudante', '24-42942618-5', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='H520IR' limit 1)) on conflict (cuil) do nothing;
-- H532
insert into personal (apellido, nombre, funcion, cuil, equipo_id) values ('Morales', 'Catalino', 'Chofer', '20-17654990-5', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='H532' limit 1)) on conflict (cuil) do nothing;
insert into personal (apellido, nombre, funcion, cuil, equipo_id) values ('Martinez', 'Gabriel', 'Maquinista', '23-31061039-9', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='H532' limit 1)) on conflict (cuil) do nothing;
insert into personal (apellido, nombre, funcion, cuil, equipo_id) values ('Morales', 'Alfredo', 'Ayudante', '20-34968970-8', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='H532' limit 1)) on conflict (cuil) do nothing;
insert into personal (apellido, nombre, funcion, cuil, equipo_id) select 'Mamani', 'Adriel', 'Ayudante', null, (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='H532' limit 1) where not exists (select 1 from personal where apellido = 'Mamani' and nombre = 'Adriel');
insert into personal (apellido, nombre, funcion, cuil, equipo_id) select 'Tevez', 'Rolando', 'Ayudante', null, (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='H532' limit 1) where not exists (select 1 from personal where apellido = 'Tevez' and nombre = 'Rolando');
-- LOG
insert into personal (apellido, nombre, funcion, cuil, equipo_id) values ('Rivera', 'Marcelo', 'Chofer', '20-20929132-1', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='LOG' limit 1)) on conflict (cuil) do nothing;
-- OC
insert into personal (apellido, nombre, funcion, cuil, equipo_id) values ('Filz', 'Eric', null, '20-36822821-5', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='OC' limit 1)) on conflict (cuil) do nothing;
insert into personal (apellido, nombre, funcion, cuil, equipo_id) values ('Filz', 'Ivan', null, '20-32637500-5', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='OC' limit 1)) on conflict (cuil) do nothing;
-- OBR
insert into personal (apellido, nombre, funcion, cuil, equipo_id) values ('Castro', 'Daniel', null, '20-14129432-7', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='OBR' limit 1)) on conflict (cuil) do nothing;
insert into personal (apellido, nombre, funcion, cuil, equipo_id) values ('Suarez', 'Pablo', null, '20-35617837-9', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='OBR' limit 1)) on conflict (cuil) do nothing;
insert into personal (apellido, nombre, funcion, cuil, equipo_id) values ('Mengarelli', 'Gustavo', null, '20-40797674-7', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='OBR' limit 1)) on conflict (cuil) do nothing;
insert into personal (apellido, nombre, funcion, cuil, equipo_id) values ('Miño', 'Reimundo', null, '20-22319508-4', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='OBR' limit 1)) on conflict (cuil) do nothing;
-- SUP
insert into personal (apellido, nombre, funcion, cuil, equipo_id) values ('Graneros', 'Javier', 'Supervisor', '20-29599922-6', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='SUP' limit 1)) on conflict (cuil) do nothing;
insert into personal (apellido, nombre, funcion, cuil, equipo_id) values ('Sarmiento', 'Carlos', 'Supervisor', '20-24102445-9', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='SUP' limit 1)) on conflict (cuil) do nothing;
-- GER
insert into personal (apellido, nombre, funcion, cuil, equipo_id) values ('Wroblenski', 'Luciano', null, '20-25284362-1', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='GER' limit 1)) on conflict (cuil) do nothing;
insert into personal (apellido, nombre, funcion, cuil, equipo_id) values ('Wroblenski', 'Pablo', null, '20-29583512-6', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='GER' limit 1)) on conflict (cuil) do nothing;
insert into personal (apellido, nombre, funcion, cuil, equipo_id) values ('Wroblenski', 'Alejandro', null, '20-22784376-5', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='GER' limit 1)) on conflict (cuil) do nothing;

-- ---------- Vehículos (los de taller quedan sin equipo) ----------
-- H510
insert into vehiculos (marca, modelo, patente, equipo_id) select 'EL GRANDE', 'CARRETÓN', 'BPI564', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='H510' limit 1) where not exists (select 1 from vehiculos where patente = 'BPI564');
insert into vehiculos (marca, modelo, patente, equipo_id) select 'FORD', 'CARGO 1722', 'KJH829', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='H510' limit 1) where not exists (select 1 from vehiculos where patente = 'KJH829');
-- H520
insert into vehiculos (marca, modelo, patente, equipo_id) select 'PEUGEOT', 'BOXER', 'AE733WW', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='H520' limit 1) where not exists (select 1 from vehiculos where patente = 'AE733WW');
insert into vehiculos (marca, modelo, patente, equipo_id) select 'IVECO - SEG', null, 'AD019OU', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='H520' limit 1) where not exists (select 1 from vehiculos where patente = 'AD019OU');
insert into vehiculos (marca, modelo, patente, equipo_id) select 'INGENMENT', '03-CDE', 'AC130QV', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='H520' limit 1) where not exists (select 1 from vehiculos where patente = 'AC130QV');
-- H520IR
insert into vehiculos (marca, modelo, patente, equipo_id) select 'IVECO', '170 E22', 'GSP585', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='H520IR' limit 1) where not exists (select 1 from vehiculos where patente = 'GSP585');
insert into vehiculos (marca, modelo, patente, equipo_id) select 'INGENMENT', '03-CDE', 'AA438JG', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='H520IR' limit 1) where not exists (select 1 from vehiculos where patente = 'AA438JG');
insert into vehiculos (marca, modelo, patente, equipo_id) select 'SEG-IVECO', 'DAILY', 'AD243PU', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='H520IR' limit 1) where not exists (select 1 from vehiculos where patente = 'AD243PU');
-- H532
insert into vehiculos (marca, modelo, patente, equipo_id) select 'IVECO', '170 E22', 'EHM159', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='H532' limit 1) where not exists (select 1 from vehiculos where patente = 'EHM159');
insert into vehiculos (marca, modelo, patente, equipo_id) select 'INGENMENT', '03-CDE', 'AB553JL', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='H532' limit 1) where not exists (select 1 from vehiculos where patente = 'AB553JL');
insert into vehiculos (marca, modelo, patente, equipo_id) select 'MERCEDES BENZ', 'SPRINTER 411', 'NPC691', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='H532' limit 1) where not exists (select 1 from vehiculos where patente = 'NPC691');
-- LOG
insert into vehiculos (marca, modelo, patente, equipo_id) select 'FORD', 'CARGO', 'FPG190', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='LOG' limit 1) where not exists (select 1 from vehiculos where patente = 'FPG190');
-- OC
insert into vehiculos (marca, modelo, patente, equipo_id) select 'IVECO', 'DAILY', 'NFQ309', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='OC' limit 1) where not exists (select 1 from vehiculos where patente = 'NFQ309');
-- OBR
insert into vehiculos (marca, modelo, patente, equipo_id) select 'TOYOTA', 'HILUX', 'AG286WJ', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='OBR' limit 1) where not exists (select 1 from vehiculos where patente = 'AG286WJ');
insert into vehiculos (marca, modelo, patente, equipo_id) select 'PEUGEOT', 'PARTNER', 'AE534DX', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='OBR' limit 1) where not exists (select 1 from vehiculos where patente = 'AE534DX');
insert into vehiculos (marca, modelo, patente, equipo_id) select 'RENAULT', 'KANGOO', 'AB451RH', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='OBR' limit 1) where not exists (select 1 from vehiculos where patente = 'AB451RH');
-- SUP
insert into vehiculos (marca, modelo, patente, equipo_id) select 'SEG-VOLKSWAGEN', 'VOYAGE', 'OZT736', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='SUP' limit 1) where not exists (select 1 from vehiculos where patente = 'OZT736');
insert into vehiculos (marca, modelo, patente, equipo_id) select 'SEG-RENAULT', 'KANGOO', 'AA676US', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='SUP' limit 1) where not exists (select 1 from vehiculos where patente = 'AA676US');
-- GER
insert into vehiculos (marca, modelo, patente, equipo_id) select 'SEG-VOLKSWAGEN', 'AMAROK', 'LYB790', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='GER' limit 1) where not exists (select 1 from vehiculos where patente = 'LYB790');
insert into vehiculos (marca, modelo, patente, equipo_id) select 'PEUGEOT', 'PARTNER', 'AE534DY', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='GER' limit 1) where not exists (select 1 from vehiculos where patente = 'AE534DY');
insert into vehiculos (marca, modelo, patente, equipo_id) select 'PEUGEOT', 'BOXER', 'AE733WZ', (select e.id from equipos e join centros_costo cc on cc.id=e.centro_costo_id where cc.codigo='GER' limit 1) where not exists (select 1 from vehiculos where patente = 'AE733WZ');
-- En taller
insert into vehiculos (marca, modelo, patente, equipo_id) select 'MERCEDES BENZ', 'SPRINTER', 'NCN506', null where not exists (select 1 from vehiculos where patente = 'NCN506');
insert into vehiculos (marca, modelo, patente, equipo_id) select 'MESAMI', '02-PL-20', 'AD631VS', null where not exists (select 1 from vehiculos where patente = 'AD631VS');
insert into vehiculos (marca, modelo, patente, equipo_id) select 'PEUGEOT', 'BOXER', 'AE733WY', null where not exists (select 1 from vehiculos where patente = 'AE733WY');
insert into vehiculos (marca, modelo, patente, equipo_id) select 'IVECO', 'DAILY', 'GEA452', null where not exists (select 1 from vehiculos where patente = 'GEA452');
insert into vehiculos (marca, modelo, patente, equipo_id) select 'CITROËN', 'BERLINGO', 'AA177KC', null where not exists (select 1 from vehiculos where patente = 'AA177KC');
insert into vehiculos (marca, modelo, patente, equipo_id) select 'IVECO', '170 E22', 'JCR408', null where not exists (select 1 from vehiculos where patente = 'JCR408');

-- Resumen
select cc.codigo, cc.nombre,
  (select count(*) from personal p join equipos e on e.id=p.equipo_id where e.centro_costo_id=cc.id) as personal,
  (select count(*) from vehiculos v join equipos e on e.id=v.equipo_id where e.centro_costo_id=cc.id) as vehiculos
from centros_costo cc order by cc.codigo;
