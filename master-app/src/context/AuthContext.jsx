import { createContext, useContext, useState, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('master_user')) } catch { return null }
  })
  const [loading, setLoading] = useState(false)

  const login = useCallback(async (email, password) => {
    setLoading(true)
    try {
      const { data } = await api.post('login', { email, password, source: 'admin' })
      const token = data.token
      localStorage.setItem('master_token', token)

      const { data: meRaw } = await api.get('me')
      const me = meRaw?.record ?? meRaw?.user ?? meRaw?.data ?? meRaw
      const userType = me?.user_type
      const isMaster = me?.is_master

      if (userType !== 'master' && !isMaster) {
        localStorage.removeItem('master_token')
        throw new Error('Access denied. Master account required.')
      }
      localStorage.setItem('master_user', JSON.stringify(me))
      setUser(me)
      return { success: true }
    } catch (err) {
      const msg = err.message || err.response?.data?.message || 'Login failed'
      return { success: false, message: msg }
    } finally {
      setLoading(false)
    }
  }, [])

  const loginWithOtp = useCallback(async (email, password) => {
    const { data } = await api.post('loginwith_otp', { email, password, source: 'admin' })
    return data
  }, [])

  const verifyOtp = useCallback(async (otp, userId) => {
    const { data } = await api.post(`check_otp/${otp}`, { user_id: userId })
    return data
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('master_token')
    localStorage.removeItem('master_user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithOtp, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
