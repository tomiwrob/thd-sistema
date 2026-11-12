import { useState } from 'react'
import CrudTable from '../components/CrudTable'
import { opciones, useRows } from '../util'

const SECCIONES = ['Centros de costo', 'Equipos', 'Personal', 'Vehículos', 'Máquinas']

export default function Administracion() {
  const [sec, setSec] = useState(SECCIONES[0])
  const centros = useRows('centros_costo', { order: 'codigo' })
  const equipos = useRows('equipos', { order: 'nombre' })

  const optCentros = opciones(centros.rows, (c) => `${c.codigo} · ${c.nombre}`)
  const optEquipos = opciones(equipos.rows, (e) => {
    const c = centros.rows.find((x) => x.id === e.centro_costo_id)
    return c ? `${e.nombre} (${c.codigo})` : e.nombre
  })

  return (
    <div>
      <p className="intro">
        Acá se carga la estructura de la empresa: centros de costo, sus equipos y el personal, vehículos y máquinas de
        cada equipo. Estos datos se usan en el resto del sistema.
      </p>
      <div className="subtabs">
        {SECCIONES.map((s) => (
          <button key={s} className={s === sec ? 'active' : ''} onClick={() => setSec(s)}>
            {s}
          </button>
        ))}
      </div>

      {sec === 'Centros de costo' && (
        <CrudTable
          title="Centros de costo"
          table="centros_costo"
          order="codigo"
          onChange={centros.reload}
          fields={[
            { key: 'codigo', label: 'Código', required: true },
            { key: 'nombre', label: 'Nombre', required: true },
          ]}
        />
      )}

      {sec === 'Equipos' && (
        <CrudTable
          title="Equipos"
          table="equipos"
          order="nombre"
          onChange={equipos.reload}
          empty="Primero creá un centro de costo y después sus equipos."
          fields={[
            { key: 'nombre', label: 'Nombre del equipo', required: true },
            { key: 'centro_costo_id', label: 'Centro de costo', type: 'select', options: optCentros, required: true },
          ]}
        />
      )}

      {sec === 'Personal' && (
        <CrudTable
          title="Personal"
          table="personal"
          order="apellido"
          fields={[
            { key: 'apellido', label: 'Apellido', required: true },
            { key: 'nombre', label: 'Nombre', required: true },
            { key: 'dni', label: 'DNI', required: true },
            { key: 'equipo_id', label: 'Equipo', type: 'select', options: optEquipos },
          ]}
        />
      )}

      {sec === 'Vehículos' && (
        <CrudTable
          title="Vehículos"
          table="vehiculos"
          order="descripcion"
          fields={[
            { key: 'descripcion', label: 'Vehículo (marca / modelo)', required: true },
            { key: 'patente', label: 'Patente' },
            { key: 'equipo_id', label: 'Equipo', type: 'select', options: optEquipos },
          ]}
        />
      )}

      {sec === 'Máquinas' && (
        <CrudTable
          title="Máquinas"
          table="maquinas"
          order="descripcion"
          fields={[
            { key: 'descripcion', label: 'Máquina', required: true },
            { key: 'identificacion', label: 'N° interno / serie' },
            { key: 'equipo_id', label: 'Equipo', type: 'select', options: optEquipos },
          ]}
        />
      )}
    </div>
  )
}
