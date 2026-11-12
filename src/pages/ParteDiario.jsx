import { useEffect, useMemo, useState } from 'react'
import { traducirError } from '../components/CrudTable'
import { supabase } from '../supabase'
import { comprimirImagen, exportarExcel, fmtFecha, hoy, nombreCompleto, useRows } from '../util'

const TIPOS_FOTO = {
  remito_vactor: 'Remitos de vactor',
  planilla_perforacion: 'Planillas de perforación',
  ats: 'Análisis de tareas seguras (ATS)',
}

const inicioMes = () => hoy().slice(0, 8) + '01'

export default function ParteDiario({ usuario }) {
  const [modo, setModo] = useState({ tipo: 'lista' })
  const datos = {
    centros: useRows('centros_costo', { order: 'codigo' }),
    equipos: useRows('equipos', { order: 'nombre' }),
    obras: useRows('obras', { order: 'fecha', ascending: false }),
    personal: useRows('personal', { order: 'apellido' }),
  }

  if (modo.tipo === 'nuevo')
    return <NuevoParte datos={datos} usuario={usuario} onListo={() => setModo({ tipo: 'lista' })} />
  if (modo.tipo === 'ver') return <VerParte id={modo.id} datos={datos} onVolver={() => setModo({ tipo: 'lista' })} />
  return <ListaPartes datos={datos} onNuevo={() => setModo({ tipo: 'nuevo' })} onVer={(id) => setModo({ tipo: 'ver', id })} />
}

/* ---------------------------------------------------------------- Lista */

function ListaPartes({ datos, onNuevo, onVer }) {
  const [desde, setDesde] = useState(inicioMes())
  const [hasta, setHasta] = useState(hoy())
  const [obraId, setObraId] = useState('')
  const [partes, setPartes] = useState([])
  const [personal, setPersonal] = useState([])
  const [fotos, setFotos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [msg, setMsg] = useState(null)

  const { obras, equipos, centros } = datos
  const obra = (id) => obras.rows.find((o) => o.id === id)
  const equipo = (id) => equipos.rows.find((e) => e.id === id)
  const centro = (id) => centros.rows.find((c) => c.id === id)

  async function cargar() {
    setCargando(true)
    let q = supabase.from('partes_diarios').select('*').gte('fecha', desde).lte('fecha', hasta)
    if (obraId) q = q.eq('obra_id', obraId)
    const { data, error } = await q.order('fecha', { ascending: false }).order('id', { ascending: false })
    if (error) setMsg(error.message)
    const ids = (data || []).map((p) => p.id)
    const [pp, pf] = ids.length
      ? await Promise.all([
          supabase.from('parte_personal').select('*').in('parte_id', ids).order('apellido'),
          supabase.from('parte_fotos').select('id,parte_id,tipo').in('parte_id', ids),
        ])
      : [{ data: [] }, { data: [] }]
    setPartes(data || [])
    setPersonal(pp.data || [])
    setFotos(pf.data || [])
    setCargando(false)
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desde, hasta, obraId])

  const cuenta = (parteId, tipo) => fotos.filter((f) => f.parte_id === parteId && (!tipo || f.tipo === tipo)).length

  async function borrar(p) {
    if (!window.confirm(`¿Eliminar el parte del ${fmtFecha(p.fecha)}? También se borran sus fotos.`)) return
    const { data: fs } = await supabase.from('parte_fotos').select('path').eq('parte_id', p.id)
    if (fs?.length) await supabase.storage.from('fotos').remove(fs.map((f) => f.path))
    const { error } = await supabase.from('partes_diarios').delete().eq('id', p.id)
    if (error) return setMsg(traducirError(error))
    cargar()
  }

  function exportar() {
    const base = (p) => ({
      Fecha: fmtFecha(p.fecha),
      Obra: obra(p.obra_id)?.nombre || '',
      Cliente: p.cliente || '',
      Ubicación: obra(p.obra_id)?.ubicacion || '',
      'Centro de costo': centro(p.centro_costo_id)?.codigo || '',
      Equipo: equipo(p.equipo_id)?.nombre || '',
    })
    const filasPartes = partes.map((p) => {
      const gente = personal.filter((x) => x.parte_id === p.id)
      return {
        ...base(p),
        'Cant. personal': gente.length,
        Personal: gente.map((g) => `${g.apellido}, ${g.nombre} (DNI ${g.dni})`).join(' / '),
        'Vactor contratado': p.vactor_contratado ? 'Sí' : 'No',
        'Fotos remitos vactor': cuenta(p.id, 'remito_vactor'),
        'Fotos planillas perforación': cuenta(p.id, 'planilla_perforacion'),
        'Fotos ATS': cuenta(p.id, 'ats'),
        'Tareas realizadas': p.tareas || '',
        Observaciones: p.observaciones || '',
        'Cargado por': p.usuario || '',
      }
    })
    const filasPersonal = partes.flatMap((p) =>
      personal
        .filter((x) => x.parte_id === p.id)
        .map((g) => ({ ...base(p), Apellido: g.apellido, Nombre: g.nombre, DNI: g.dni })),
    )
    exportarExcel(`Partes_diarios_${desde}_a_${hasta}.xlsx`, {
      'Partes diarios': filasPartes,
      Personal: filasPersonal,
    })
  }

  return (
    <section className="card">
      <div className="card-head">
        <h3>Partes diarios</h3>
        <div className="row-gap">
          <button className="btn ghost" onClick={exportar} disabled={!partes.length}>
            ⬇ Excel
          </button>
          <button className="btn primary" onClick={onNuevo}>
            + Nuevo parte
          </button>
        </div>
      </div>

      <div className="filtros">
        <label>
          <span>Desde</span>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </label>
        <label>
          <span>Hasta</span>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </label>
        <label>
          <span>Obra</span>
          <select value={obraId} onChange={(e) => setObraId(e.target.value)}>
            <option value="">Todas</option>
            {obras.rows.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>
      {msg && <p className="error">{msg}</p>}

      {cargando ? (
        <p className="muted">Cargando…</p>
      ) : partes.length === 0 ? (
        <p className="muted">No hay partes en estas fechas.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Obra</th>
                <th>Cliente</th>
                <th>Equipo</th>
                <th>Personal</th>
                <th>Fotos</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {partes.map((p) => (
                <tr key={p.id}>
                  <td data-label="Fecha">{fmtFecha(p.fecha)}</td>
                  <td data-label="Obra">{obra(p.obra_id)?.nombre || '—'}</td>
                  <td data-label="Cliente">{p.cliente || '—'}</td>
                  <td data-label="Equipo">{equipo(p.equipo_id)?.nombre || '—'}</td>
                  <td data-label="Personal">{personal.filter((x) => x.parte_id === p.id).length}</td>
                  <td data-label="Fotos">{cuenta(p.id)}</td>
                  <td className="acciones">
                    <button className="btn small" onClick={() => onVer(p.id)}>
                      Ver
                    </button>
                    <button className="btn small danger" onClick={() => borrar(p)}>
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

/* ---------------------------------------------------------------- Nuevo */

function NuevoParte({ datos, usuario, onListo }) {
  const { obras, equipos, centros, personal } = datos
  const [f, setF] = useState({
    fecha: hoy(),
    obra_id: '',
    cliente: '',
    centro_costo_id: '',
    equipo_id: '',
    vactor_contratado: false,
    tareas: '',
    observaciones: '',
  })
  const [presentes, setPresentes] = useState([]) // [{ personal_id, nombre, apellido, dni }]
  const [extra, setExtra] = useState({ nombre: '', apellido: '', dni: '' })
  const [archivos, setArchivos] = useState({ remito_vactor: [], planilla_perforacion: [], ats: [] })
  const [estado, setEstado] = useState(null)
  const [msg, setMsg] = useState(null)

  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const equiposFiltrados = equipos.rows.filter((e) => !f.centro_costo_id || String(e.centro_costo_id) === String(f.centro_costo_id))

  function elegirObra(id) {
    const o = obras.rows.find((x) => String(x.id) === String(id))
    setF((x) => ({
      ...x,
      obra_id: id,
      cliente: o?.cliente || x.cliente,
      centro_costo_id: o?.centro_costo_id ? String(o.centro_costo_id) : x.centro_costo_id,
    }))
  }

  function elegirEquipo(id) {
    const e = equipos.rows.find((x) => String(x.id) === String(id))
    setF((x) => ({ ...x, equipo_id: id, centro_costo_id: e ? String(e.centro_costo_id) : x.centro_costo_id }))
    const delEquipo = personal.rows.filter((p) => String(p.equipo_id) === String(id))
    setPresentes(delEquipo.map((p) => ({ personal_id: p.id, nombre: p.nombre, apellido: p.apellido, dni: p.dni })))
  }

  const estaPresente = (p) => presentes.some((x) => x.personal_id === p.id)
  const togglePersona = (p) =>
    setPresentes((xs) =>
      estaPresente(p)
        ? xs.filter((x) => x.personal_id !== p.id)
        : [...xs, { personal_id: p.id, nombre: p.nombre, apellido: p.apellido, dni: p.dni }],
    )

  const delEquipo = personal.rows.filter((p) => f.equipo_id && String(p.equipo_id) === String(f.equipo_id))
  const otros = personal.rows.filter((p) => !delEquipo.includes(p) && !estaPresente(p))
  const agregadosFuera = presentes.filter((x) => !delEquipo.some((p) => p.id === x.personal_id))

  function agregarExtra() {
    if (!extra.nombre || !extra.apellido || !extra.dni) return setMsg('Completá nombre, apellido y DNI.')
    setMsg(null)
    setPresentes((xs) => [...xs, { personal_id: null, ...extra }])
    setExtra({ nombre: '', apellido: '', dni: '' })
  }

  async function guardar(e) {
    e.preventDefault()
    setMsg(null)
    if (!presentes.length && !window.confirm('El parte no tiene personal cargado. ¿Guardar igual?')) return
    setEstado('Guardando parte…')
    const { data: parte, error } = await supabase
      .from('partes_diarios')
      .insert({
        fecha: f.fecha,
        obra_id: f.obra_id ? Number(f.obra_id) : null,
        cliente: f.cliente || null,
        centro_costo_id: f.centro_costo_id ? Number(f.centro_costo_id) : null,
        equipo_id: f.equipo_id ? Number(f.equipo_id) : null,
        vactor_contratado: f.vactor_contratado,
        tareas: f.tareas || null,
        observaciones: f.observaciones || null,
        usuario,
      })
      .select()
      .single()
    if (error) {
      setEstado(null)
      return setMsg(traducirError(error))
    }

    if (presentes.length) {
      const { error: e2 } = await supabase.from('parte_personal').insert(presentes.map((p) => ({ ...p, parte_id: parte.id })))
      if (e2) {
        setEstado(null)
        return setMsg('El parte se guardó pero falló el personal: ' + e2.message)
      }
    }

    const lista = Object.entries(archivos)
      .filter(([tipo]) => tipo !== 'remito_vactor' || f.vactor_contratado)
      .flatMap(([tipo, fs]) => fs.map((file) => ({ tipo, file })))
    const fallos = []
    for (let i = 0; i < lista.length; i++) {
      const { tipo, file } = lista[i]
      setEstado(`Subiendo fotos ${i + 1} de ${lista.length}…`)
      const { blob, ext } = await comprimirImagen(file)
      const path = `partes/${parte.id}/${tipo}-${Date.now()}-${i}.${ext}`
      const up = await supabase.storage.from('fotos').upload(path, blob, { contentType: blob.type || 'image/jpeg' })
      if (up.error) {
        fallos.push(file.name)
        continue
      }
      await supabase.from('parte_fotos').insert({ parte_id: parte.id, tipo, path })
    }
    setEstado(null)
    if (fallos.length) window.alert(`El parte se guardó, pero no se pudieron subir: ${fallos.join(', ')}`)
    onListo()
  }

  return (
    <form className="card" onSubmit={guardar}>
      <div className="card-head">
        <h3>Nuevo parte diario</h3>
        <button type="button" className="btn ghost" onClick={onListo}>
          ← Volver
        </button>
      </div>

      <h4>Datos de la obra</h4>
      <div className="form-grid">
        <label>
          <span>Fecha *</span>
          <input type="date" required value={f.fecha} onChange={(e) => set('fecha', e.target.value)} />
        </label>
        <label>
          <span>Obra</span>
          <select value={f.obra_id} onChange={(e) => elegirObra(e.target.value)}>
            <option value="">— Elegir —</option>
            {obras.rows.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Cliente *</span>
          <input required value={f.cliente} onChange={(e) => set('cliente', e.target.value)} />
        </label>
        <label>
          <span>Centro de costo</span>
          <select value={f.centro_costo_id} onChange={(e) => set('centro_costo_id', e.target.value)}>
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
          <select value={f.equipo_id} onChange={(e) => elegirEquipo(e.target.value)}>
            <option value="">— Elegir —</option>
            {equiposFiltrados.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>

      <h4>Personal presente ({presentes.length})</h4>
      {f.equipo_id ? (
        delEquipo.length ? (
          <div className="checks">
            {delEquipo.map((p) => (
              <label key={p.id} className="check">
                <input type="checkbox" checked={estaPresente(p)} onChange={() => togglePersona(p)} />
                <span>
                  {nombreCompleto(p)} <small>DNI {p.dni}</small>
                </span>
              </label>
            ))}
          </div>
        ) : (
          <p className="muted">Este equipo no tiene personal cargado.</p>
        )
      ) : (
        <p className="muted">Elegí un equipo para cargar su personal automáticamente.</p>
      )}

      {agregadosFuera.length > 0 && (
        <ul className="chips">
          {agregadosFuera.map((p, i) => (
            <li key={i}>
              {p.apellido}, {p.nombre} · DNI {p.dni}
              <button type="button" onClick={() => setPresentes((xs) => xs.filter((x) => x !== p))}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="form-grid compact">
        <label>
          <span>Agregar persona de otro equipo</span>
          <select
            value=""
            onChange={(e) => {
              const p = personal.rows.find((x) => String(x.id) === e.target.value)
              if (p) togglePersona(p)
            }}
          >
            <option value="">— Elegir —</option>
            {otros.map((p) => (
              <option key={p.id} value={p.id}>
                {nombreCompleto(p)} · DNI {p.dni}
              </option>
            ))}
          </select>
        </label>
      </div>
      <details className="extra">
        <summary>Agregar persona que no está en la base</summary>
        <div className="form-grid compact">
          <label>
            <span>Apellido</span>
            <input value={extra.apellido} onChange={(e) => setExtra({ ...extra, apellido: e.target.value })} />
          </label>
          <label>
            <span>Nombre</span>
            <input value={extra.nombre} onChange={(e) => setExtra({ ...extra, nombre: e.target.value })} />
          </label>
          <label>
            <span>DNI</span>
            <input value={extra.dni} inputMode="numeric" onChange={(e) => setExtra({ ...extra, dni: e.target.value })} />
          </label>
          <div className="form-actions">
            <button type="button" className="btn" onClick={agregarExtra}>
              Agregar
            </button>
          </div>
        </div>
      </details>

      <h4>Fotos</h4>
      <label className="check vactor">
        <input type="checkbox" checked={f.vactor_contratado} onChange={(e) => set('vactor_contratado', e.target.checked)} />
        <span>Se contrató vactor</span>
      </label>
      <div className="fotos-grid">
        {Object.entries(TIPOS_FOTO)
          .filter(([tipo]) => tipo !== 'remito_vactor' || f.vactor_contratado)
          .map(([tipo, label]) => (
            <SelectorFotos
              key={tipo}
              label={label}
              files={archivos[tipo]}
              onChange={(fs) => setArchivos((a) => ({ ...a, [tipo]: fs }))}
            />
          ))}
      </div>

      <h4>Detalle del día</h4>
      <div className="form-grid">
        <label className="full">
          <span>Tareas realizadas</span>
          <textarea rows={3} value={f.tareas} onChange={(e) => set('tareas', e.target.value)} />
        </label>
        <label className="full">
          <span>Observaciones</span>
          <textarea rows={2} value={f.observaciones} onChange={(e) => set('observaciones', e.target.value)} />
        </label>
      </div>

      {msg && <p className="error">{msg}</p>}
      <div className="form-actions sticky">
        <button className="btn primary big" disabled={!!estado}>
          {estado || 'Guardar parte diario'}
        </button>
      </div>
    </form>
  )
}

function SelectorFotos({ label, files, onChange }) {
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files])
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews])

  return (
    <div className="foto-box">
      <div className="foto-head">
        <strong>{label}</strong>
        <label className="btn small">
          + Fotos
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              onChange([...files, ...Array.from(e.target.files || [])])
              e.target.value = ''
            }}
          />
        </label>
      </div>
      {files.length === 0 ? (
        <p className="muted small">Sin fotos</p>
      ) : (
        <div className="thumbs">
          {previews.map((u, i) => (
            <div key={u} className="thumb">
              <img src={u} alt="" />
              <button type="button" onClick={() => onChange(files.filter((_, j) => j !== i))}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------------------------------------------------------------- Ver */

function VerParte({ id, datos, onVolver }) {
  const [parte, setParte] = useState(null)
  const [gente, setGente] = useState([])
  const [fotos, setFotos] = useState([])
  const { obras, equipos, centros } = datos

  useEffect(() => {
    ;(async () => {
      const [p, pp, pf] = await Promise.all([
        supabase.from('partes_diarios').select('*').eq('id', id).single(),
        supabase.from('parte_personal').select('*').eq('parte_id', id).order('apellido'),
        supabase.from('parte_fotos').select('*').eq('parte_id', id).order('id'),
      ])
      setParte(p.data)
      setGente(pp.data || [])
      const lista = pf.data || []
      if (lista.length) {
        const { data: urls } = await supabase.storage.from('fotos').createSignedUrls(
          lista.map((f) => f.path),
          60 * 60,
        )
        setFotos(lista.map((f, i) => ({ ...f, url: urls?.[i]?.signedUrl })))
      }
    })()
  }, [id])

  if (!parte) return <p className="muted">Cargando…</p>
  const obra = obras.rows.find((o) => o.id === parte.obra_id)

  return (
    <section className="card">
      <div className="card-head">
        <h3>Parte diario · {fmtFecha(parte.fecha)}</h3>
        <button className="btn ghost" onClick={onVolver}>
          ← Volver
        </button>
      </div>
      <dl className="ficha">
        <dt>Obra</dt>
        <dd>{obra?.nombre || '—'}</dd>
        <dt>Cliente</dt>
        <dd>{parte.cliente || '—'}</dd>
        <dt>Ubicación</dt>
        <dd>{obra?.ubicacion || '—'}</dd>
        <dt>Centro de costo</dt>
        <dd>{centros.rows.find((c) => c.id === parte.centro_costo_id)?.codigo || '—'}</dd>
        <dt>Equipo</dt>
        <dd>{equipos.rows.find((e) => e.id === parte.equipo_id)?.nombre || '—'}</dd>
        <dt>Vactor</dt>
        <dd>{parte.vactor_contratado ? 'Sí' : 'No'}</dd>
        <dt>Tareas</dt>
        <dd className="pre">{parte.tareas || '—'}</dd>
        <dt>Observaciones</dt>
        <dd className="pre">{parte.observaciones || '—'}</dd>
        <dt>Cargado por</dt>
        <dd>{parte.usuario || '—'}</dd>
      </dl>

      <h4>Personal ({gente.length})</h4>
      {gente.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Apellido</th>
                <th>Nombre</th>
                <th>DNI</th>
              </tr>
            </thead>
            <tbody>
              {gente.map((g) => (
                <tr key={g.id}>
                  <td data-label="Apellido">{g.apellido}</td>
                  <td data-label="Nombre">{g.nombre}</td>
                  <td data-label="DNI">{g.dni}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">Sin personal cargado.</p>
      )}

      {Object.entries(TIPOS_FOTO).map(([tipo, label]) => {
        const fs = fotos.filter((f) => f.tipo === tipo)
        if (!fs.length) return null
        return (
          <div key={tipo}>
            <h4>
              {label} ({fs.length})
            </h4>
            <div className="thumbs big">
              {fs.map((f) => (
                <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="thumb">
                  <img src={f.url} alt={label} loading="lazy" />
                </a>
              ))}
            </div>
          </div>
        )
      })}
    </section>
  )
}
