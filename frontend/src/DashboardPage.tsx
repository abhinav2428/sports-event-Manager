import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Users, ArrowRight, Trophy } from 'lucide-react'
import { meetsApi, swimmersApi } from './api'
import { useAuth } from './authStore'
import type { Meet } from './types'

const STATUS_BADGE: Record<string, string> = {
  draft: 'badge-upcoming', active: 'badge-ongoing', completed: 'badge-done',
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [meets, setMeets] = useState<Meet[]>([])
  const [athleteCount, setAthleteCount] = useState(0)

  useEffect(() => {
    meetsApi.list().then(r => setMeets(r.data)).catch(() => {})
    swimmersApi.list().then(r => setAthleteCount(r.data.length)).catch(() => {})
  }, [])

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-bold">Welcome, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="text-slate-500 text-sm mt-1">
          {user?.user_type === 'administrator'
          ? `Manage meets, events, participants, and results`
            : 'View assigned events and record results'}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Meets', value: meets.length, icon: Calendar, color: 'text-blue-600 bg-blue-50' },
          { label: `Registered Participants`, value: athleteCount, icon: Users, color: 'text-violet-600 bg-violet-50' },
          { label: 'Active Meets', value: meets.filter(m => m.status === 'active').length, icon: Trophy, color: 'text-amber-600 bg-amber-50' },
        ].map(s => (
          <div key={s.label} className="card p-5">
            <div className={`inline-flex p-2.5 rounded-lg ${s.color} mb-3`}><s.icon size={20} /></div>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-sm text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold">Meets</h2>
          <Link to="/meets" className="text-sm text-pool-600 hover:text-pool-800 flex items-center gap-1">
            All meets <ArrowRight size={14} />
          </Link>
        </div>
        {meets.length === 0
          ? <div className="py-12 text-center text-slate-400 text-sm">No meets yet</div>
          : meets.slice(0, 6).map(m => (
            <Link key={m.id} to={`/meets/${m.id}`}
              className="flex items-center justify-between px-5 py-3.5 border-b border-slate-50 hover:bg-slate-50 last:border-0">
              <div>
                <div className="text-sm font-medium">{m.name}</div>
                <div className="text-xs text-slate-400">{m.venue || 'No venue'} · {m.start_date} · {m.venue_config}</div>
              </div>
              <span className={STATUS_BADGE[m.status]}>{m.status}</span>
            </Link>
          ))
        }
      </div>
    </div>
  )
}
