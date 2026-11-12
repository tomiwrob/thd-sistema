import { useEffect, useState } from 'react'
import CrudTable, { traducirError } from '../components/CrudTable'
import { supabase } from '../supabase'
import StockCards from '../components/StockCards'
import { MATERIALES, exportarExcel, fmtFecha, hoy, opciones, unidadDe, useRows } from '../util'

export default function Stock({ usuario }) {
  const [vista, setVista] = useState('Movimientos')
  const centros = useRows('centros_costo', { order: 'codigo' })
  const obras = useRows('obras', { order: 'fecha', ascending: false })
  const [stock, setStock] = useState([])
  const [version, setVersion] = useState(0)

  useEffect(() => {
    supabase
      .from('stock_caneria')
      .select('*')
      .then(({ data }) => setStock(data || []))
  }, [version])

  const refrescar = () => setVersion((v) => v + 1)
  const optCentros = opciones(centros.rows, (c) => `${c.codigo} · ${c.nombre}`)

  return (
    <div>
      <StockCards stock={stock} />

      <div className="subtabs">
        {['Movimientos', 'Obras'].map((s) => (
          <button key={s} className={s === vista ? 'active' : ''} onClick={() => setVista(s)}>
            {s}
          </button>
        ))}
      </div>

      {vista === 'Movimientos' ? (
        <Movimientos usuario={usuario} obras={obras.rows} centros={centros.rows} onChange={refrescar} />
      ) : (
        <CrudTable
          title="Obras"
          table="obras"
          order="fecha"
          ascending={false}
          onChange={obras.reload}
          fields={[
            { key: 'nombre', label: 'Obra', required: true },
            { key: 'cliente', label: 'Cliente' },
            { key: 'ubicacion', label: 'Ubicación' },
            { key: 'fecha', label: 'Fecha', type: 'date' },
            { key: 'centro_costo_id', label: 'Centro de costo', type: 'select', options: optCentros },
          ]}
        />
      )}
    </div>
  )
}

function Movimientos({ usuario, obras, centros, onChange }) {
  const vacio = () => ({ fecha: hoy(), tipo: 'egreso', material: MATERIALES[0], cantidad: '', obra_id: '', centro_costo_id: '', observaciones: '' })
  const [form, setForm] = useState(vacio)
  const [abierto, setAbierto] = useState(false)
  const [msg, setMsg] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [filtro, setFiltro] = useState({ material: '', obra_id: '', tipo: '' })
  const [movs, setMovs] = useState([])
  const [cargando, setCargando] = useState(true)

  const obra = (id) => obras.find((o) => o.id === id)
  const centro = (id) => centros.find((c) => c.id === id)

  async function cargar() {
    setCargando(true)
    let q = supabase.from('movimientos_caneria').select('*').order('fecha', { ascending: false }).order('id', { ascending: false })
    if (filtro.material) q = q.eq('material', filtro.material)
    if (filtro.obra_id) q = q.eq('obra_id', filtro.obra_id)
    if (filtro.tipo) q = q.eq('tipo', filtro.tipo)
    const { data, error } = await q.limit(1000)
    if (error) setMsg(error.message)
    setMovs(data || [])
    setCargando(false)
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  function elegirObra(id) {
    const o = obra(Number(id))
    setForm((f) => ({ ...f, obra_id: id, centro_costo_id: o?.centro_costo_id ? String(o.centro_costo_id) : f.centro_costo_id }))
  }

  async function guardar(e) {
    e.preventDefault()
    setGuardando(true)
    setMsg(null)
    const { error } = await supabase.from('movimientos_caneria').insert({
      fecha: form.fecha,
      tipo: form.tipo,
      material: form.material,
      cantidad: Number(form.cantidad),
      obra_id: form.obra_id ? Number(form.obra_id) : null,
      centro_costo_id: form.centro_costo_id ? Number(form.centro_costo_id) : null,
      observaciones: form.observaciones || null,
      usuario,
    })
    setGuardando(false)
    if (error) return setMsg(traducirError(error))
    setForm(vacio())
    setAbierto(false)
    cargar()
    onChange()
  }

  async function borrar(m) {
    if (!window.confirm('¿Eliminar este movimiento? El stock se recalcula.')) return
    const { error } = await supabase.from('movimientos_caneria').delete().eq('id', m.id)
    if (error) return setMsg(traducirError(error))
    cargar()
    onChange()
  }

  function exportar() {
    exportarExcel(`Movimientos_caneria_${hoy()}.xlsx`, {
      Movimientos: movs.map((m) => ({
        Fecha: fmtFecha(m.fecha),
        Tipo: m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso',
        Material: m.material,
        Cantidad: Number(m.cantidad),
        Unidad: unidadDe(m.material),
        Obra: obra(m.obra_id)?.nombre || '',
        Cliente: obra(m.obra_id)?.cliente || '',
        Ubicación: obra(m.obra_id)?.ubicacion || '',
        'Centro de costo': centro(m.centro_costo_id)?.codigo || '',
        Observaciones: m.observaciones || '',
        'Cargado por': m.usuario || '',
      })),
    })
  }

  return (
    <section className="card">
      <div className="card-head">
        <h3>Ingresos y egresos de cañería</h3>
        <div className="row-gap">
          <button className="btn ghost" onClick={exportar} disabled={!movs.length}>
            ⬇ Excel
          </button>
          {!abierto && (
            <button className="btn primary" onClick={() => setAbierto(true)}>
              + Movimiento
            </button>
          )}
        </div>
      </div>

      {abierto && (
        <form className="form-grid" onSubmit={guardar}>
          <div className="full toggle">
            <button type="button" className={form.tipo === 'ingreso' ? 'on in' : ''} onClick={() => set('tipo', 'ingreso')}>
              ↑ Ingreso
            </button>
            <button type="button" className={form.tipo === 'egreso' ? 'on out' : ''} onClick={() => set('tipo', 'egreso')}>
              ↓ Egreso
            </button>
          </div>
          <label>
            <span>Fecha *</span>
            <input type="date" required value={form.fecha} onChange={(e) => set('fecha', e.target.value)} />
          </label>
          <label>
            <span>Material *</span>
            <select value={form.material} onChange={(e) => set('material', e.target.value)}>
              {MATERIALES.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Cantidad ({unidadDe(form.material)}) *</span>
            <input type="number" min="0" step="any" required value={form.cantidad} onChange={(e) => set('cantidad', e.target.value)} />
          </label>
          <label>
            <span>Obra</span>
            <select value={form.obra_id} onChange={(e) => elegirObra(e.target.value)}>
              <option value="">— Sin obra (depósito) —</option>
              {obras.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombre} {o.cliente ? `· ${o.cliente}` : ''}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Centro de costo</span>
            <select value={form.centro_costo_id} onChange={(e) => set('centro_costo_id', e.target.value)}>
              <option value="">— Elegir —</option>
              {centros.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.codigo} · {c.nombre}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Observaciones</span>
            <input value={form.observaciones} onChange={(e) => set('observaciones', e.target.value)} />
          </label>
          <div className="form-actions full">
            <button className="btn primary" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar movimiento'}
            </button>
            <button type="button" className="btn ghost" onClick={() => { setAbierto(false); setForm(vacio()) }}>
              Cancelar
            </button>
          </div>
        </form>
      )}
      {msg && <p className="error">{msg}</p>}

      <div className="filtros">
        <select value={filtro.material} onChange={(e) => setFiltro({ ...filtro, material: e.target.value })}>
          <option value="">Todos los materiales</option>
          {MATERIALES.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <select value={filtro.tipo} onChange={(e) => setFiltro({ ...filtro, tipo: e.target.value })}>
          <option value="">Ingresos y egresos</option>
          <option value="ingreso">Sólo ingresos</option>
          <option value="egreso">Sólo egresos</option>
        </select>
        <select value={filtro.obra_id} onChange={(e) => setFiltro({ ...filtro, obra_id: e.target.value })}>
          <option value="">Todas las obras</option>
          {obras.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nombre}
            </option>
          ))}
        </select>
      </div>

      {cargando ? (
        <p className="muted">Cargando…</p>
      ) : movs.length === 0 ? (
        <p className="muted">No hay movimientos cargados.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Material</th>
                <th>Cantidad</th>
                <th>Obra</th>
                <th>Cliente</th>
                <th>C. costo</th>
                <th>Obs.</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {movs.map((m) => (
                <tr key={m.id}>
                  <td data-label="Fecha">{fmtFecha(m.fecha)}</td>
                  <td data-label="Tipo">
                    <span className={`pill ${m.tipo}`}>{m.tipo === 'ingreso' ? '↑ Ingreso' : '↓ Egreso'}</span>
                  </td>
                  <td data-label="Material">{m.material}</td>
                  <td data-label="Cantidad">
                    {Number(m.cantidad).toLocaleString('es-AR')} {unidadDe(m.material)}
                  </td>
                  <td data-label="Obra">{obra(m.obra_id)?.nombre || '—'}</td>
                  <td data-label="Cliente">{obra(m.obra_id)?.cliente || '—'}</td>
                  <td data-label="C. costo">{centro(m.centro_costo_id)?.codigo || '—'}</td>
                  <td data-label="Obs.">{m.observaciones || '—'}</td>
                  <td className="acciones">
                    <button className="btn small danger" onClick={() => borrar(m)}>
                      Borrar
                    </button>
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
