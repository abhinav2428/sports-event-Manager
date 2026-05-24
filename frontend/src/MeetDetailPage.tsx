import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Download, FileText } from 'lucide-react'
import { meetsApi, eventsApi, reportsApi, awardsApi, downloadBlob } from './api'
import { useAuth } from './authStore'
import type { Meet, SwimEvent, Award } from './types'

const STROKES = ['freestyle','backstroke','breaststroke','butterfly','individual_medley','relay_freestyle','relay_medley']
const GENDERS = ['M','F','mixed']
const STATUS_BADGE: Record<string,string> = {
  upcoming:'badge-upcoming', seeded:'badge-seeded', ongoing:'badge-ongoing', completed:'badge-done',
}

export default function MeetDetailPage() {
  const { meetId } = useParams<{meetId:string}>()
  const [meet, setMeet]   = useState<Meet|null>(null)
  const [events, setEvents] = useState<SwimEvent[]>([])
  const [awards, setAwards] = useState<Award[]>([])
  const [show, setShow]   = useState(false)
  const [pdfLoading, setPdfLoading] = useState('')
  const [form, setForm]   = useState({event_number:1, name:'', stroke:'freestyle', distance:100, gender:'M', is_relay:false, relay_legs:1})
  const { isAdmin } = useAuth()

  const load = () => {
    meetsApi.get(meetId!).then(r => setMeet(r.data))
    eventsApi.list(meetId!).then(r => setEvents(r.data))
    awardsApi.list(meetId!).then(r => setAwards(r.data))
  }
  useEffect(() => { load() }, [meetId])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    await eventsApi.create(meetId!, {
      ...form, relay_legs: form.is_relay ? 4 : 1,
    })
    setShow(false); load()
  }

  const downloadPdf = async (type: 'heat-sheet'|'results') => {
    setPdfLoading(type)
    try {
      const fn = type === 'heat-sheet' ? reportsApi.heatSheet : reportsApi.results
      const r = await fn(meetId!)
      downloadBlob(r.data, `${type}_${meetId?.slice(0,8)}.pdf`)
    } finally { setPdfLoading('') }
  }

  if (!meet) return <div className="text-slate-400 text-sm">Loading…</div>

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link to="/meets" className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 mb-2"><ArrowLeft size={14}/>All Meets</Link>
          <h1 className="text-2xl font-bold">{meet.name}</h1>
          <p className="text-slate-500 text-sm mt-1">{meet.venue||'No venue'} · {meet.start_date} → {meet.end_date} · {meet.course} · {meet.pool_lanes} lanes</p>
        </div>
        {isAdmin() && (
          <div className="flex gap-2">
            <button onClick={() => downloadPdf('heat-sheet')} disabled={pdfLoading==='heat-sheet'}
              className="btn-secondary flex items-center gap-2">
              <FileText size={15}/>{pdfLoading==='heat-sheet'?'Generating…':'Heat Sheet'}
            </button>
            <button onClick={() => downloadPdf('results')} disabled={pdfLoading==='results'}
              className="btn-secondary flex items-center gap-2">
              <Download size={15}/>{pdfLoading==='results'?'Generating…':'Results PDF'}
            </button>
            <button onClick={() => setShow(!show)} className="btn-primary flex items-center gap-2">
              <Plus size={16}/>Add Event
            </button>
          </div>
        )}
      </div>

      {show && (
        <div className="card p-5 mb-6">
          <h2 className="font-semibold mb-4">Add Swimming Event</h2>
          <form onSubmit={submit} className="grid grid-cols-3 gap-4">
            <div><label className="label">Event #</label><input className="input" type="number" required value={form.event_number} onChange={e=>setForm({...form,event_number:+e.target.value})}/></div>
            <div className="col-span-2"><label className="label">Event Name</label><input className="input" required value={form.name} placeholder="Men's 100m Freestyle" onChange={e=>setForm({...form,name:e.target.value})}/></div>
            <div><label className="label">Stroke</label>
              <select className="input" value={form.stroke} onChange={e=>setForm({...form,stroke:e.target.value})}>
                {STROKES.map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
              </select>
            </div>
            <div><label className="label">Distance (m/leg)</label><input className="input" type="number" required value={form.distance} onChange={e=>setForm({...form,distance:+e.target.value})}/></div>
            <div><label className="label">Gender</label>
              <select className="input" value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})}>
                {GENDERS.map(g=><option key={g}>{g}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input type="checkbox" id="is_relay" checked={form.is_relay} onChange={e=>setForm({...form,is_relay:e.target.checked})}/>
              <label htmlFor="is_relay" className="text-sm font-medium text-slate-700">Relay Event (4×)</label>
            </div>
            <div className="col-span-3 flex gap-2 justify-end">
              <button type="button" onClick={()=>setShow(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Add Event</button>
            </div>
          </form>
        </div>
      )}

      <div className="card mb-6">
        <div className="px-5 py-4 border-b border-slate-100 font-semibold">Events ({events.length})</div>
        {events.length === 0
          ? <div className="py-12 text-center text-slate-400 text-sm">No events yet</div>
          : events.map(ev => (
            <Link key={ev.id} to={`/meets/${meetId}/events/${ev.id}`}
              className="flex items-center justify-between px-5 py-3.5 border-b border-slate-50 hover:bg-slate-50 last:border-0">
              <div>
                <span className="text-xs text-slate-400 mr-2">#{ev.event_number}</span>
                <span className="font-medium">{ev.name}</span>
                <span className="text-slate-400 text-sm ml-2">· {ev.total_distance}m · {ev.gender}</span>
              </div>
              <span className={STATUS_BADGE[ev.status]}>{ev.status}</span>
            </Link>
          ))
        }
      </div>

      {awards.length > 0 && (
        <div className="card">
          <div className="px-5 py-4 border-b border-slate-100 font-semibold">🏆 Awards</div>
          {awards.map(a => (
            <div key={a.id} className="flex items-center justify-between px-5 py-3 border-b border-slate-50 last:border-0">
              <div><span className="font-medium">{a.title}</span>{a.swimmer_name&&<span className="text-slate-500 text-sm ml-2">→ {a.swimmer_name}</span>}</div>
              <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded">{a.award_type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
