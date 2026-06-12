import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './authStore'
import Layout           from './Layout'
import LoginPage        from './LoginPage'
import DashboardPage    from './DashboardPage'
import MeetsPage        from './MeetsPage'
import MeetDetailPage   from './MeetDetailPage'
import EventDetailPage  from './EventDetailPage'
import SwimmersPage     from './SwimmersPage'
import TeamsPage        from './TeamsPage'
import RecorderPage     from './RecorderPage'
import CertificatePage  from './CertificatePage'

function Guard({ children }: { children: React.ReactNode }) {
  return useAuth().token ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        {/* Certificate page: opens in new tab, no sidebar layout needed */}
        <Route path="/certificate" element={<CertificatePage />} />
        <Route path="/" element={<Guard><Layout /></Guard>}>
          <Route index element={<DashboardPage />} />
          <Route path="meets" element={<MeetsPage />} />
          <Route path="meets/:meetId" element={<MeetDetailPage />} />
          <Route path="meets/:meetId/events/:eventId" element={<EventDetailPage />} />
          {/* /swimmers kept for compat; /athletes is the T&F route */}
          <Route path="swimmers" element={<SwimmersPage />} />
          <Route path="athletes" element={<SwimmersPage />} />
          <Route path="teams" element={<TeamsPage />} />
          <Route path="recorder" element={<RecorderPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
