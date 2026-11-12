import { useEffect, useState } from 'react'
import { configurado, supabase } from './supabase'
import Stock from './pages/Stock'
import Equipos from './pages/Equipos'
import ParteDiario from './pages/ParteDiario'
import Administracion from './pages/Administracion'
import Dashboard from './pages/Dashboard'

const SECCIONES = [
  { id: 'inicio', label: 'Resumen' },
  { id: 'parte', label: 'Parte diario' },
  { id: 'stock', label: 'Stock cañería' },
  { id: 'equipos', label: 'Herramientas' },
  { id: 'admin', label: 'Administración' },
]

export default function App() {
  const [session, setSession] = useState(undefined)
  const [seccion, setSeccion] = useState(() => {
    const s = localStorageGet('seccion')
    return SECCIONES.some((x) => x.id === s) ? s : 'inicio'
  })
  const [menuAbierto, setMenuAbierto] = useState(false)

  useEffect(() => {
    if (!configurado) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => localStorageSet('seccion', seccion), [seccion])

  if (!configurado) return <FaltaConfig />
  if (session === undefined) return <div className="center muted">Cargando…</div>
  if (!session) return <Login />

  const usuario = session.user.email
  const ir = (id) => {
    setSeccion(id)
    setMenuAbierto(false)
    window.scrollTo(0, 0)
  }

  return (
    <div className={`app ${menuAbierto ? 'menu-abierto' : ''}`}>
      <header className="top-movil">
        <button className="logo-btn" onClick={() => ir('inicio')} aria-label="Ir al resumen">
          <img className="logo" src="/logo-thd.png" alt="THD Argentina" />
        </button>
        <button className="btn small" onClick={() => setMenuAbierto((v) => !v)}>
          {menuAbierto ? 'Cerrar' : 'Menú'}
        </button>
      </header>

      <aside className="sidebar">
        <button className="logo-card" onClick={() => ir('inicio')} aria-label="Ir al resumen">
          <img src="/logo-thd.png" alt="THD Argentina" />
        </button>
        <nav className="side-nav">
          {SECCIONES.map((s) => (
            <button key={s.id} className={seccion === s.id ? 'active' : ''} onClick={() => ir(s.id)}>
              {s.label}
            </button>
          ))}
        </nav>
        <div className="side-user">
          <span className="side-mail">{usuario}</span>
          <button className="side-salir" onClick={() => supabase.auth.signOut()}>
            Cerrar sesión
          </button>
        </div>
      </aside>
      <div className="velo" onClick={() => setMenuAbierto(false)} />

      <main className="main">
        <h2 className="titulo">{SECCIONES.find((s) => s.id === seccion)?.label}</h2>
        {seccion === 'inicio' && <Dashboard ir={ir} />}
        {seccion === 'stock' && <Stock usuario={usuario} />}
        {seccion === 'equipos' && <Equipos />}
        {seccion === 'parte' && <ParteDiario usuario={usuario} />}
        {seccion === 'admin' && <Administracion />}
      </main>
    </div>
  )
}

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(false)

  async function entrar(e) {
    e.preventDefault()
    setCargando(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setCargando(false)
    if (error) setError('Email o contraseña incorrectos.')
  }

  return (
    <div className="login-wrap">
      <form className="login" onSubmit={entrar}>
        <img className="login-logo" src="/logo-thd.png" alt="THD Argentina" />
        <h1>Sistema de obras</h1>
        <label>
          <span>Email</span>
          <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          <span>Contraseña</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn primary big" disabled={cargando}>
          {cargando ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  )
}

function FaltaConfig() {
  return (
    <div className="login-wrap">
      <div className="login">
        <img className="login-logo" src="/logo-thd.png" alt="THD Argentina" />
        <h1>Falta conectar la base de datos</h1>
        <p>
          Cargá las variables <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> en Vercel (Settings →
          Environment Variables) y volvé a publicar (Deployments → Redeploy).
        </p>
      </div>
    </div>
  )
}

function localStorageGet(k) {
  try {
    return window.localStorage.getItem('thd-' + k)
  } catch {
    return null
  }
}
function localStorageSet(k, v) {
  try {
    window.localStorage.setItem('thd-' + k, v)
  } catch {
    /* sin almacenamiento */
  }
}
