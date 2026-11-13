import { useEffect, useState } from 'react'
import StockCards from '../components/StockCards'
import ResumenEquipo from '../components/ResumenEquipo'
import { supabase } from '../supabase'
import { fmtFecha, hoy } from '../util'

const sumar = (rows) => rows.reduce((t, r) => t + Number(r.cantidad || 0), 0)

export default function Dashboard({ ir }) {
  const [d, setD] = useState(null)
  const [error, setError] = useState(null)
  const [verEquipo, setVerEquipo] = useState(null)

  useEffect(() => {
    ;(async () => {
      const inicioMes = hoy().slice(0, 8) + '01'
      const hace30 = new Date(Date.now() - 29 * 864e5)
      hace30.setMinutes(hace30.getMinutes() - hace30.getTimezoneOffset())
      const desde = hace30.toISOString().slice(0, 10) < inicioMes ? hace30.toISOString().slice(0, 10) : inicioMes

      const consultas = {
        stock: supabase.from('stock_caneria').select('*'),
        partes: supabase.from('partes_diarios').select('*').gte('fecha', desde).order('fecha', { ascending: false }).order('id', { ascending: false }),
        centros: supabase.from('centros_costo').select('*').order('codigo'),
        equipos: supabase.from('equipos').select('*'),
        obras: supabase.from('obras').select('id,nombre'),
        herramientas: supabase.from('herramientas').select('equipo_id,cantidad'),
        epp: supabase.from('epp').select('equipo_id,cantidad'),
        maquinas: supabase.from('maquinas').select('id,equipo_id'),
        accesorios: supabase.from('accesorios_maquina').select('maquina_id,cantidad'),
        vehiculos: supabase.from('vehiculos').select('id,equipo_id'),
        personal: supabase.from('personal').select('id,equipo_id'),
      }
      const claves = Object.keys(consultas)
      const res = await Promise.all(Object.values(consultas))
      const err = res.find((r) => r.error)
      if (err) return setError(err.error.message)
      const datos = Object.fromEntries(claves.map((k, i) => [k, res[i].data || []]))

      const ids = datos.partes.map((p) => p.id)
      const pp = ids.length ? await supabase.from('parte_personal').select('parte_id').in('parte_id', ids) : { data: [] }
      datos.partePersonal = pp.data || []
      datos.inicioMes = inicioMes
      setD(datos)
    })()
  }, [])

  if (error) return <p className="error">{error}</p>
  if (!d) return <p className="muted">Cargando resumen…</p>

  const hoyStr = hoy()
  const partesMes = d.partes.filter((p) => p.fecha >= d.inicioMes)
  const partesHoy = d.partes.filter((p) => p.fecha === hoyStr)
  const personasDe = (ids) => d.partePersonal.filter((x) => ids.includes(x.parte_id)).length
  const equipo = (id) => d.equipos.find((e) => e.id === id)
  const centro = (id) => d.centros.find((c) => c.id === id)
  const obra = (id) => d.obras.find((o) => o.id === id)

  // Partes por día (últimos 14 días)
  const dias = Array.from({ length: 14 }, (_, i) => {
    const f = new Date(Date.now() - (13 - i) * 864e5)
    f.setMinutes(f.getMinutes() - f.getTimezoneOffset())
    const iso = f.toISOString().slice(0, 10)
    return { iso, n: d.partes.filter((p) => p.fecha === iso).length }
  })
  const maxDia = Math.max(1, ...dias.map((x) => x.n))

  // Partes del mes por centro de costo
  const porCentro = d.centros
    .map((c) => {
      const ps = partesMes.filter((p) => p.centro_costo_id === c.id)
      return { c, partes: ps.length, personas: personasDe(ps.map((p) => p.id)) }
    })
    .filter((x) => x.partes > 0)

  // Stock por equipo / máquina
  const filasEquipos = d.equipos
    .map((e) => {
      const maqIds = d.maquinas.filter((m) => m.equipo_id === e.id).map((m) => m.id)
      return {
        e,
        c: centro(e.centro_costo_id),
        personal: d.personal.filter((p) => p.equipo_id === e.id).length,
        vehiculos: d.vehiculos.filter((v) => v.equipo_id === e.id).length,
        herramientas: sumar(d.herramientas.filter((h) => h.equipo_id === e.id)),
        epp: sumar(d.epp.filter((x) => x.equipo_id === e.id)),
        accesorios: sumar(d.accesorios.filter((a) => maqIds.includes(a.maquina_id))),
      }
    })
    .sort((a, b) => (a.c?.codigo || '').localeCompare(b.c?.codigo || ''))

  return (
    <div className="dash">
      <div className="kpis">
        <Kpi titulo="Partes hoy" valor={partesHoy.length} />
        <Kpi titulo="Personal en obra hoy" valor={personasDe(partesHoy.map((p) => p.id))} />
        <Kpi titulo="Partes este mes" valor={partesMes.length} />
        <Kpi titulo="Último parte" valor={d.partes[0] ? fmtFecha(d.partes[0].fecha) : '—'} chico />
      </div>

      <section className="card">
        <div className="card-head">
          <h3>Stock actual de cañería</h3>
          <button className="btn small" onClick={() => ir('stock')}>
            Ver movimientos
          </button>
        </div>
        <StockCards stock={d.stock} />
      </section>

      <div className="dash-grid">
        <section className="card">
          <div className="card-head">
            <h3>Partes diarios · últimos 14 días</h3>
            <button className="btn small" onClick={() => ir('parte')}>
              Ver partes
            </button>
          </div>
          <div className="barras">
            {dias.map((x) => (
              <div key={x.iso} className="barra" title={`${fmtFecha(x.iso)}: ${x.n} partes`}>
                <span className="barra-n">{x.n || ''}</span>
                <div className="barra-fill" style={{ height: `${(x.n / maxDia) * 100}%` }} />
                <span className="barra-dia">{x.iso.slice(8, 10)}</span>
              </div>
            ))}
          </div>

          <h4>Este mes por centro de costo</h4>
          {porCentro.length === 0 ? (
            <p className="muted">Todavía no hay partes cargados este mes.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Centro de costo</th>
                    <th>Partes</th>
                    <th>Personas-día</th>
                  </tr>
                </thead>
                <tbody>
                  {porCentro.map((x) => (
                    <tr key={x.c.id}>
                      <td data-label="Centro">{x.c.nombre}</td>
                      <td data-label="Partes">{x.partes}</td>
                      <td data-label="Personas-día">{x.personas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h3>Últimos partes</h3>
          </div>
          {d.partes.length === 0 ? (
            <p className="muted">No hay partes en los últimos 30 días.</p>
          ) : (
            <ul className="ultimos">
              {d.partes.slice(0, 8).map((p) => (
                <li key={p.id}>
                  <span className="ult-fecha">{fmtFecha(p.fecha)}</span>
                  <span className="ult-txt">
                    <strong>{p.ubicacion || obra(p.obra_id)?.nombre || 'Sin ubicación'}</strong>
                    <small>
                      {p.cliente ? `${p.cliente} · ` : ''}{equipo(p.equipo_id)?.nombre || '—'} · {personasDe([p.id])} personas
                    </small>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <h3>Resumen por equipo</h3>
          <button className="btn small" onClick={() => ir('equipos')}>
            Ver detalle
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Centro de costo</th>
                <th>Equipo</th>
                <th>Personal</th>
                <th>Vehículos</th>
                <th>Herramientas</th>
                <th>EPP</th>
                <th>Accesorios máquinas</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filasEquipos.map((x) => (
                <tr key={x.e.id} className="clickable" onClick={() => setVerEquipo(x.e.id)}>
                  <td data-label="Centro">{x.c?.codigo || '—'}</td>
                  <td data-label="Equipo">
                    <strong>{x.e.nombre}</strong>
                  </td>
                  <td data-label="Personal">{x.personal}</td>
                  <td data-label="Vehículos">{x.vehiculos}</td>
                  <td data-label="Herramientas">{x.herramientas.toLocaleString('es-AR')}</td>
                  <td data-label="EPP">{x.epp.toLocaleString('es-AR')}</td>
                  <td data-label="Accesorios">{x.accesorios.toLocaleString('es-AR')}</td>
                  <td className="acciones">
                    <button className="btn small primary">Ver equipo</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">Herramientas, EPP y accesorios en unidades totales. Tocá un equipo para ver su personal.</p>
      </section>
      {verEquipo && <ResumenEquipo equipoId={verEquipo} onClose={() => setVerEquipo(null)} />}
    </div>
  )
}

function Kpi({ titulo, valor, chico }) {
  return (
    <div className="kpi">
      <span className="kpi-t">{titulo}</span>
      <span className={`kpi-v ${chico ? 'chico' : ''}`}>{valor}</span>
    </div>
  )
}
