# THD Argentina · Sistema de obras

Aplicación web para las obras de THD Argentina:

- **Parte diario**: fecha, obra, cliente, centro de costo, equipo, personal presente (nombre, apellido y DNI), fotos de remitos de vactor, planillas de perforación y ATS. Exporta a Excel (sin fotos).
- **Stock de cañería**: ingresos y egresos de caños PEAD PN8 (110, 160, 200 y 250 mm) y rollos de tritubo, asociados a obras (cliente, ubicación, fecha, centro de costo). Exporta a Excel.
- **Herramientas por centro de costo**: herramientas, EPP, cambios de cubiertas de vehículos y accesorios de máquinas de cada equipo. Exporta a Excel.
- **Administración**: centros de costo, equipos, personal, vehículos y máquinas.

Tecnología: React + Vite, publicada en Vercel, con base de datos, login y fotos en Supabase.

## Puesta en marcha

1. **Base de datos**: en Supabase → *SQL Editor* → *New query*, pegar el contenido de `supabase/schema.sql` y tocar *Run*.
2. **Usuarios**: en Supabase → *Authentication* → *Users* → *Add user* → *Create new user* (email + contraseña, marcar *Auto Confirm User*). Recomendado: *Authentication → Sign In / Providers* → desactivar *Allow new users to sign up*.
3. **Claves**: en Supabase → *Project Settings* → *API* (o *Data API* / *API Keys*), copiar la *Project URL* y la clave pública (*anon* o *publishable*).
4. **Vercel**: en el proyecto → *Settings* → *Environment Variables*, agregar:
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_ANON_KEY` = clave pública
   
   Después *Deployments* → último deploy → *Redeploy*.

## Desarrollo local

```bash
cp .env.example .env.local   # completar las claves
npm install
npm run dev
```
