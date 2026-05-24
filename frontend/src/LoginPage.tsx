// ─── LoginPage ────────────────────────────────────────────────
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Waves } from 'lucide-react'
import { authApi } from './api'
import { useAuth } from './authStore'

export default function LoginPage() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [err, setErr]   = useState('')
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setLoading(true)
    try {
      const { data } = await authApi.login(form.username, form.password)
      setAuth({ id: data.user_id, name: data.name, user_type: data.user_type }, data.access_token)
      navigate('/')
    } catch (e: any) {
      setErr(e.response?.data?.detail || 'Login failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-pool-800 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 mb-4">
            <Waves size={28} className="text-blue-300" />
          </div>
          <h1 className="text-2xl font-bold text-white">SwimMeet</h1>
          <p className="text-white/50 text-sm mt-1">Competition Management</p>
        </div>
        <div className="bg-white rounded-2xl p-7 shadow-2xl">
          <h2 className="text-lg font-semibold mb-5">Sign in</h2>
          {err && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded mb-4">{err}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Username</label>
              <input className="input" required autoFocus value={form.username}
                onChange={e => setForm({...form, username: e.target.value})} />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" required value={form.password}
                onChange={e => setForm({...form, password: e.target.value})} />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
