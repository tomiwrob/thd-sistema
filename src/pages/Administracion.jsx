import { useState } from 'react'
import CrudTable from '../components/CrudTable'
import ResumenEquipo from '../components/ResumenEquipo'
import Usuarios from './Usuarios'
import { usePuedeEditar } from '../permisos'
import { opciones, useRows } from '../util'

const SECCIONES = ['Centros de costo', 'Equipos', 'Personal', 'Vehículos', 'Máquinas']

export default function Administracion() {
  const puedeEditar = usePuedeEditar()
  const secciones = puedeEditar ? [...SECCIONES, 'Usuarios'] : SECCIONES
  const [sec, setSec] = useState(SECCIONES[0])
  const [verEquipo, setVerEquipo] = useState(null)
  const centros = useRows('centros_costo', { order: 'codigo' })
  const equipos = useRows('equipos', { order: 'nombre' })
  const personal = useRows('personal', { order: 'apellido' })

  const optCentros = opciones(centros.rows, (c) => `${c.codigo} · ${c.nombre}`)
  const optEquipos = opciones(equipos.rows, (e) => {
    const c = centros.rows.find((x) => x.id === e.centro_costo_id)
    return c ? `${e.nombre} (${c.codigo})` : e.nombre
  })

  // Choferes: todo el personal, primero los que tienen la función "Chofer"
  const esChofer = (p) => /chofer/i.test(p.funcion || '')
  const optChoferes = [...personal.rows]
    .sort((a, b) => esChofer(b) - esChofer(a) || `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`))
    .map((p) => {
      const e = equipos.rows.find((x) => x.id === p.equipo_id)
      return {
        value: p.id,
        label: `${p.apellido}, ${p.nombre}${p.funcion ? ` · ${p.funcion}` : ''}${e ? ` (${e.nombre})` : ''}`,
        corto: `${p.apellido}, ${p.nombre}`,
      }
    })

  return (
    <div>
      <p className="intro">
        Acá se carga la estructura de la empresa: centros de costo, sus equipos y el personal, vehículos y máquinas de
        cada equipo. Estos datos se usan en el resto del sistema.
      </p>
      <div className="subtabs">
        {secciones.map((s) => (
          <button key={s} className={s === sec ? 'active' : ''} onClick={() => setSec(s)}>
            {s}
          </button>
        ))}
      </div>

      {sec === 'Usuarios' && puedeEditar && <Usuarios />}

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
          onVer={(e) => setVerEquipo(e.id)}
          verLabel="Ver personal"
          empty="Primero creá un centro de costo y después sus equipos."
          fields={[
            { key: 'nombre', label: 'Nombre del equipo', required: true },
            { key: 'centro_costo_id', label: 'Centro de costo', type: 'select', options: optCentros, required: true },
          ]}
        />
      )}
      {verEquipo && <ResumenEquipo equipoId={verEquipo} onClose={() => setVerEquipo(null)} />}

      {sec === 'Personal' && (
        <CrudTable
          title="Personal"
          table="personal"
          order="apellido"
          onChange={personal.reload}
          fields={[
            { key: 'apellido', label: 'Apellido', required: true },
            { key: 'nombre', label: 'Nombre', required: true },
            { key: 'cuil', label: 'CUIL' },
            { key: 'funcion', label: 'Función' },
            { key: 'equipo_id', label: 'Equipo', type: 'select', options: optEquipos },
          ]}
        />
      )}

      {sec === 'Vehículos' && (
        <CrudTable
          title="Vehículos"
          table="vehiculos"
          order="marca"
          fields={[
            { key: 'marca', label: 'Marca', required: true },
            { key: 'modelo', label: 'Modelo' },
            { key: 'patente', label: 'Patente' },
            { key: 'equipo_id', label: 'Equipo', type: 'select', options: optEquipos },
            { key: 'chofer_id', label: 'Chofer', type: 'select', options: optChoferes },
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
