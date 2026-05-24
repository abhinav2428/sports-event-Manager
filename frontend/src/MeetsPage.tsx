// ─── MeetsPage ────────────────────────────────────────────────
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Calendar } from 'lucide-react'
import { meetsApi } from './api'
import { useAuth } from './authStore'
import type { Meet } from './types'

const STATUS_BADGE: Record<string, string> = {
  draft: 'badge-upcoming', active: 'badge-ongoing', completed: 'badge-done',
}

export default function MeetsPage() {
  const [meets, setMeets]   = useState<Meet[]>([])
  const [show, setShow]     = useState(false)
  const [form, setForm]     = useState({ name:'', venue:'', start_date:'', end_date:'', course:'SCM', pool_lanes:'8' })
  const [saving, setSaving] = useState(false)
  const { isAdmin } = useAuth()

  const load = () => meetsApi.list().then(r => setMeets(r.data))
  useEffect(() => { load() }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    const payload = {
      name: form.name,
      venue: form.venue,
      start_date: form.start_date,
      end_date: form.end_date || null,
      pool_length: form.course === 'LCM' ? 50 : 25,
      lanes: parseInt(form.pool_lanes, 10)
    }
    await meetsApi.create(payload).finally(() => setSaving(false))
    setShow(false); load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title mb-0">Meets</h1>
        {isAdmin() && <button onClick={() => setShow(!show)} className="btn-primary flex items-center gap-2"><Plus size={16}/>New Meet</button>}
      </div>

      {show && (
        <div className="card p-5 mb-6">
          <h2 className="font-semibold mb-4">New Meet</h2>
          <form onSubmit={submit} className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="label">Name</label><input className="input" required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
            <div className="col-span-2"><label className="label">Venue</label><input className="input" value={form.venue} onChange={e=>setForm({...form,venue:e.target.value})}/></div>
            <div><label className="label">Start Date</label><input className="input" type="date" required value={form.start_date} onChange={e=>setForm({...form,start_date:e.target.value})}/></div>
            <div><label className="label">End Date</label><input className="input" type="date" required value={form.end_date} onChange={e=>setForm({...form,end_date:e.target.value})}/></div>
            <div><label className="label">Course</label>
              <select className="input" value={form.course} onChange={e=>setForm({...form,course:e.target.value})}>
                <option value="SCM">SCM — Short Course Metres (25m)</option>
                <option value="SCY">SCY — Short Course Yards (25yd)</option>
                <option value="LCM">LCM — Long Course Metres (50m)</option>
              </select>
            </div>
            <div><label className="label">Pool Lanes</label>
              <select className="input" value={form.pool_lanes} onChange={e=>setForm({...form,pool_lanes:e.target.value})}>
                <option value="6">6 lanes</option><option value="8">8 lanes</option><option value="10">10 lanes</option>
              </select>
            </div>
            <div className="col-span-2 flex gap-2 justify-end">
              <button type="button" onClick={()=>setShow(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving?'Creating…':'Create'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="card divide-y divide-slate-100">
        {meets.length === 0
          ? <div className="py-16 text-center text-slate-400 text-sm"><Calendar size={36} className="mx-auto mb-2 text-slate-200"/>No meets</div>
          : meets.map(m => (
            <Link key={m.id} to={`/meets/${m.id}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
              <div>
                <div className="font-medium">{m.name}</div>
                <div className="text-sm text-slate-400">{m.venue||'No venue'} · {m.start_date} → {m.end_date} · {m.course}</div>
              </div>
              <span className={STATUS_BADGE[m.status]}>{m.status}</span>
            </Link>
          ))
        }
      </div>
    </div>
  )
}
