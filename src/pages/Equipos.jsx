import { useEffect, useState } from 'react'
import CrudTable from '../components/CrudTable'
import { exportarExcel, fmtFecha, nombreCompleto, opciones, useRows } from '../util'
import { supabase } from '../supabase'

const SECCIONES = ['Herramientas', 'EPP', 'Cubiertas', 'Accesorios de máquinas']

export default function Equipos() {
  const centros = useRows('centros_costo', { order: 'codigo' })
  const equipos = useRows('equipos', { order: 'nombre' })
  const [centroId, setCentroId] = useState('')
  const [equipoId, setEquipoId] = useState('')
  const [sec, setSec] = useState(SECCIONES[0])

  const equiposDelCentro = equipos.rows.filter((e) => String(e.centro_costo_id) === String(centroId))

  useEffect(() => {
    if (equiposDelCentro.length === 1) setEquipoId(String(equiposDelCentro[0].id))
    else if (!equiposDelCentro.some((e) => String(e.id) === equipoId)) setEquipoId('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centroId, equipos.rows])

  return (
    <div>
      <section className="card selector">
        <label>
          <span>Centro de costo</span>
          <select value={centroId} onChange={(e) => setCentroId(e.target.value)}>
            <option value="">— Elegir —</option>
            {centros.rows.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codigo} · {c.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Equipo</span>
          <select value={equipoId} onChange={(e) => setEquipoId(e.target.value)} disabled={!centroId}>
            <option value="">— Elegir —</option>
            {equiposDelCentro.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </label>
        {centroId && <BotonExportar centro={centros.rows.find((c) => String(c.id) === centroId)} equipos={equiposDelCentro} />}
      </section>

      {!centros.loading && centros.rows.length === 0 && (
        <p className="aviso">Todavía no hay centros de costo. Cargalos en la pestaña “Administración”.</p>
      )}
      {centroId && equiposDelCentro.length === 0 && (
        <p className="aviso">Este centro de costo no tiene equipos. Agregalos en “Administración → Equipos”.</p>
      )}

      {equipoId && (
        <>
          <div className="subtabs">
            {SECCIONES.map((s) => (
              <button key={s} className={s === sec ? 'active' : ''} onClick={() => setSec(s)}>
                {s}
              </button>
            ))}
          </div>
          <DetalleEquipo key={equipoId + sec} equipoId={Number(equipoId)} sec={sec} />
        </>
      )}
    </div>
  )
}

function DetalleEquipo({ equipoId, sec }) {
  const personal = useRows('personal', { order: 'apellido', filter: { equipo_id: equipoId } })
  const vehiculos = useRows('vehiculos', { order: 'descripcion', filter: { equipo_id: equipoId } })
  const maquinas = useRows('maquinas', { order: 'descripcion', filter: { equipo_id: equipoId } })
  const [vehiculoId, setVehiculoId] = useState('')
  const [maquinaId, setMaquinaId] = useState('')

  if (sec === 'Herramientas')
    return (
      <CrudTable
        title="Herramientas del equipo"
        table="herramientas"
        order="nombre"
        fixed={{ equipo_id: equipoId }}
        fields={[
          { key: 'nombre', label: 'Herramienta', required: true },
          { key: 'cantidad', label: 'Cantidad', type: 'number', required: true, default: 1 },
          { key: 'observaciones', label: 'Observaciones' },
        ]}
      />
    )

  if (sec === 'EPP')
    return (
      <CrudTable
        title="Elementos de protección personal (EPP)"
        table="epp"
        order="fecha_entrega"
        ascending={false}
        fixed={{ equipo_id: equipoId }}
        fields={[
          { key: 'elemento', label: 'Elemento (casco, botines, guantes…)', required: true },
          { key: 'cantidad', label: 'Cantidad', type: 'number', required: true, default: 1 },
          { key: 'talle', label: 'Talle' },
          { key: 'personal_id', label: 'Entregado a', type: 'select', options: opciones(personal.rows, nombreCompleto) },
          { key: 'fecha_entrega', label: 'Fecha de entrega', type: 'date' },
        ]}
      />
    )

  if (sec === 'Cubiertas')
    return (
      <>
        <section className="card selector">
          <label>
            <span>Vehículo</span>
            <select value={vehiculoId} onChange={(e) => setVehiculoId(e.target.value)}>
              <option value="">— Elegir —</option>
              {vehiculos.rows.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.descripcion} {v.patente ? `· ${v.patente}` : ''}
                </option>
              ))}
            </select>
          </label>
        </section>
        {!vehiculos.loading && vehiculos.rows.length === 0 && (
          <p className="aviso">Este equipo no tiene vehículos. Agregalos en “Administración → Vehículos”.</p>
        )}
        {vehiculoId && (
          <CrudTable
            key={vehiculoId}
            title="Cambios de cubiertas"
            table="cambios_cubiertas"
            order="fecha"
            ascending={false}
            fixed={{ vehiculo_id: Number(vehiculoId) }}
            fields={[
              { key: 'fecha', label: 'Fecha', type: 'date', required: true },
              { key: 'posicion', label: 'Posición (ej. delantera izq.)' },
              { key: 'cantidad', label: 'Cantidad', type: 'number', required: true, default: 1 },
              { key: 'medida_marca', label: 'Medida / marca' },
              { key: 'kilometraje', label: 'Kilometraje', type: 'number' },
              { key: 'observaciones', label: 'Observaciones' },
            ]}
          />
        )}
      </>
    )

  return (
    <>
      <section className="card selector">
        <label>
          <span>Máquina</span>
          <select value={maquinaId} onChange={(e) => setMaquinaId(e.target.value)}>
            <option value="">— Elegir —</option>
            {maquinas.rows.map((m) => (
              <option key={m.id} value={m.id}>
                {m.descripcion} {m.identificacion ? `· ${m.identificacion}` : ''}
              </option>
            ))}
          </select>
        </label>
      </section>
      {!maquinas.loading && maquinas.rows.length === 0 && (
        <p className="aviso">Este equipo no tiene máquinas. Agregalas en “Administración → Máquinas”.</p>
      )}
      {maquinaId && (
        <CrudTable
          key={maquinaId}
          title="Accesorios de la máquina"
          table="accesorios_maquina"
          order="accesorio"
          fixed={{ maquina_id: Number(maquinaId) }}
          fields={[
            { key: 'accesorio', label: 'Accesorio', required: true },
            { key: 'cantidad', label: 'Cantidad', type: 'number', required: true, default: 1 },
            { key: 'observaciones', label: 'Observaciones' },
          ]}
        />
      )}
    </>
  )
}

function BotonExportar({ centro, equipos }) {
  const [cargando, setCargando] = useState(false)

  async function exportar() {
    setCargando(true)
    const ids = equipos.map((e) => e.id)
    const nombreEq = (id) => equipos.find((e) => e.id === id)?.nombre || ''
    const [h, ep, pe, ve, ma] = await Promise.all([
      supabase.from('herramientas').select('*').in('equipo_id', ids).order('nombre'),
      supabase.from('epp').select('*').in('equipo_id', ids),
      supabase.from('personal').select('*'),
      supabase.from('vehiculos').select('*').in('equipo_id', ids),
      supabase.from('maquinas').select('*').in('equipo_id', ids),
    ])
    const vIds = (ve.data || []).map((v) => v.id)
    const mIds = (ma.data || []).map((m) => m.id)
    const [cu, ac] = await Promise.all([
      supabase.from('cambios_cubiertas').select('*').in('vehiculo_id', vIds).order('fecha'),
      supabase.from('accesorios_maquina').select('*').in('maquina_id', mIds).order('accesorio'),
    ])
    const veh = (id) => (ve.data || []).find((v) => v.id === id)
    const maq = (id) => (ma.data || []).find((m) => m.id === id)
    const per = (id) => (pe.data || []).find((p) => p.id === id)

    exportarExcel(`Equipos_${centro.codigo}.xlsx`, {
      Herramientas: (h.data || []).map((r) => ({
        Equipo: nombreEq(r.equipo_id),
        Herramienta: r.nombre,
        Cantidad: Number(r.cantidad),
        Observaciones: r.observaciones || '',
      })),
      EPP: (ep.data || []).map((r) => ({
        Equipo: nombreEq(r.equipo_id),
        Elemento: r.elemento,
        Cantidad: Number(r.cantidad),
        Talle: r.talle || '',
        'Entregado a': nombreCompleto(per(r.personal_id)),
        DNI: per(r.personal_id)?.dni || '',
        'Fecha entrega': fmtFecha(r.fecha_entrega),
      })),
      Cubiertas: (cu.data || []).map((r) => ({
        Equipo: nombreEq(veh(r.vehiculo_id)?.equipo_id),
        Vehículo: veh(r.vehiculo_id)?.descripcion || '',
        Patente: veh(r.vehiculo_id)?.patente || '',
        Fecha: fmtFecha(r.fecha),
        Posición: r.posicion || '',
        Cantidad: Number(r.cantidad),
        'Medida / marca': r.medida_marca || '',
        Kilometraje: r.kilometraje ?? '',
        Observaciones: r.observaciones || '',
      })),
      'Accesorios máquinas': (ac.data || []).map((r) => ({
        Equipo: nombreEq(maq(r.maquina_id)?.equipo_id),
        Máquina: maq(r.maquina_id)?.descripcion || '',
        Accesorio: r.accesorio,
        Cantidad: Number(r.cantidad),
        Observaciones: r.observaciones || '',
      })),
    })
    setCargando(false)
  }

  return (
    <button className="btn" onClick={exportar} disabled={cargando || !equipos.length}>
      {cargando ? 'Generando…' : '⬇ Excel del centro de costo'}
    </button>
  )
}
