/**
 * RecorderPage — shown to users with role "recorder".
 * Lists all events they've been assigned to, grouped by meet.
 * For each event shows a heat-by-heat table for entering times.
 *
 * Workflow:
 *  1. Entries are seeded by admin → DRAFT TimeResults auto-created
 *  2. Recorder enters time / marks DNS|DNF|DQ → "Record" saves as DRAFT
 *  3. Recorder clicks "Submit for Review" → all DRAFTs → SAVED
 *  4. Admin reviews SAVED results and Finalizes them
 */
import { useEffect, useState, useCallback } from 'react'
import { ClipboardList, ChevronDown, ChevronRight, CheckCircle, Save, AlertCircle, Clock } from 'lucide-react'
import { assignmentsApi, eventsApi, entriesApi, resultsApi, meetsApi } from './api'
import type { Assignment, SwimEvent, IndividualEntry, RelayEntry, TimeResult, Meet } from './types'

// ── Types ────────────────────────────────────────────────────────

interface EntryRow {
  entry: IndividualEntry | RelayEntry
  result: TimeResult | null
  isRelay: boolean
}

interface HeatGroup {
  heatNumber: number
  rows: EntryRow[]
}

interface EventWorkload {
  assignment: Assignment
  event: SwimEvent | null
  meet: Meet | null
  heats: HeatGroup[]
  loading: boolean
}

// ── Helpers ──────────────────────────────────────────────────────

function msToSeconds(ms: number | undefined): string {
  if (!ms) return ''
  return (ms / 1000).toFixed(2)
}

function secondsToMs(s: string): number | null {
  const n = parseFloat(s)
  return isNaN(n) || n <= 0 ? null : Math.round(n * 1000)
}

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'text-amber-600 bg-amber-50 border-amber-200',
  SAVED: 'text-blue-600 bg-blue-50 border-blue-200',
  FINALIZED: 'text-emerald-600 bg-emerald-50 border-emerald-200',
}

// ── Sub-components ───────────────────────────────────────────────

interface TimeRowProps {
  row: EntryRow
  onSaved: () => void
}

function TimeRow({ row, onSaved }: TimeRowProps) {
  const { entry, result, isRelay } = row
  const name = isRelay ? (entry as RelayEntry).team_name : (entry as IndividualEntry).swimmer_name
  const resultStatus = result?.status?.toUpperCase() ?? 'NO RESULT'
  const isFinalized = resultStatus === 'FINALIZED'

  const [timeStr, setTimeStr] = useState(() => msToSeconds(result?.final_time_ms ?? undefined))
  const [dns, setDns]         = useState(result?.dns ?? false)
  const [dnf, setDnf]         = useState(result?.dnf ?? false)
  const [dq, setDq]           = useState(result?.dq ?? false)
  const [dqCode, setDqCode]   = useState(result?.dq_code ?? '')
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState('')

  // Reset local state when result prop changes
  useEffect(() => {
    setTimeStr(msToSeconds(result?.final_time_ms ?? undefined))
    setDns(result?.dns ?? false)
    setDnf(result?.dnf ?? false)
    setDq(result?.dq ?? false)
    setDqCode(result?.dq_code ?? '')
  }, [result?.id])

  const handleRecord = async () => {
    if (!result) { setError('No draft result found. Heats may not be seeded yet.'); return }
    if (!dns && !dnf && !dq && !timeStr) { setError('Enter a time or mark DNS / DNF / DQ'); return }
    setError(''); setSaving(true)
    try {
      await resultsApi.edit(result.id, {
        final_time_ms: (!dns && !dnf && !dq) ? secondsToMs(timeStr) : null,
        dns, dnf, dq,
        dq_code: dq ? dqCode || null : null,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      onSaved()
    } catch (e: any) {
      setError(e.response?.data?.detail ?? 'Failed to record')
    } finally {
      setSaving(false)
    }
  }

  return (
    <tr className={`border-b border-slate-100 last:border-0 ${isFinalized ? 'opacity-60' : ''}`}>
      {/* Lane */}
      <td className="px-3 py-2.5 text-center font-mono text-sm font-semibold text-slate-500 w-12">
        {(entry as any).lane ?? '—'}
      </td>
      {/* Swimmer / Team */}
      <td className="px-3 py-2.5 font-medium text-sm">{name ?? '—'}</td>
      {/* College */}
      {!isRelay && (
        <td className="px-3 py-2.5 text-slate-500 text-sm">{(entry as IndividualEntry).college ?? '—'}</td>
      )}
      {/* Time input */}
      <td className="px-3 py-2.5 w-32">
        <input
          className="input py-1 text-sm font-mono w-28 disabled:opacity-40"
          placeholder="e.g. 54.32"
          type="number" step="0.01" min="0"
          value={timeStr}
          disabled={dns || dnf || dq || isFinalized}
          onChange={e => setTimeStr(e.target.value)}
        />
      </td>
      {/* DNS / DNF / DQ */}
      <td className="px-2 py-2.5">
        <div className="flex items-center gap-3">
          {(['dns','dnf','dq'] as const).map(flag => (
            <label key={flag} className="flex items-center gap-1 text-xs font-medium text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                disabled={isFinalized}
                checked={flag==='dns'?dns:flag==='dnf'?dnf:dq}
                onChange={e => {
                  if (flag==='dns') { setDns(e.target.checked); if(e.target.checked){setDnf(false);setDq(false)} }
                  if (flag==='dnf') { setDnf(e.target.checked); if(e.target.checked){setDns(false);setDq(false)} }
                  if (flag==='dq')  { setDq(e.target.checked);  if(e.target.checked){setDns(false);setDnf(false)} }
                }}
              />
              {flag.toUpperCase()}
            </label>
          ))}
        </div>
        {dq && !isFinalized && (
          <input className="input py-0.5 text-xs mt-1 w-24" placeholder="DQ code" value={dqCode}
            onChange={e => setDqCode(e.target.value)}/>
        )}
      </td>
      {/* Status */}
      <td className="px-3 py-2.5">
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${STATUS_COLOR[resultStatus] ?? 'text-slate-400 bg-slate-50 border-slate-200'}`}>
          {resultStatus}
        </span>
      </td>
      {/* Action */}
      <td className="px-3 py-2.5">
        {!isFinalized && (
          <button
            onClick={handleRecord}
            disabled={saving}
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1
              ${saved ? 'bg-emerald-100 text-emerald-700' : 'bg-pool-700 text-white hover:bg-pool-800'}`}
          >
            {saving ? <span className="animate-spin">⏳</span> : saved ? <><CheckCircle size={11}/>Saved!</> : <><Clock size={11}/>Record</>}
          </button>
        )}
      </td>
      {/* Error */}
      {error && (
        <td colSpan={1} className="px-3 py-2 text-red-500 text-xs">{error}</td>
      )}
    </tr>
  )
}

// ── Main Page ─────────────────────────────────────────────────────

export default function RecorderPage() {
  const [workloads, setWorkloads] = useState<EventWorkload[]>([])
  const [expanded, setExpanded]  = useState<Record<string, boolean>>({})
  const [loading, setLoading]    = useState(true)
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({})
  const [submitMsg, setSubmitMsg]   = useState<Record<string, string>>({})

  // Load all assignments first, then fetch event + meet details
  useEffect(() => {
    setLoading(true)
    assignmentsApi.my().then(async r => {
      const assignments: Assignment[] = r.data
      const initial: EventWorkload[] = assignments.map(a => ({
        assignment: a, event: null, meet: null, heats: [], loading: true,
      }))
      setWorkloads(initial)

      // Fetch event details in parallel
      const enriched = await Promise.all(assignments.map(async a => {
        try {
          // We don't know meet_id from assignment alone — get event first
          const evRes = await eventsApi.getMy(a.event_id)
          const event: SwimEvent = evRes.data
          const meetRes = await meetsApi.get(event.meet_id)
          const meet: Meet = meetRes.data
          return { assignment: a, event, meet, heats: [], loading: true }
        } catch {
          return { assignment: a, event: null, meet: null, heats: [], loading: false }
        }
      }))
      setWorkloads(enriched)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const loadHeats = useCallback(async (wl: EventWorkload) => {
    if (!wl.event) return
    const evId = wl.event.id
    const isRelay = wl.event.is_relay

    const [entriesRes, resultsRes] = await Promise.all([
      isRelay ? entriesApi.listRelay(evId) : entriesApi.listIndividual(evId),
      resultsApi.forEvent(evId),
    ])

    const entries: (IndividualEntry | RelayEntry)[] = entriesRes.data
    const results: TimeResult[] = resultsRes.data

    // Map results by entry id
    const resultByEntry = new Map<string, TimeResult>()
    for (const r of results) {
      if (r.individual_entry_id) resultByEntry.set(r.individual_entry_id, r)
      if (r.relay_entry_id)      resultByEntry.set(r.relay_entry_id, r)
    }

    // Group by heat
    const heatMap = new Map<number, EntryRow[]>()
    for (const e of entries) {
      const heatNum = (e as any).heat_number ?? 0
      if (!heatMap.has(heatNum)) heatMap.set(heatNum, [])
      heatMap.get(heatNum)!.push({
        entry: e,
        result: resultByEntry.get(e.id) ?? null,
        isRelay,
      })
    }

    // Sort each heat by lane
    const heats: HeatGroup[] = Array.from(heatMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([heatNumber, rows]) => ({
        heatNumber,
        rows: rows.sort((a, b) => ((a.entry as any).lane ?? 0) - ((b.entry as any).lane ?? 0)),
      }))

    setWorkloads(prev => prev.map(w =>
      w.assignment.event_id === evId ? { ...w, heats, loading: false } : w
    ))
  }, [])

  const toggleEvent = (evId: string, wl: EventWorkload) => {
    const nowOpen = !expanded[evId]
    setExpanded(prev => ({ ...prev, [evId]: nowOpen }))
    if (nowOpen && wl.heats.length === 0 && !wl.loading) {
      loadHeats(wl)
    } else if (nowOpen) {
      loadHeats(wl)
    }
  }

  const handleSubmitEvent = async (wl: EventWorkload) => {
    if (!wl.event) return
    const evId = wl.event.id
    setSubmitting(p => ({ ...p, [evId]: true }))
    setSubmitMsg(p => ({ ...p, [evId]: '' }))

    try {
      // Save all DRAFT results for this event
      const drafts = wl.heats.flatMap(h => h.rows)
        .map(r => r.result)
        .filter(r => r && r.status?.toLowerCase() === 'draft') as TimeResult[]

      await Promise.all(drafts.map(r => resultsApi.save(r.id)))
      setSubmitMsg(p => ({ ...p, [evId]: `✓ ${drafts.length} result(s) submitted for review` }))
      await loadHeats(wl)
    } catch (e: any) {
      setSubmitMsg(p => ({ ...p, [evId]: 'Error: ' + (e.response?.data?.detail ?? 'Failed') }))
    } finally {
      setSubmitting(p => ({ ...p, [evId]: false }))
    }
  }

  // Group workloads by meet
  const byMeet = new Map<string, EventWorkload[]>()
  for (const wl of workloads) {
    const key = wl.meet?.name ?? 'Unknown Meet'
    if (!byMeet.has(key)) byMeet.set(key, [])
    byMeet.get(key)!.push(wl)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center text-slate-400">
          <ClipboardList size={40} className="mx-auto mb-3 text-slate-200 animate-pulse"/>
          <p className="text-sm">Loading your assignments…</p>
        </div>
      </div>
    )
  }

  if (workloads.length === 0) {
    return (
      <div className="text-center py-24 text-slate-400">
        <ClipboardList size={48} className="mx-auto mb-3 text-slate-200"/>
        <h2 className="text-lg font-semibold text-slate-500 mb-1">No assignments yet</h2>
        <p className="text-sm">Ask the administrator to assign you to an event.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <ClipboardList size={22} className="text-pool-700"/>
        <h1 className="page-title mb-0">Record Results</h1>
        <span className="text-sm text-slate-400 ml-1">— {workloads.length} event(s) assigned to you</span>
      </div>

      {Array.from(byMeet.entries()).map(([meetName, wls]) => (
        <div key={meetName} className="mb-8">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{meetName}</h2>

          {wls.map(wl => {
            const evId = wl.assignment.event_id
            const isOpen = !!expanded[evId]
            const event = wl.event
            const allRows = wl.heats.flatMap(h => h.rows)
            const draftCount = allRows.filter(r => r.result?.status?.toLowerCase() === 'draft').length
            const savedCount = allRows.filter(r => r.result?.status?.toLowerCase() === 'saved').length
            const finalCount = allRows.filter(r => r.result?.status?.toLowerCase() === 'finalized').length

            return (
              <div key={evId} className="card mb-3 overflow-hidden">
                {/* Event header row */}
                <button
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                  onClick={() => toggleEvent(evId, wl)}
                >
                  <div className="flex items-center gap-3">
                    {isOpen ? <ChevronDown size={16} className="text-slate-400"/> : <ChevronRight size={16} className="text-slate-400"/>}
                    <div>
                      <span className="font-semibold">{event?.name ?? wl.assignment.event_name}</span>
                      {event && (
                        <span className="text-slate-400 text-sm ml-2">
                          · {event.total_distance}m · {event.gender} · {event.stroke.replace(/_/g,' ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {draftCount > 0 && <span className="px-2 py-0.5 rounded border font-semibold text-amber-600 bg-amber-50 border-amber-200">{draftCount} draft</span>}
                    {savedCount > 0 && <span className="px-2 py-0.5 rounded border font-semibold text-blue-600 bg-blue-50 border-blue-200">{savedCount} saved</span>}
                    {finalCount > 0 && <span className="px-2 py-0.5 rounded border font-semibold text-emerald-600 bg-emerald-50 border-emerald-200">{finalCount} final</span>}
                  </div>
                </button>

                {/* Expanded content */}
                {isOpen && (
                  <div className="border-t border-slate-100">
                    {wl.loading ? (
                      <div className="py-8 text-center text-slate-400 text-sm">Loading heat sheet…</div>
                    ) : wl.heats.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-sm">
                        <AlertCircle size={20} className="mx-auto mb-2 text-amber-400"/>
                        Heats have not been seeded yet. Ask the administrator to seed this event first.
                      </div>
                    ) : (
                      <>
                        {wl.heats.map(heat => (
                          <div key={heat.heatNumber} className="border-b border-slate-100 last:border-0">
                            <div className="px-5 py-2 bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                              Heat {heat.heatNumber}
                            </div>
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-slate-100">
                                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-400 w-12">Lane</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">
                                    {wl.event?.is_relay ? 'Team' : 'Swimmer'}
                                  </th>
                                  {!wl.event?.is_relay && (
                                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">College</th>
                                  )}
                                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Time (sec)</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Flags</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Status</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {heat.rows.map(row => (
                                  <TimeRow
                                    key={row.entry.id}
                                    row={row}
                                    onSaved={() => loadHeats(wl)}
                                  />
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ))}

                        {/* Submit for review button */}
                        <div className="px-5 py-3 bg-slate-50 flex items-center justify-between">
                          <p className="text-xs text-slate-500">
                            Enter all times above, then submit for admin review.
                          </p>
                          <div className="flex items-center gap-3">
                            {submitMsg[evId] && (
                              <span className={`text-xs font-medium ${submitMsg[evId].startsWith('✓') ? 'text-emerald-600' : 'text-red-500'}`}>
                                {submitMsg[evId]}
                              </span>
                            )}
                            <button
                              onClick={() => handleSubmitEvent(wl)}
                              disabled={submitting[evId] || draftCount === 0}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-pool-700 text-white text-sm font-medium
                                hover:bg-pool-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              <Save size={14}/>
                              {submitting[evId] ? 'Submitting…' : `Submit ${draftCount} for Review`}
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
