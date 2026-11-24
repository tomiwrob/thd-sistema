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
    window.dispatchEvent(new Event('perfiles-cambiaron'))
  }

  const editores = rows.filter((r) => r.rol === 'editor').length
  const jefes = rows.filter((r) => r.rol === 'jefe_obra').length
  const pendientes = rows.filter((r) => r.rol === 'pendiente')
  const orden = { pendiente: 0, editor: 1, jefe_obra: 2 }
  const lista = [...rows].sort((a, b) => (orden[a.rol] ?? 3) - (orden[b.rol] ?? 3) || (a.email || '').localeCompare(b.email || ''))

  return (
    <section className="card">
      <div className="card-head">
        <h3>Usuarios y permisos</h3>
        <span className="muted small">
          {editores} pueden editar todo · {jefes} jefes de obra · {pendientes.length} pendientes
        </span>
      </div>
      <p className="muted small" style={{ marginTop: 0 }}>
        <strong>Puede editar todo:</strong> carga, modifica y borra cualquier dato. <strong>Jefe de obra:</strong> carga
        partes diarios con sus fotos y ve el resto sin modificarlo. <strong>Sin acceso:</strong> cuentas nuevas creadas
        desde la pantalla de ingreso, que todavía no ven nada hasta que las apruebes.
      </p>
      {pendientes.length > 0 && (
        <p className="aviso">
          {pendientes.length === 1 ? 'Hay 1 cuenta nueva' : `Hay ${pendientes.length} cuentas nuevas`} esperando
          aprobación. Elegí “Jefe de obra” o “Puede editar todo” para darles acceso.
        </p>
      )}
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
              {lista.map((p) => (
                <tr key={p.id} className={p.rol === 'pendiente' ? 'fila-pendiente' : ''}>
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
                        className={p.rol === 'jefe_obra' ? 'on lector' : ''}
                        disabled={guardando === p.id || p.id === userId}
                        title={p.id === userId ? 'No podés quitarte tu propio permiso' : ''}
                        onClick={() => cambiar(p, { rol: 'jefe_obra' })}
                      >
                        Jefe de obra
                      </button>
                      <button
                        type="button"
                        className={p.rol === 'pendiente' ? 'on pend' : ''}
                        disabled={guardando === p.id || p.id === userId}
                        title="Sin acceso hasta que se apruebe"
                        onClick={() => cambiar(p, { rol: 'pendiente' })}
                      >
                        Sin acceso
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
