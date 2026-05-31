// ─── TeamsPage ────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react'
import { Plus, UsersRound, FileSpreadsheet, Upload, Download } from 'lucide-react'
import { teamsApi, excelApi, downloadBlob } from './api'
import { useAuth } from './authStore'
import type { Team } from './types'

interface ImportSummary { created: number; updated: number; skipped: number; errors: string[] }

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [show, setShow] = useState(false)
  const [form, setForm] = useState({ name: '', college: '', gender: 'M' })
  const { isAdmin } = useAuth()
  const [search, setSearch] = useState('')
  const [importing, setImporting] = useState(false)
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = () => teamsApi.list().then(r => setTeams(r.data))
  useEffect(() => { load() }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    await teamsApi.create(form)
    setShow(false); load()
  }

  const handleTemplate = async () => {
    const r = await excelApi.teams.template()
    downloadBlob(r.data, 'teams_template.xlsx')
  }

  const handleExport = async () => {
    const r = await excelApi.teams.export()
    downloadBlob(r.data, 'teams_export.xlsx')
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true); setSummary(null)
    try {
      const r = await excelApi.teams.import(file)
      setSummary(r.data)
      load()
    } catch (err: any) {
      setSummary({ created: 0, updated: 0, skipped: 0, errors: [err.response?.data?.detail ?? 'Upload failed'] })
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const filtered = teams.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.college ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title mb-0">Teams</h1>
        {isAdmin() && (
          <button onClick={() => setShow(!show)} className="btn-primary flex items-center gap-2">
            <Plus size={16}/> Create Team
          </button>
        )}
      </div>

      {/* ── Excel toolbar (admin only) ── */}
      {isAdmin() && (
        <div className="flex items-center gap-2 mb-5 p-3 bg-green-50 border border-green-200 rounded-lg">
          <FileSpreadsheet size={16} className="text-green-600 shrink-0"/>
          <span className="text-sm font-medium text-green-800 mr-2">Excel</span>

          <button
            onClick={handleTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white border border-green-300 text-green-700 hover:bg-green-50 transition-colors"
          >
            <Download size={13}/> Download Template
          </button>

          <label className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer
            ${importing
              ? 'bg-slate-100 border-slate-200 text-slate-400 pointer-events-none'
              : 'bg-white border-green-300 text-green-700 hover:bg-green-50'}`}>
            <Upload size={13}/> {importing ? 'Importing…' : 'Import from Excel'}
            <input ref={fileRef} type="file" accept=".xlsx,.xlsm" className="hidden" onChange={handleImport} disabled={importing}/>
          </label>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white border border-green-300 text-green-700 hover:bg-green-50 transition-colors"
          >
            <Download size={13}/> Export to Excel
          </button>
        </div>
      )}

      {/* ── Import summary ── */}
      {summary && (
        <div className={`mb-4 p-3 rounded-lg text-sm border ${summary.errors.length ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
          <p className="font-medium mb-1">
            Import complete — <span className="text-emerald-700">+{summary.created} created</span>{' '}
            · <span className="text-blue-700">{summary.updated} updated</span>{' '}
            · <span className="text-slate-500">{summary.skipped} skipped</span>
            {summary.errors.length > 0 && <span className="text-red-600"> · {summary.errors.length} error(s)</span>}
          </p>
          {summary.errors.map((e, i) => <p key={i} className="text-red-600 text-xs">{e}</p>)}
          <button onClick={() => setSummary(null)} className="mt-1 text-xs text-slate-400 hover:text-slate-600 underline">Dismiss</button>
        </div>
      )}

      {/* ── Create team form ── */}
      {show && (
        <div className="card p-5 mb-6">
          <h2 className="font-semibold mb-4">Create Team</h2>
          <form onSubmit={submit} className="grid grid-cols-3 gap-4">
            <div><label className="label">Team Name</label><input className="input" required value={form.name} onChange={e => setForm({...form, name: e.target.value})}/></div>
            <div><label className="label">College</label><input className="input" value={form.college} onChange={e => setForm({...form, college: e.target.value})}/></div>
            <div><label className="label">Gender</label>
              <select className="input" value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}>
                <option value="M">Male</option><option value="F">Female</option>
              </select>
            </div>
            <div className="col-span-3 flex gap-2 justify-end">
              <button type="button" onClick={() => setShow(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Create</button>
            </div>
          </form>
        </div>
      )}

      <div className="mb-4">
        <input className="input max-w-xs" placeholder="Search name or college…" value={search} onChange={e => setSearch(e.target.value)}/>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Team Name</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">College</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Gender</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0
              ? <tr><td colSpan={3} className="text-center py-10 text-slate-400"><UsersRound size={32} className="mx-auto mb-2 text-slate-200"/>No teams yet</td></tr>
              : filtered.map(t => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{t.name}</td>
                  <td className="px-4 py-3 text-slate-500">{t.college ?? '—'}</td>
                  <td className="px-4 py-3">{t.gender === 'M' ? '♂ Male' : '♀ Female'}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}
