import { useEffect, useState } from 'react'
import { API_URL } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Activity, Users, MessageSquare, CheckCircle, AlertTriangle, RefreshCw, Settings, Smartphone } from 'lucide-react'
import { Link } from 'react-router'

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null)
  const [activity, setActivity] = useState<any[]>([])
  const [schedule, setSchedule] = useState<any>(null)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [botStatus, setBotStatus] = useState<any>({})
  const [refreshing, setRefreshing] = useState(false)

  const fetchAll = async () => {
    setRefreshing(true)
    try {
      const [sRes, aRes, schRes, cRes, bRes] = await Promise.all([
        fetch(`${API_URL}/api/dashboard/stats`).then(r => r.json()),
        fetch(`${API_URL}/api/dashboard/activity?limit=50`).then(r => r.json()),
        fetch(`${API_URL}/api/schedule/current`).then(r => r.json()),
        fetch(`${API_URL}/api/campaigns`).then(r => r.json()),
        fetch(`${API_URL}/api/bot/status`).then(r => r.json()),
      ])
      setStats(sRes)
      setActivity(aRes.activity || [])
      setSchedule(schRes)
      setCampaigns(cRes.campaigns || [])
      setBotStatus(bRes)
    } catch (e) {
      console.error(e)
    }
    setRefreshing(false)
  }

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 30000)
    return () => clearInterval(interval)
  }, [])

  const today = new Date().toISOString().split('T')[0]
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const scheduleData = weekDays.map(d => ({
    day: d,
    target: schedule?.daily_targets?.[d] || 0,
    actual: schedule?.actual_sent?.[today] || 0,
    scheduled: (schedule?.scheduled_days || []).includes(d),
  }))

  const campaignChart = campaigns.map(c => ({
    name: c.name,
    sent: c.total_sent || 0,
    accepted: c.total_accepted || 0,
    rate: c.total_sent ? Math.round((c.total_accepted / c.total_sent) * 100) : 0,
  }))

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Idle': return 'bg-green-100 text-green-800'
      case 'Running Connection Job': return 'bg-blue-100 text-blue-800'
      case 'Running Checker': return 'bg-purple-100 text-purple-800'
      case 'CAPTCHA Paused': return 'bg-red-100 text-red-800'
      case 'Session Expired': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#1F4E79] flex items-center justify-center text-white font-bold">LR</div>
          <h1 className="text-xl font-bold text-gray-900">LinkedReach</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchAll} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link to="/campaigns"><Button variant="outline" size="sm">Campaigns</Button></Link>
          <Link to="/admin"><Button variant="outline" size="sm"><Settings className="h-4 w-4 mr-1" />Admin</Button></Link>
          <Link to="/pair"><Button variant="outline" size="sm"><Smartphone className="h-4 w-4 mr-1" />Pair</Button></Link>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Status Banner */}
        <div className="flex items-center gap-3">
          <Badge className={getStatusColor(botStatus.bot_status || 'Idle')}>
            <Activity className="h-3 w-3 mr-1" />
            {botStatus.bot_status || 'Idle'}
          </Badge>
          {botStatus.session_paused && (
            <Badge variant="destructive">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Session Paused
            </Badge>
          )}
        </div>

        {/* Today's Numbers */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Sent Today</p>
                <p className="text-2xl font-bold">{stats?.today?.sent || 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Accepted Today</p>
                <p className="text-2xl font-bold">{stats?.today?.accepted || 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <MessageSquare className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Follow-Ups Today</p>
                <p className="text-2xl font-bold">{stats?.today?.followups || 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Activity className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Replies Today</p>
                <p className="text-2xl font-bold">{stats?.today?.replies || 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle>All-Time Stats</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-muted-foreground text-sm">Total Sent</p><p className="text-xl font-bold">{stats?.all_time?.sent || 0}</p></div>
                    <div><p className="text-muted-foreground text-sm">Total Accepted</p><p className="text-xl font-bold">{stats?.all_time?.accepted || 0}</p></div>
                    <div><p className="text-muted-foreground text-sm">Total Follow-Ups</p><p className="text-xl font-bold">{stats?.all_time?.followups || 0}</p></div>
                    <div><p className="text-muted-foreground text-sm">Total Replies</p><p className="text-xl font-bold">{stats?.all_time?.replies || 0}</p></div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Weekly Schedule</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={scheduleData}>
                        <XAxis dataKey="day" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="target" fill="#1F4E79" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="campaigns">
            <Card>
              <CardHeader><CardTitle>Campaign Performance</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={campaignChart}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="sent" fill="#1F4E79" />
                      <Bar dataKey="accepted" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule">
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map(d => {
                const isScheduled = (schedule?.scheduled_days || []).includes(d)
                const target = schedule?.daily_targets?.[d] || 0
                return (
                  <Card key={d} className={isScheduled ? 'border-blue-500' : ''}>
                    <CardContent className="p-3 text-center">
                      <p className="font-semibold">{d}</p>
                      {isScheduled ? (
                        <>
                          <Badge variant="default" className="mt-1">Scheduled</Badge>
                          <p className="text-sm mt-1">Target: {target}</p>
                        </>
                      ) : (
                        <Badge variant="secondary" className="mt-1">Rest</Badge>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader><CardTitle>Live Activity Feed</CardTitle></CardHeader>
              <CardContent className="max-h-96 overflow-y-auto">
                {activity.length === 0 && <p className="text-muted-foreground">No activity today yet.</p>}
                {activity.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 py-2 border-b last:border-0">
                    <div className={`w-2 h-2 rounded-full mt-2 ${item.status === 'sent' ? 'bg-blue-500' : item.status === 'accepted' ? 'bg-green-500' : item.status === 'replied' ? 'bg-orange-500' : 'bg-gray-400'}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.first_name} {item.last_name}</p>
                      <p className="text-xs text-muted-foreground">{item.status} • {item.campaigns?.name || 'Campaign'}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(item.connection_sent_at || item.accepted_at || item.followup_sent_at).toLocaleTimeString()}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
