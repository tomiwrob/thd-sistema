import { createContext, useContext } from 'react'

export const ROLES = {
  editor: 'Puede editar todo',
  jefe_obra: 'Jefe de obra',
}

export const PermisosContext = createContext({ puedeEditar: true, puedeCargarPartes: true, rol: 'editor', userId: null })
export const usePermisos = () => useContext(PermisosContext)
export const usePuedeEditar = () => useContext(PermisosContext).puedeEditar
export const usePuedeCargarPartes = () => useContext(PermisosContext).puedeCargarPartes
