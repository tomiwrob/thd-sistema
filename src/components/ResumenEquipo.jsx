import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { exportarExcel } from '../util'

/** Ventana con el resumen de un equipo: personal, vehículos, máquinas, herramientas y EPP. */
export default function ResumenEquipo({ equipoId, onClose }) {
  const [d, setD] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', esc)
      document.body.style.overflow = ''
    }
  }, [onClose])

  useEffect(() => {
    ;(async () => {
      const { data: equipo, error: e1 } = await supabase.from('equipos').select('*').eq('id', equipoId).single()
      if (e1) return setError(e1.message)
      const [centro, personal, vehiculos, maquinas, herramientas, epp] = await Promise.all([
        supabase.from('centros_costo').select('*').eq('id', equipo.centro_costo_id).single(),
        supabase.from('personal').select('*').eq('equipo_id', equipoId).order('apellido').order('nombre'),
        supabase.from('vehiculos').select('*').eq('equipo_id', equipoId).order('marca'),
        supabase.from('maquinas').select('*').eq('equipo_id', equipoId).order('descripcion'),
        supabase.from('herramientas').select('*').eq('equipo_id', equipoId).order('nombre'),
        supabase.from('epp').select('cantidad').eq('equipo_id', equipoId),
      ])
      setD({
        equipo,
        centro: centro.data,
        personal: personal.data || [],
        vehiculos: vehiculos.data || [],
        maquinas: maquinas.data || [],
        herramientas: herramientas.data || [],
        epp: (epp.data || []).reduce((t, x) => t + Number(x.cantidad || 0), 0),
      })
    })()
  }, [equipoId])

  function exportar() {
    exportarExcel(`Personal_${d.equipo.nombre}.xlsx`, {
      Personal: d.personal.map((p) => ({
        Apellido: p.apellido,
        Nombre: p.nombre,
        CUIL: p.cuil || '',
        Función: p.funcion || '',
        Equipo: d.equipo.nombre,
        'Centro de costo': d.centro?.codigo || '',
      })),
      Vehículos: d.vehiculos.map((v) => ({ Marca: v.marca, Modelo: v.modelo || '', Patente: v.patente || '' })),
    })
  }

  return (
    <div className="modal-fondo" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        {error ? (
          <p className="error">{error}</p>
        ) : !d ? (
          <p className="muted">Cargando…</p>
        ) : (
          <>
            <div className="modal-head">
              <div>
                <span className="modal-sub">{d.centro ? `${d.centro.codigo} · ${d.centro.nombre}` : 'Sin centro de costo'}</span>
                <h3>{d.equipo.nombre}</h3>
              </div>
              <div className="row-gap">
                <button className="btn small" onClick={exportar} disabled={!d.personal.length}>
                  ⬇ Excel
                </button>
                <button className="btn small" onClick={onClose} aria-label="Cerrar">
                  ✕
                </button>
              </div>
            </div>

            <div className="mini-kpis">
              <div><strong>{d.personal.length}</strong><span>Personas</span></div>
              <div><strong>{d.vehiculos.length}</strong><span>Vehículos</span></div>
              <div><strong>{d.maquinas.length}</strong><span>Máquinas</span></div>
              <div><strong>{d.herramientas.reduce((t, h) => t + Number(h.cantidad || 0), 0)}</strong><span>Herramientas</span></div>
              <div><strong>{d.epp}</strong><span>EPP</span></div>
            </div>

            <h4>Personal</h4>
            {d.personal.length === 0 ? (
              <p className="muted">Este equipo no tiene personal asignado.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Apellido</th>
                      <th>Nombre</th>
                      <th>CUIL</th>
                      <th>Función</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.personal.map((p) => (
                      <tr key={p.id}>
                        <td data-label="Apellido"><strong>{p.apellido}</strong></td>
                        <td data-label="Nombre">{p.nombre}</td>
                        <td data-label="CUIL">{p.cuil || <span className="falta">Sin CUIL</span>}</td>
                        <td data-label="Función">{p.funcion || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {d.vehiculos.length > 0 && (
              <>
                <h4>Vehículos</h4>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Marca</th>
                        <th>Modelo</th>
                        <th>Patente</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.vehiculos.map((v) => (
                        <tr key={v.id}>
                          <td data-label="Marca">{v.marca}</td>
                          <td data-label="Modelo">{v.modelo || '—'}</td>
                          <td data-label="Patente"><strong>{v.patente || '—'}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {d.maquinas.length > 0 && (
              <>
                <h4>Máquinas</h4>
                <ul className="lista-simple">
                  {d.maquinas.map((m) => (
                    <li key={m.id}>
                      {m.descripcion} {m.identificacion && <small>· {m.identificacion}</small>}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {d.herramientas.length > 0 && (
              <>
                <h4>Herramientas</h4>
                <ul className="lista-simple">
                  {d.herramientas.map((h) => (
                    <li key={h.id}>
                      <strong>{Number(h.cantidad)}</strong> × {h.nombre}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
