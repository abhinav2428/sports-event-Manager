import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Shuffle, CheckCircle, Save, Edit2, UserPlus, Trash2, Award } from 'lucide-react'
import { eventsApi, entriesApi, swimmersApi, teamsApi, heatApi, resultsApi, assignmentsApi, authApi } from './api'
import { useAuth } from './authStore'
import type { SwimEvent, IndividualEntry, RelayEntry, TimeResult, Swimmer, Team, Assignment } from './types'

const STATUS_BADGE: Record<string,string> = {
  DRAFT:'badge-draft', SAVED:'badge-saved', FINALIZED:'badge-final',
}

const DQ_CODES = [
  'SW 4.4','SW 5.3','SW 6.5','SW 7.1','SW 8.2','SW 9.3','SW 10.2','SW 11.3',
]

export default function EventDetailPage() {
  const { meetId, eventId } = useParams<{meetId:string;eventId:string}>()
  const { isAdmin, user } = useAuth()
  const [event, setEvent]       = useState<SwimEvent|null>(null)
  const [indEntries, setInd]    = useState<IndividualEntry[]>([])
  const [relEntries, setRel]    = useState<RelayEntry[]>([])
  const [results, setResults]   = useState<TimeResult[]>([])
  const [swimmers, setSwimmers] = useState<Swimmer[]>([])
  const [teams, setTeams]       = useState<Team[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [recorders, setRecorders]     = useState<{id:string;name:string}[]>([])
  const [tab, setTab]           = useState<'entries'|'results'|'assignments'>('entries')
  const [showEntry, setShowEntry]     = useState(false)
  const [entryForm, setEntryForm]     = useState({swimmer_id:'', team_id:'', seed_time_ms:''})
  const [editingResult, setEditingResult] = useState<TimeResult|null>(null)
  const [editForm, setEditForm] = useState({final_time_ms:'', dq:false, dq_code:'', dns:false, dnf:false, notes:''})
  const [selectedRecorder, setSelectedRecorder] = useState('')
  const [assigning, setAssigning] = useState(false)

  const load = () => {
    eventsApi.get(meetId!, eventId!).then(r => setEvent(r.data))
    entriesApi.listIndividual(eventId!).then(r => setInd(r.data)).catch(()=>{})
    entriesApi.listRelay(eventId!).then(r => setRel(r.data)).catch(()=>{})
    resultsApi.forEvent(eventId!).then(r => setResults(r.data)).catch(()=>{})
    swimmersApi.list().then(r => setSwimmers(r.data))
    teamsApi.list().then(r => setTeams(r.data))
    if (isAdmin()) {
      assignmentsApi.forEvent(eventId!).then(r => setAssignments(r.data)).catch(()=>{})
      authApi.users().then(r => {
        setRecorders(r.data.filter((u: any) => u.user_type === 'recorder'))
      }).catch(()=>{})
    }
  }
  useEffect(() => { load() }, [eventId])

  const seed = async () => {
    await heatApi.seed(eventId!, 8)
    load()
  }

  const addEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    const ms = entryForm.seed_time_ms ? Math.round(parseFloat(entryForm.seed_time_ms) * 1000) : null
    if (event?.is_relay) {
      await entriesApi.addRelay(eventId!, { team_id: entryForm.team_id, seed_time_ms: ms })
    } else {
      await entriesApi.addIndividual(eventId!, { swimmer_id: entryForm.swimmer_id, seed_time_ms: ms })
    }
    setShowEntry(false); load()
  }

  const openEdit = (r: TimeResult) => {
    setEditingResult(r)
    setEditForm({
      final_time_ms: r.final_time_ms ? (r.final_time_ms / 1000).toString() : '',
      dq: r.dq, dq_code: r.dq_code||'',
      dns: r.dns, dnf: r.dnf, notes: r.notes||'',
    })
  }

  const saveEdit = async () => {
    if (!editingResult) return
    await resultsApi.edit(editingResult.id, {
      final_time_ms: (!editForm.dns && !editForm.dnf && !editForm.dq && editForm.final_time_ms)
        ? Math.round(parseFloat(editForm.final_time_ms) * 1000) : null,
      dq: editForm.dq, dq_code: editForm.dq_code||null,
      dns: editForm.dns, dnf: editForm.dnf, notes: editForm.notes||null,
    })
    setEditingResult(null); load()
  }

  const handleAssign = async () => {
    if (!selectedRecorder) return
    setAssigning(true)
    try {
      await assignmentsApi.assign(eventId!, selectedRecorder)
      setSelectedRecorder('')
      load()
    } catch { } finally { setAssigning(false) }
  }

  const handleRemoveAssignment = async (id: string) => {
    await assignmentsApi.remove(id)
    load()
  }

  if (!event) return <div className="text-slate-400 text-sm">Loading…</div>

  const allEntries = event.is_relay ? relEntries : indEntries
  const assignedIds = new Set(assignments.map(a => a.recorder_id))
  const availableRecorders = recorders.filter(r => !assignedIds.has(r.id))

  // Group results by heat for display
  const resultsByHeat = new Map<number, TimeResult[]>()
  for (const r of results) {
    const h = r.heat_number ?? 0
    if (!resultsByHeat.has(h)) resultsByHeat.set(h, [])
    resultsByHeat.get(h)!.push(r)
  }

  return (
    <div>
      <Link to={`/meets/${meetId}`} className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 mb-4">
        <ArrowLeft size={14}/>Back to meet
      </Link>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Event {event.event_number} — {event.name}</h1>
          <p className="text-slate-500 text-sm mt-1">
            {event.total_distance}m · {event.gender} · {event.stroke.replace(/_/g,' ')} · <span className="font-medium capitalize">{event.status}</span>
          </p>
        </div>
        {isAdmin() && (
          <div className="flex gap-2">
            <button onClick={seed} className="btn-secondary flex items-center gap-2">
              <Shuffle size={15}/>Seed Heats
            </button>
            <button onClick={() => { if (tab !== 'entries') { setTab('entries'); setShowEntry(true) } else { setShowEntry(!showEntry) } }}
              className="btn-primary flex items-center gap-2">
              <Plus size={16}/>Add Entry
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-slate-200">
        {(['entries','results', ...(isAdmin() ? ['assignments'] : [])] as const).map(t => (
          <button key={t} onClick={() => setTab(t as any)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab===t ? 'border-pool-700 text-pool-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}>
            {t}{t==='entries'?` (${allEntries.length})`:t==='results'?` (${results.length})`:t==='assignments'?` (${assignments.length})`:''}
          </button>
        ))}
      </div>

      {/* ── Entries tab ── */}
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
                      <td className="px-4 py-3 text-slate-500">{e.college ?? '—'}</td>
                      <td className="px-4 py-3 font-mono">{e.seed_time_display}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Results tab ── */}
      {tab === 'results' && (
        <div className="space-y-4">
          {results.length === 0 ? (
            <div className="card text-center py-12 text-slate-400">No results yet. Seed heats first.</div>
          ) : (
            Array.from(resultsByHeat.entries()).sort(([a],[b]) => a-b).map(([heatNum, heatResults]) => (
              <div key={heatNum} className="card overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 font-semibold text-sm">
                  {heatNum === 0 ? 'Unseeded Results' : `Heat ${heatNum}`}
                </div>
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-100">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium text-slate-500 text-xs">Lane</th>
                      <th className="text-left px-4 py-2 font-medium text-slate-500 text-xs">Name</th>
                      <th className="text-left px-4 py-2 font-medium text-slate-500 text-xs">Time</th>
                      <th className="text-left px-4 py-2 font-medium text-slate-500 text-xs">Rank</th>
                      <th className="text-left px-4 py-2 font-medium text-slate-500 text-xs">Status</th>
                      <th className="text-left px-4 py-2 font-medium text-slate-500 text-xs">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {heatResults.sort((a,b) => (a.lane??99)-(b.lane??99)).map(r => {
                      const statusUpper = r.status?.toUpperCase() || '';
                      return (
                      <tr key={r.id} className={`hover:bg-slate-50 ${r.dq?'bg-red-50/50':''}`}>
                        <td className="px-4 py-2.5 font-mono text-slate-500 text-xs">{r.lane ?? '—'}</td>
                        <td className="px-4 py-2.5 font-medium">{r.participant_name}</td>
                        <td className="px-4 py-2.5 font-mono font-semibold">{r.time_display}</td>
                        <td className="px-4 py-2.5 font-bold">{r.dq?'DQ':r.dns?'DNS':r.dnf?'DNF':(r.rank??'—')}</td>
                        <td className="px-4 py-2.5">
                          <span className={STATUS_BADGE[statusUpper] || 'badge-draft text-xs uppercase tracking-wider font-bold'}>{r.status}</span>
                        </td>
                        <td className="px-4 py-2.5">
                            <div className="flex gap-1">
                              {statusUpper === 'FINALIZED' ? (
                                <button
                                  onClick={() => window.open(`/certificate?resultId=${r.id}`, '_blank')}
                                  className="btn-secondary py-1 px-2 text-xs flex items-center gap-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                                  title="Download Certificate"
                                >
                                  <Award size={11}/>Certificate
                                </button>
                              ) : isAdmin() ? (
                                <>
                                  <button onClick={()=>openEdit(r)}
                                    className="btn-ghost py-1 px-2 text-xs flex items-center gap-1">
                                    <Edit2 size={11}/>Edit
                                  </button>
                                  {statusUpper === 'DRAFT' && (
                                    <button onClick={()=>resultsApi.save(r.id).then(load)}
                                      className="btn-secondary py-1 px-2 text-xs flex items-center gap-1">
                                      <Save size={11}/>Save
                                    </button>
                                  )}
                                  {statusUpper === 'SAVED' && (
                                    <button onClick={()=>resultsApi.finalize(r.id).then(load)}
                                      className="btn-primary py-1 px-2 text-xs flex items-center gap-1">
                                      <CheckCircle size={11}/>Finalize
                                    </button>
                                  )}
                                </>
                              ) : null}
                            </div>
                          </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Assignments tab (admin only) ── */}
      {tab === 'assignments' && isAdmin() && (
        <div className="space-y-4">
          {/* Add recorder */}
          <div className="card p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><UserPlus size={16}/>Assign Recorder</h3>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="label">Select Recorder</label>
                <select className="input" value={selectedRecorder} onChange={e=>setSelectedRecorder(e.target.value)}>
                  <option value="">— choose recorder —</option>
                  {availableRecorders.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <button onClick={handleAssign} disabled={!selectedRecorder || assigning}
                className="btn-primary flex items-center gap-2 disabled:opacity-50">
                <UserPlus size={15}/>{assigning ? 'Assigning…' : 'Assign'}
              </button>
            </div>
            {availableRecorders.length === 0 && assignments.length === 0 && (
              <p className="text-sm text-slate-400 mt-3">No recorder accounts found. Create one via <code className="bg-slate-100 px-1 rounded">POST /api/v1/auth/register</code>.</p>
            )}
          </div>

          {/* Current assignments */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 font-semibold text-sm">
              Assigned Recorders ({assignments.length})
            </div>
            {assignments.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">No recorders assigned yet</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-slate-500 text-xs">Recorder</th>
                    <th className="text-left px-4 py-2 font-medium text-slate-500 text-xs">Assigned At</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {assignments.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{a.recorder_name}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {a.assigned_at ? new Date(a.assigned_at).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={()=>handleRemoveAssignment(a.id)}
                          className="text-red-400 hover:text-red-600 transition-colors p-1 rounded hover:bg-red-50">
                          <Trash2 size={14}/>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Edit result modal ── */}
      {editingResult && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-semibold mb-4">Edit Result — {editingResult.participant_name}</h3>
            <div className="space-y-3">
              <div>
                <label className="label">Final Time (seconds)</label>
                <input className="input" type="number" step="0.01"
                  value={editForm.final_time_ms} placeholder="e.g. 54.32"
                  disabled={editForm.dns || editForm.dnf || editForm.dq}
                  onChange={e=>setEditForm({...editForm,final_time_ms:e.target.value})}/>
              </div>
              <div className="flex items-center gap-4">
                {(['dns','dnf','dq'] as const).map(flag => (
                  <label key={flag} className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <input type="checkbox"
                      checked={flag==='dns'?editForm.dns:flag==='dnf'?editForm.dnf:editForm.dq}
                      onChange={e => {
                        if(flag==='dns') setEditForm({...editForm,dns:e.target.checked,dnf:false,dq:false})
                        if(flag==='dnf') setEditForm({...editForm,dnf:e.target.checked,dns:false,dq:false})
                        if(flag==='dq')  setEditForm({...editForm,dq:e.target.checked,dns:false,dnf:false})
                      }}
                    />
                    {flag.toUpperCase()}
                  </label>
                ))}
              </div>
              {editForm.dq && (
                <div>
                  <label className="label">DQ Code</label>
                  <select className="input" value={editForm.dq_code} onChange={e=>setEditForm({...editForm,dq_code:e.target.value})}>
                    <option value="">— select code —</option>
                    {DQ_CODES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="label">Notes</label>
                <input className="input" value={editForm.notes} onChange={e=>setEditForm({...editForm,notes:e.target.value})}/>
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
