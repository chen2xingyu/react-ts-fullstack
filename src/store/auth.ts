import { create } from 'zustand'

// ============ 类型定义 ============
export interface AuthUser {
  id: number
  name: string
  email: string
  phone?: string
  website?: string
  company?: string
  created_at?: string
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

interface AuthActions {
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void
  setUser: (user: AuthUser) => void
  setAccessToken: (token: string) => void
  logout: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

// ============ Token 存取工具 ============
const TOKEN_KEY = 'react_ts_auth_tokens'
const USER_KEY = 'react_ts_auth_user'

function saveTokens(accessToken: string, refreshToken: string) {
  try {
    localStorage.setItem(TOKEN_KEY, JSON.stringify({ accessToken, refreshToken }))
  } catch {}
}

function loadTokens(): { accessToken: string | null; refreshToken: string | null } {
  try {
    const data = localStorage.getItem(TOKEN_KEY)
    if (data) return JSON.parse(data)
  } catch {}
  return { accessToken: null, refreshToken: null }
}

function saveUser(user: AuthUser) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  } catch {}
}

function loadUser(): AuthUser | null {
  try {
    const data = localStorage.getItem(USER_KEY)
    if (data) return JSON.parse(data)
  } catch {}
  return null
}

function clearAuth() {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  } catch {}
}

// ============ 初始化 ============
const savedTokens = loadTokens()
const savedUser = loadUser()

// ============ Zustand Store ============
export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  user: savedUser,
  accessToken: savedTokens.accessToken,
  refreshToken: savedTokens.refreshToken,
  isAuthenticated: !!savedTokens.accessToken,
  isLoading: false,
  error: null,

  setAuth: (user, accessToken, refreshToken) => {
    saveTokens(accessToken, refreshToken)
    saveUser(user)
    set({ user, accessToken, refreshToken, isAuthenticated: true, error: null })
  },

  setUser: (user) => {
    saveUser(user)
    set({ user })
  },

  setAccessToken: (token) => {
    const { refreshToken } = loadTokens()
    saveTokens(token, refreshToken || '')
    set({ accessToken: token })
  },

  logout: () => {
    clearAuth()
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      error: null,
    })
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}))

// ============ 导出工具函数 ============
export function getAccessToken(): string | null {
  return loadTokens().accessToken
}

export function getRefreshToken(): string | null {
  return loadTokens().refreshToken
}

export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}
