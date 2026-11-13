import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { usePermisos } from '../permisos'

export default function Usuarios() {
  const { userId } = usePermisos()
  const [rows, setRows] = useState([])
  const [cargando, setCargando] = useState(true)
  const [msg, setMsg] = useState(null)
  const [guardando, setGuardando] = useState(null)

  async function cargar() {
    setCargando(true)
    const { data, error } = await supabase.from('perfiles').select('*').order('rol').order('email')
    if (error) setMsg(error.message)
    setRows(data || [])
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  async function cambiar(p, cambios) {
    setGuardando(p.id)
    setMsg(null)
    const { error } = await supabase.from('perfiles').update(cambios).eq('id', p.id)
    setGuardando(null)
    if (error) return setMsg(error.message)
    setRows((rs) => rs.map((r) => (r.id === p.id ? { ...r, ...cambios } : r)))
  }

  const editores = rows.filter((r) => r.rol === 'editor').length

  return (
    <section className="card">
      <div className="card-head">
        <h3>Usuarios y permisos</h3>
        <span className="muted small">
          {editores} pueden editar todo · {rows.length - editores} jefes de obra
        </span>
      </div>
      <p className="muted small" style={{ marginTop: 0 }}>
        <strong>Puede editar todo:</strong> carga, modifica y borra cualquier dato. <strong>Jefe de obra:</strong> carga
        partes diarios con sus fotos; el resto lo ve y puede descargar Excel, pero no lo modifica. Los usuarios nuevos se
        crean en Supabase (Authentication → Users) y aparecen acá como jefe de obra.
      </p>
      {msg && <p className="error">{msg}</p>}
      {cargando ? (
        <p className="muted">Cargando…</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Nombre</th>
                <th>Permiso</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td data-label="Email">
                    {p.email} {p.id === userId && <span className="pill tu">vos</span>}
                  </td>
                  <td data-label="Nombre">
                    <input
                      className="input-tabla"
                      defaultValue={p.nombre || ''}
                      placeholder="Ej.: Jefe de obra H510"
                      onBlur={(e) => e.target.value !== (p.nombre || '') && cambiar(p, { nombre: e.target.value || null })}
                    />
                  </td>
                  <td data-label="Permiso">
                    <div className="toggle rol">
                      <button
                        type="button"
                        className={p.rol === 'editor' ? 'on in' : ''}
                        disabled={guardando === p.id || p.id === userId}
                        onClick={() => cambiar(p, { rol: 'editor' })}
                      >
                        Puede editar todo
                      </button>
                      <button
                        type="button"
                        className={p.rol !== 'editor' ? 'on lector' : ''}
                        disabled={guardando === p.id || p.id === userId}
                        title={p.id === userId ? 'No podés quitarte tu propio permiso' : ''}
                        onClick={() => cambiar(p, { rol: 'jefe_obra' })}
                      >
                        Jefe de obra
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
