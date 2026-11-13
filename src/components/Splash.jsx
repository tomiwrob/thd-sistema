import { useEffect, useState } from 'react'
import logoCapas from './logoCapas'

/** Pantalla de carga: la T del logo se arma y aparece el círculo celeste. */
export default function Splash() {
  const reducido = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const [fase, setFase] = useState('visible') // visible -> saliendo -> fin

  useEffect(() => {
    const t1 = setTimeout(() => setFase('saliendo'), reducido ? 600 : 2100)
    const t2 = setTimeout(() => setFase('fin'), reducido ? 900 : 2550)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [reducido])

  if (fase === 'fin') return null
  return (
    <div className={`splash ${fase === 'saliendo' ? 'saliendo' : ''}`} aria-hidden="true">
      <div className="logo-anim" dangerouslySetInnerHTML={{ __html: logoCapas }} />
    </div>
  )
}
