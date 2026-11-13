import { MATERIALES, unidadDe } from '../util'

export default function StockCards({ stock }) {
  return (
    <div className="stock-cards">
      {MATERIALES.map((m) => {
        const s = stock.find((x) => x.material === m)
        const n = Number(s?.stock || 0)
        return (
          <div key={m} className={`stock-card ${n < 0 ? 'neg' : ''}`}>
            <div className="stock-mat">{m}</div>
            <div className="stock-num">{n.toLocaleString('es-AR')}</div>
            <div className="stock-sub">
              {unidadDe(m)} ·{' '}
              <span className="sube" title="Ingresos">
                ↑ {Number(s?.ingresos || 0).toLocaleString('es-AR')}
              </span>{' '}
              <span className="baja" title="Egresos">
                ↓ {Number(s?.egresos || 0).toLocaleString('es-AR')}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
