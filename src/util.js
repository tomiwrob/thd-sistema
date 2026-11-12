import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

export const MATERIALES = [
  'PEAD PN8 110mm',
  'PEAD PN8 160mm',
  'PEAD PN8 200mm',
  'PEAD PN8 250mm',
  'Rollo tritubo',
]

export const unidadDe = (material) => (material === 'Rollo tritubo' ? 'rollos' : 'caños')

export const hoy = () => {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

export const fmtFecha = (f) => {
  if (!f) return ''
  const [a, m, d] = String(f).slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}

export const nombreCompleto = (p) => (p ? `${p.apellido}, ${p.nombre}` : '')

/** Carga todas las filas de una tabla y permite recargarlas. */
export function useRows(table, { order = 'id', ascending = true, filter } = {}) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const filterKey = JSON.stringify(filter || {})

  const reload = useCallback(async () => {
    setLoading(true)
    let q = supabase.from(table).select('*').order(order, { ascending })
    for (const [k, v] of Object.entries(JSON.parse(filterKey))) q = q.eq(k, v)
    const { data, error } = await q
    if (error) setError(error.message)
    else {
      setError(null)
      setRows(data || [])
    }
    setLoading(false)
  }, [table, order, ascending, filterKey])

  useEffect(() => {
    reload()
  }, [reload])

  return { rows, loading, error, reload }
}

export const opciones = (rows, label) => rows.map((r) => ({ value: r.id, label: label(r) }))

export async function exportarExcel(nombreArchivo, hojas) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  for (const [nombre, filas] of Object.entries(hojas)) {
    const ws = XLSX.utils.json_to_sheet(filas.length ? filas : [{ '': 'Sin datos' }])
    const cols = Object.keys(filas[0] || { '': '' })
    ws['!cols'] = cols.map((c) => ({
      wch: Math.min(60, Math.max(c.length, ...filas.map((f) => String(f[c] ?? '').length)) + 2),
    }))
    XLSX.utils.book_append_sheet(wb, ws, nombre.slice(0, 31))
  }
  XLSX.writeFile(wb, nombreArchivo)
}

/** Achica las fotos antes de subirlas (ahorra datos en obra). */
export async function comprimirImagen(file, max = 1600, calidad = 0.8) {
  if (!file.type.startsWith('image/')) return { blob: file, ext: file.name.split('.').pop() || 'bin' }
  try {
    const bmp = await createImageBitmap(file)
    const escala = Math.min(1, max / Math.max(bmp.width, bmp.height))
    const c = document.createElement('canvas')
    c.width = Math.round(bmp.width * escala)
    c.height = Math.round(bmp.height * escala)
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height)
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', calidad))
    if (blob) return { blob, ext: 'jpg' }
  } catch {
    /* formato no soportado por el navegador: se sube el original */
  }
  return { blob: file, ext: file.name.split('.').pop() || 'jpg' }
}
