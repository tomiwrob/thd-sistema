import { useState } from 'react'
import { supabase } from '../supabase'
import { fmtFecha, useRows } from '../util'
import { usePuedeEditar } from '../permisos'

/**
 * Tabla genérica con alta, edición y baja.
 * fields: [{ key, label, type: 'text'|'number'|'date'|'select'|'textarea', options, required, hideInList }]
 * fixed: valores fijos que se agregan al guardar y filtran la lista (ej. { equipo_id: 3 })
 */
export default function CrudTable({ title, table, fields, fixed = {}, order = 'id', ascending = true, empty, onChange, onVer, verLabel = 'Ver' }) {
  const puedeEditar = usePuedeEditar()
  const { rows, loading, error, reload } = useRows(table, { order, ascending, filter: fixed })
  const vacio = () => Object.fromEntries(fields.map((f) => [f.key, f.default ?? '']))
  const [form, setForm] = useState(vacio) // alta (formulario de arriba)
  const [abierto, setAbierto] = useState(false)
  const [editId, setEditId] = useState(null) // fila que se está editando
  const [editForm, setEditForm] = useState({})
  const [msg, setMsg] = useState(null)
  const [editMsg, setEditMsg] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const convertir = (f, v) => {
    if (v === '' || v === undefined) return null
    if (f.type === 'number') return Number(v)
    if (f.type === 'select' && f.options?.length && typeof f.options[0].value === 'number') return Number(v)
    return v
  }
  const armarDatos = (valores) => {
    const datos = { ...fixed }
    for (const f of fields) datos[f.key] = convertir(f, valores[f.key])
    return datos
  }

  async function agregar(e) {
    e.preventDefault()
    setGuardando(true)
    setMsg(null)
    const { error } = await supabase.from(table).insert(armarDatos(form))
    setGuardando(false)
    if (error) return setMsg(traducirError(error))
    setForm(vacio())
    setAbierto(false)
    await reload()
    onChange?.()
  }

  async function guardarEdicion(e) {
    e.preventDefault()
    setGuardando(true)
    setEditMsg(null)
    const { error } = await supabase.from(table).update(armarDatos(editForm)).eq('id', editId)
    setGuardando(false)
    if (error) return setEditMsg(traducirError(error))
    setEditId(null)
    await reload()
    onChange?.()
  }

  function editar(r) {
    setEditId(r.id)
    setEditForm(Object.fromEntries(fields.map((f) => [f.key, r[f.key] ?? ''])))
    setEditMsg(null)
    setAbierto(false)
  }

  async function borrar(r) {
    if (!window.confirm('¿Eliminar este registro?')) return
    const { error } = await supabase.from(table).delete().eq('id', r.id)
    if (error) setMsg(traducirError(error))
    else {
      await reload()
      onChange?.()
    }
  }

  function abrirAlta() {
    setEditId(null)
    setForm(vacio())
    setMsg(null)
    setAbierto(true)
  }

  const campos = (valores, setValores) =>
    fields.map((f) => (
      <label key={f.key} className={f.type === 'textarea' ? 'full' : ''}>
        <span>
          {f.label}
          {f.required && ' *'}
        </span>
        <Campo f={f} value={valores[f.key]} onChange={(v) => setValores((x) => ({ ...x, [f.key]: v }))} />
      </label>
    ))

  const mostrar = (f, r) => {
    const v = r[f.key]
    if (v === null || v === undefined || v === '') return '—'
    if (f.type === 'date') return fmtFecha(v)
    if (f.type === 'select') {
      const o = f.options?.find((x) => String(x.value) === String(v))
      return o ? o.corto ?? o.label : v
    }
    return v
  }

  const visibles = fields.filter((f) => !f.hideInList)

  return (
    <section className="card">
      <div className="card-head">
        <h3>{title}</h3>
        {!abierto && puedeEditar && (
          <button className="btn" onClick={abrirAlta}>
            + Agregar
          </button>
        )}
      </div>

      {abierto && (
        <form className="form-grid" onSubmit={agregar}>
          {campos(form, setForm)}
          <div className="form-actions full">
            <button className="btn primary" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
            <button type="button" className="btn ghost" onClick={() => setAbierto(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}
      {msg && <p className="error">{msg}</p>}
      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : rows.length === 0 ? (
        <p className="muted">{empty || 'Todavía no hay registros.'}</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {visibles.map((f) => (
                  <th key={f.key}>{f.label}</th>
                ))}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) =>
                r.id === editId ? (
                  <tr key={r.id} className="fila-edicion">
                    <td colSpan={visibles.length + 1} className="celda-edicion">
                      <form className="form-grid editando" onSubmit={guardarEdicion}>
                        <p className="full editando-titulo">Editando</p>
                        {campos(editForm, setEditForm)}
                        {editMsg && <p className="error full">{editMsg}</p>}
                        <div className="form-actions full">
                          <button className="btn primary" disabled={guardando}>
                            {guardando ? 'Guardando…' : 'Guardar cambios'}
                          </button>
                          <button type="button" className="btn ghost" onClick={() => setEditId(null)}>
                            Cancelar
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                ) : (
                  <tr key={r.id} className={onVer ? 'clickable' : ''} onClick={onVer ? () => onVer(r) : undefined}>
                    {visibles.map((f) => (
                      <td key={f.key} data-label={f.label}>
                        {mostrar(f, r)}
                      </td>
                    ))}
                    <td className="acciones" onClick={(e) => e.stopPropagation()}>
                      {onVer && (
                        <button className="btn small primary" onClick={() => onVer(r)}>
                          {verLabel}
                        </button>
                      )}
                      {puedeEditar && (
                        <>
                          <button className="btn small ghost" onClick={() => editar(r)}>
                            Editar
                          </button>
                          <button className="btn small danger" onClick={() => borrar(r)}>
                            Borrar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export function Campo({ f, value, onChange }) {
  const v = value ?? ''
  if (f.type === 'select')
    return (
      <select value={v} required={f.required} onChange={(e) => onChange(e.target.value)}>
        <option value="">— Elegir —</option>
        {f.options?.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    )
  if (f.type === 'textarea')
    return <textarea rows={3} value={v} required={f.required} onChange={(e) => onChange(e.target.value)} />
  return (
    <input
      type={f.type || 'text'}
      step={f.type === 'number' ? 'any' : undefined}
      min={f.type === 'number' ? 0 : undefined}
      value={v}
      required={f.required}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export function traducirError(error) {
  const m = error?.message || String(error)
  if (m.includes('duplicate key')) return 'Ya existe un registro con ese dato (por ejemplo, el mismo CUIL, patente o código).'
  if (m.includes('violates foreign key')) return 'No se puede borrar: hay otros datos que dependen de este registro.'
  return m
}
