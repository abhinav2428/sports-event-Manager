import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Shuffle, CheckCircle, Save, Edit2 } from 'lucide-react'
import { eventsApi, entriesApi, swimmersApi, teamsApi, heatApi, resultsApi } from './api'
import { useAuth } from './authStore'
import type { SwimEvent, IndividualEntry, RelayEntry, TimeResult, Swimmer, Team } from './types'

const STATUS_BADGE: Record<string,string> = {
  DRAFT:'badge-draft', SAVED:'badge-saved', FINALIZED:'badge-final',
}

export default function EventDetailPage() {
  const { meetId, eventId } = useParams<{meetId:string;eventId:string}>()
  const { isAdmin } = useAuth()
  const [event, setEvent]   = useState<SwimEvent|null>(null)
  const [indEntries, setInd] = useState<IndividualEntry[]>([])
  const [relEntries, setRel] = useState<RelayEntry[]>([])
  const [results, setResults] = useState<TimeResult[]>([])
  const [swimmers, setSwimmers] = useState<Swimmer[]>([])
  const [teams, setTeams]   = useState<Team[]>([])
  const [tab, setTab]       = useState<'entries'|'results'>('entries')
  const [showEntry, setShowEntry] = useState(false)
  const [entryForm, setEntryForm] = useState({swimmer_id:'', team_id:'', seed_time_ms:''})
  const [editingResult, setEditingResult] = useState<TimeResult|null>(null)
  const [editForm, setEditForm] = useState({final_time_ms:'', dq:false, dq_code:'', notes:''})

  const load = () => {
    eventsApi.get(meetId!, eventId!).then(r => setEvent(r.data))
    entriesApi.listIndividual(eventId!).then(r => setInd(r.data)).catch(()=>{})
    entriesApi.listRelay(eventId!).then(r => setRel(r.data)).catch(()=>{})
    resultsApi.forEvent(eventId!).then(r => setResults(r.data)).catch(()=>{})
    swimmersApi.list().then(r => setSwimmers(r.data))
    teamsApi.list().then(r => setTeams(r.data))
  }
  useEffect(() => { load() }, [eventId])

  const seed = async () => {
    await heatApi.seed(eventId!, Number(event?.meet_id ? 8 : 8))
    load()
  }

  const addEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    const ms = entryForm.seed_time_ms ? Math.round(parseFloat(entryForm.seed_time_ms) * 1000) : null
    if (event?.is_relay) {
      await entriesApi.addRelay(eventId!, {
        team_id: entryForm.team_id,
        seed_time_ms: ms,
      })
    } else {
      await entriesApi.addIndividual(eventId!, {
        swimmer_id: entryForm.swimmer_id,
        seed_time_ms: ms,
      })
    }
    setShowEntry(false); load()
  }

  const openEdit = (r: TimeResult) => {
    setEditingResult(r)
    setEditForm({
      final_time_ms: r.final_time_ms ? (r.final_time_ms / 1000).toString() : '',
      dq: r.dq, dq_code: r.dq_code||'', notes: r.notes||'',
    })
  }

  const saveEdit = async () => {
    if (!editingResult) return
    await resultsApi.edit(editingResult.id, {
      final_time_ms: editForm.final_time_ms ? Math.round(parseFloat(editForm.final_time_ms) * 1000) : null,
      dq: editForm.dq, dq_code: editForm.dq_code||null, notes: editForm.notes||null,
    })
    setEditingResult(null); load()
  }

  if (!event) return <div className="text-slate-400 text-sm">Loading…</div>

  const allEntries = event.is_relay ? relEntries : indEntries

  return (
    <div>
      <Link to={`/meets/${meetId}`} className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 mb-4"><ArrowLeft size={14}/>Back to meet</Link>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Event {event.event_number} — {event.name}</h1>
          <p className="text-slate-500 text-sm mt-1">
            {event.total_distance}m · {event.gender} · {event.stroke.replace('_',' ')} · {event.status}
          </p>
        </div>
        {isAdmin() && (
          <div className="flex gap-2">
            <button onClick={seed} className="btn-secondary flex items-center gap-2"><Shuffle size={15}/>Seed Heats</button>
            <button onClick={() => { if (tab !== 'entries') { setTab('entries'); setShowEntry(true) } else { setShowEntry(!showEntry) } }} className="btn-primary flex items-center gap-2"><Plus size={16}/>Add Entry</button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-slate-200">
        {(['entries','results'] as const).map(t => (
          <button key={t} onClick={()=>setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab===t ? 'border-pool-700 text-pool-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}>{t} {t==='entries'?`(${allEntries.length})`:`(${results.length})`}
          </button>
        ))}
      </div>


      {/* Entries tab */}
      {tab === 'entries' && (
        <>
          {showEntry && isAdmin() && (
            <div className="card p-5 mb-4">
              <h3 className="font-semibold mb-3">Add {event.is_relay ? 'Relay Team' : 'Swimmer'}</h3>
              <form onSubmit={addEntry} className="flex gap-3 items-end">
                {event.is_relay
                  ? <div className="flex-1"><label className="label">Team</label>
                      <select className="input" required value={entryForm.team_id} onChange={e=>setEntryForm({...entryForm,team_id:e.target.value})}>
                        <option value="">— select team —</option>
                        {teams.map(t=><option key={t.id} value={t.id}>{t.name} ({t.college})</option>)}
                      </select></div>
                  : <div className="flex-1"><label className="label">Swimmer</label>
                      <select className="input" required value={entryForm.swimmer_id} onChange={e=>setEntryForm({...entryForm,swimmer_id:e.target.value})}>
                        <option value="">— select swimmer —</option>
                        {swimmers.filter(s => s.gender === event.gender || event.gender === 'mixed').map(s=><option key={s.id} value={s.id}>{s.name} ({s.college})</option>)}
                      </select></div>
                }
                <div className="w-48"><label className="label">Seed Time (s, blank=NT)</label>
                  <input className="input" type="number" step="0.01" placeholder="e.g. 54.32" value={entryForm.seed_time_ms}
                    onChange={e=>setEntryForm({...entryForm,seed_time_ms:e.target.value})}/></div>
                <button type="submit" className="btn-primary">Add</button>
                <button type="button" onClick={()=>setShowEntry(false)} className="btn-secondary">Cancel</button>
              </form>
            </div>
          )}

          <div className="card overflow-hidden">
            <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Heat</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Lane</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">College</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Seed Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allEntries.length === 0
                ? <tr><td colSpan={5} className="text-center py-8 text-slate-400">No entries yet</td></tr>
                : allEntries.map((e: any) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">{e.heat_number ?? '—'}</td>
                    <td className="px-4 py-3">{e.lane ?? '—'}</td>
                    <td className="px-4 py-3 font-medium">{e.swimmer_name ?? e.team_name}</td>
                    <td className="px-4 py-3 text-slate-500">{e.college}</td>
                    <td className="px-4 py-3 font-mono">{e.seed_time_display}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
        </>
      )}

      {/* Results tab */}
      {tab === 'results' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Rank</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Time</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                {isAdmin() && <th className="text-left px-4 py-3 font-medium text-slate-600">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.length === 0
                ? <tr><td colSpan={5} className="text-center py-8 text-slate-400">No results yet</td></tr>
                : results.map(r => (
                  <tr key={r.id} className={`hover:bg-slate-50 ${r.dq?'bg-red-50':''}`}>
                    <td className="px-4 py-3 font-bold">{r.dq?'DQ':r.dns?'DNS':r.dnf?'DNF':(r.rank??'—')}</td>
                    <td className="px-4 py-3 font-medium">{r.participant_name}</td>
                    <td className="px-4 py-3 font-mono font-semibold">{r.time_display}</td>
                    <td className="px-4 py-3"><span className={STATUS_BADGE[r.status]}>{r.status}</span></td>
                    {isAdmin() && (
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {r.status !== 'FINALIZED' && (
                            <>
                              <button onClick={()=>openEdit(r)} className="btn-ghost py-1 px-2 text-xs flex items-center gap-1"><Edit2 size={12}/>Edit</button>
                              {r.status === 'DRAFT' && <button onClick={()=>resultsApi.save(r.id).then(load)} className="btn-secondary py-1 px-2 text-xs flex items-center gap-1"><Save size={12}/>Save</button>}
                              {r.status === 'SAVED' && <button onClick={()=>resultsApi.finalize(r.id).then(load)} className="btn-primary py-1 px-2 text-xs flex items-center gap-1"><CheckCircle size={12}/>Finalize</button>}
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      )}

      {/* Edit modal */}
      {editingResult && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-semibold mb-4">Edit Result — {editingResult.participant_name}</h3>
            <div className="space-y-3">
              <div>
                <label className="label">Final Time (seconds)</label>
                <input className="input" type="number" step="0.01" value={editForm.final_time_ms}
                  onChange={e=>setEditForm({...editForm,final_time_ms:e.target.value})}
                  placeholder="e.g. 54.32"/>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="dq_chk" checked={editForm.dq}
                  onChange={e=>setEditForm({...editForm,dq:e.target.checked})}/>
                <label htmlFor="dq_chk" className="text-sm font-medium">DQ</label>
              </div>
              {editForm.dq && (
                <div>
                  <label className="label">DQ Code</label>
                  <input className="input" value={editForm.dq_code} placeholder="e.g. SW8.2"
                    onChange={e=>setEditForm({...editForm,dq_code:e.target.value})}/>
                </div>
              )}
              <div>
                <label className="label">Notes</label>
                <input className="input" value={editForm.notes}
                  onChange={e=>setEditForm({...editForm,notes:e.target.value})}/>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button onClick={()=>setEditingResult(null)} className="btn-secondary">Cancel</button>
              <button onClick={saveEdit} className="btn-primary">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
