import { Routes, Route, Navigate, useLocation } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import Setup from '@/pages/Setup'
import Dashboard from '@/pages/Dashboard'
import Campaigns from '@/pages/Campaigns'
import Admin from '@/pages/Admin'
import OutreachLog from '@/pages/OutreachLog'
import Notifications from '@/pages/Notifications'
import Pairing from '@/pages/Pairing'
import { Loader2 } from 'lucide-react'

function App() {
  const { setupComplete, loading } = useAuth()
  const location = useLocation()
  const deviceToken = localStorage.getItem('device_token')
  const isPWA = location.pathname === '/pair'
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  // If PWA has device token and setup is done, go to Dashboard
  if (deviceToken && setupComplete) {
    if (location.pathname === '/pair') {
      return <Navigate to="/" />
    }
  }

  // If PWA doesn't have device token, show Pairing
  if (deviceToken === null && !setupComplete) {
    return <Pairing />
  }

  // If not paired and setup not done, show Setup
  if (!setupComplete && !isPWA) {
    return <Setup />
  }

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/campaigns" element={<Campaigns />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/log" element={<OutreachLog />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/pair" element={<Pairing />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default App
