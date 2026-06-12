import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from './authStore'
import { Users, UsersRound, Calendar, LayoutDashboard, LogOut, ClipboardList, Trophy } from 'lucide-react'

const nav = [
  { to: '/',         icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/meets',    icon: Calendar,        label: 'Meets' },
  { to: '/athletes', icon: Users,           label: 'Participants' },
  { to: '/teams',    icon: UsersRound,      label: 'Teams' },
  { to: '/recorder', icon: ClipboardList,   label: 'Record Results', recorderOnly: true },
]

export default function Layout() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-56 bg-slate-800 text-white flex flex-col shrink-0">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-white/10">
          <Trophy size={22} className="text-blue-500" />
          <span className="font-bold tracking-tight">Sports Event Manager</span>
        </div>
        <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
          {nav
            .filter(n => !n.recorderOnly || !isAdmin())
            .map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-white/20 text-white font-medium' : 'text-white/65 hover:bg-white/10 hover:text-white'
                }`}>
              <Icon size={16} />{label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-white/10">
          <div className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">{user?.user_type}</div>
          <div className="text-sm text-white font-medium mb-3 truncate">{user?.name}</div>
          <button onClick={handleLogout}
            className="flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-slate-50">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
