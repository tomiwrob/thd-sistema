import { useEffect, useState } from 'react'
import { configurado, supabase } from './supabase'
import Stock from './pages/Stock'
import Equipos from './pages/Equipos'
import ParteDiario from './pages/ParteDiario'
import Administracion from './pages/Administracion'

const SECCIONES = [
  { id: 'parte', label: 'Parte diario', icon: '📋' },
  { id: 'stock', label: 'Stock cañería', icon: '🛢️' },
  { id: 'equipos', label: 'Herramientas', icon: '🛠️' },
  { id: 'admin', label: 'Administración', icon: '⚙️' },
]

export default function App() {
  const [session, setSession] = useState(undefined)
  const [seccion, setSeccion] = useState(() => localStorageGet('seccion') || 'parte')

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

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="logo">THD</span>
          <span className="brand-txt">Obras</span>
        </div>
        <nav className="nav">
          {SECCIONES.map((s) => (
            <button key={s.id} className={seccion === s.id ? 'active' : ''} onClick={() => setSeccion(s.id)}>
              <span className="ico">{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </nav>
        <div className="user">
          <span className="user-mail">{usuario}</span>
          <button className="btn small ghost-light" onClick={() => supabase.auth.signOut()}>
            Salir
          </button>
        </div>
      </header>

      <main className="main">
        <h2 className="titulo">{SECCIONES.find((s) => s.id === seccion)?.label}</h2>
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
        <div className="login-logo">THD</div>
        <h1>Sistema de obras</h1>
        <p className="muted">THD Argentina</p>
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
        <div className="login-logo">THD</div>
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
