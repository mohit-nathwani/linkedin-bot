import { useEffect, useState } from 'react'
import { API_URL } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Bell } from 'lucide-react'
import { Link } from 'react-router'

export default function Notifications() {
  const [notifications, setNotifications] = useState<any[]>([])

  const fetchNotifications = async () => {
    const res = await fetch(`${API_URL}/api/notifications?limit=100`)
    const data = await res.json()
    setNotifications(data.notifications || [])
  }

  useEffect(() => { fetchNotifications() }, [])

  const markRead = async (id: string) => {
    await fetch(`${API_URL}/api/notifications/${id}/read`, { method: 'POST' })
    fetchNotifications()
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'captcha': return <Badge variant="destructive">CAPTCHA</Badge>
      case 'session_expired': return <Badge className="bg-orange-100 text-orange-800">Session</Badge>
      case 'campaign_complete': return <Badge className="bg-blue-100 text-blue-800">Campaign</Badge>
      case 'daily_summary': return <Badge className="bg-green-100 text-green-800">Summary</Badge>
      case 'locator_fail': return <Badge className="bg-red-100 text-red-800">Locator</Badge>
      default: return <Badge>{type}</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link to="/"><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button></Link>
          <h1 className="text-xl font-bold">Notifications</h1>
        </div>
      </header>
      <main className="p-6 max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" />Notification History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {notifications.length === 0 && <p className="text-muted-foreground">No notifications yet.</p>}
            {notifications.map(n => (
              <div key={n.id} className={`flex items-start gap-3 p-3 rounded border ${n.read ? 'bg-gray-50' : 'bg-white'}`}>
                <div className="mt-0.5">{getIcon(n.type)}</div>
                <div className="flex-1">
                  <p className="text-sm">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(n.sent_at).toLocaleString()}</p>
                </div>
                {!n.read && <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>Mark Read</Button>}
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
