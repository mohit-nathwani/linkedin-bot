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
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  // Priority 1: If no device token, show Pairing first (PWA needs to pair before anything else)
  if (!deviceToken) {
    return <Pairing />
  }

  // Priority 2: If device token exists but setup not done, show Setup
  if (!setupComplete) {
    return <Setup />
  }

  // Priority 3: Everything is done, show Dashboard
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
