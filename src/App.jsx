import { useCallback, useEffect, useState } from 'react'
import { configurado, supabase } from './supabase'
import Stock from './pages/Stock'
import Equipos from './pages/Equipos'
import ParteDiario from './pages/ParteDiario'
import Administracion from './pages/Administracion'
import Dashboard from './pages/Dashboard'
import { PermisosContext, ROLES } from './permisos'

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
  const [perfil, setPerfil] = useState(null)

  useEffect(() => {
    if (!configurado) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => localStorageSet('seccion', seccion), [seccion])

  const userId = session?.user?.id
  const cargarPerfil = useCallback(async () => {
    if (!userId) return setPerfil(null)
    const { data, error } = await supabase.from('perfiles').select('*').eq('id', userId).maybeSingle()
    // Si todavía no existe la tabla de permisos, la app funciona como antes (todos editan)
    if (error) setPerfil({ rol: 'editor' })
    else setPerfil(data || { rol: 'pendiente' })
  }, [userId])

  useEffect(() => {
    cargarPerfil()
  }, [cargarPerfil])

  // Aviso para los editores: cuentas nuevas esperando aprobación
  const [pendientes, setPendientes] = useState(0)
  const [cambiosPerfiles, setCambiosPerfiles] = useState(0)
  useEffect(() => {
    const avisar = () => setCambiosPerfiles((n) => n + 1)
    window.addEventListener('perfiles-cambiaron', avisar)
    return () => window.removeEventListener('perfiles-cambiaron', avisar)
  }, [])
  useEffect(() => {
    if (perfil?.rol !== 'editor') return
    supabase
      .from('perfiles')
      .select('id', { count: 'exact', head: true })
      .eq('rol', 'pendiente')
      .then(({ count }) => setPendientes(count || 0))
  }, [perfil?.rol, seccion, cambiosPerfiles])

  if (!configurado) return <FaltaConfig />
  if (session === undefined) return <div className="center muted">Cargando…</div>
  if (!session) return <Login />
  if (!perfil) return <div className="center muted">Cargando…</div>
  if (perfil.rol === 'pendiente')
    return <Pendiente perfil={perfil} usuario={session.user.email} onActualizar={cargarPerfil} />

  const usuario = session.user.email
  const ir = (id) => {
    setSeccion(id)
    setMenuAbierto(false)
    window.scrollTo(0, 0)
  }

  const puedeEditar = perfil.rol === 'editor'
  const puedeCargarPartes = puedeEditar || perfil.rol === 'jefe_obra'

  return (
    <PermisosContext.Provider value={{ puedeEditar, puedeCargarPartes, rol: perfil.rol, userId }}>
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
              {s.id === 'admin' && pendientes > 0 && (
                <span className="badge" title="Cuentas nuevas esperando aprobación">
                  {pendientes}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="side-user">
          <span className="side-mail">{perfil.nombre || usuario}</span>
          <span className={`side-rol ${puedeEditar ? 'editor' : ''}`}>{ROLES[perfil.rol] || perfil.rol}</span>
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
    </PermisosContext.Provider>
  )
}

function CampoPass({ value, onChange, autoComplete, placeholder }) {
  const [ver, setVer] = useState(false)
  return (
    <div className="pass-wrap">
      <input
        type={ver ? 'text' : 'password'}
        autoComplete={autoComplete}
        required
        minLength={6}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        className="pass-ver"
        onClick={() => setVer((v) => !v)}
        aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        title={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        {ver ? <OjoTachado /> : <Ojo />}
      </button>
    </div>
  )
}

function Login() {
  const [modo, setModo] = useState('ingresar') // ingresar | crear
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState(null)
  const [aviso, setAviso] = useState(null)
  const [cargando, setCargando] = useState(false)

  function cambiarModo(m) {
    setModo(m)
    setError(null)
    setAviso(null)
    setPassword('')
    setPassword2('')
  }

  async function entrar(e) {
    e.preventDefault()
    setCargando(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setCargando(false)
    if (error) {
      if (/confirm/i.test(error.message)) setError('Todavía no confirmaste tu email. Revisá tu casilla de correo.')
      else setError('Email o contraseña incorrectos.')
    }
  }

  async function crear(e) {
    e.preventDefault()
    setError(null)
    if (password !== password2) return setError('Las contraseñas no coinciden.')
    setCargando(true)
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { nombre: nombre.trim() } },
    })
    setCargando(false)
    if (error) {
      const m = error.message || ''
      if (/registered|already/i.test(m)) setError('Ya existe una cuenta con ese email. Ingresá con tu contraseña.')
      else if (/signups? not allowed|disabled/i.test(m)) setError('El registro de cuentas nuevas está desactivado. Pedile a un administrador que lo habilite.')
      else if (/password/i.test(m)) setError('La contraseña tiene que tener al menos 6 caracteres.')
      else if (/email/i.test(m)) setError('El email no es válido.')
      else setError(m)
      return
    }
    // Si Supabase pide confirmar el email, no hay sesión todavía
    if (!data.session) {
      cambiarModo('ingresar')
      setAviso('Cuenta creada. Revisá tu email para confirmarla y después ingresá.')
    }
  }

  return (
    <div className="login-wrap">
      <form className="login" onSubmit={modo === 'ingresar' ? entrar : crear}>
        <img className="login-logo" src="/logo-thd.png" alt="THD Argentina" />
        <h1>Sistema de obras</h1>

        <div className="login-tabs" role="tablist">
          <button type="button" role="tab" className={modo === 'ingresar' ? 'on' : ''} onClick={() => cambiarModo('ingresar')}>
            Ingresar
          </button>
          <button type="button" role="tab" className={modo === 'crear' ? 'on' : ''} onClick={() => cambiarModo('crear')}>
            Crear cuenta
          </button>
        </div>

        {modo === 'crear' && (
          <label>
            <span>Nombre y apellido</span>
            <input autoComplete="name" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </label>
        )}
        <label>
          <span>Email</span>
          <input type="email" autoComplete={modo === 'crear' ? 'email' : 'username'} required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          <span>Contraseña</span>
          <CampoPass
            value={password}
            onChange={setPassword}
            autoComplete={modo === 'crear' ? 'new-password' : 'current-password'}
            placeholder={modo === 'crear' ? 'Mínimo 6 caracteres' : ''}
          />
        </label>
        {modo === 'crear' && (
          <label>
            <span>Repetir contraseña</span>
            <CampoPass value={password2} onChange={setPassword2} autoComplete="new-password" />
          </label>
        )}

        {aviso && <p className="aviso">{aviso}</p>}
        {error && <p className="error">{error}</p>}
        <button className="btn primary big" disabled={cargando}>
          {cargando ? 'Un momento…' : modo === 'ingresar' ? 'Ingresar' : 'Crear cuenta'}
        </button>
        {modo === 'crear' && (
          <p className="muted small login-nota">
            Tu cuenta va a quedar pendiente hasta que un administrador la apruebe.
          </p>
        )}
      </form>
    </div>
  )
}

function Pendiente({ perfil, usuario, onActualizar }) {
  const [revisando, setRevisando] = useState(false)
  return (
    <div className="login-wrap">
      <div className="login">
        <img className="login-logo" src="/logo-thd.png" alt="THD Argentina" />
        <h1>Cuenta pendiente de aprobación</h1>
        <p>
          Hola{perfil.nombre ? ` ${perfil.nombre}` : ''}. Tu cuenta (<strong>{usuario}</strong>) ya está creada. Un
          administrador tiene que aprobarla para que puedas usar el sistema.
        </p>
        <p className="muted small">Cuando te avisen que está aprobada, tocá “Ya me aprobaron”.</p>
        <button
          className="btn primary big"
          disabled={revisando}
          onClick={async () => {
            setRevisando(true)
            await onActualizar()
            setRevisando(false)
          }}
        >
          {revisando ? 'Revisando…' : 'Ya me aprobaron'}
        </button>
        <button className="btn ghost" onClick={() => supabase.auth.signOut()}>
          Cerrar sesión
        </button>
      </div>
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

function Ojo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
function OjoTachado() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-6.5 0-10-7-10-7a18.5 18.5 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  )
}
