import { create } from 'zustand'
import type { UserType } from './types'

interface AuthUser { id: string; name: string; user_type: UserType }

interface AuthState {
  user: AuthUser | null
  token: string | null
  setAuth: (user: AuthUser, token: string) => void
  logout: () => void
  isAdmin: () => boolean
}

export const useAuth = create<AuthState>((set, get) => ({
  user: (() => { try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null } })(),
  token: localStorage.getItem('token'),

  setAuth(user, token) {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    set({ user, token })
  },
  logout() {
    localStorage.clear()
    set({ user: null, token: null })
  },
  isAdmin: () => get().user?.user_type === 'administrator',
}))
