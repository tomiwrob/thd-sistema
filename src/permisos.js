import { createContext, useContext } from 'react'

export const PermisosContext = createContext({ puedeEditar: true, rol: 'editor', userId: null })
export const usePermisos = () => useContext(PermisosContext)
export const usePuedeEditar = () => useContext(PermisosContext).puedeEditar
