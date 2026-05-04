import { useEffect, useState } from 'react'
import { API_URL } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Play, SkipForward, RefreshCw, Smartphone, Trash2, TestTube } from 'lucide-react'
import { Link } from 'react-router'

export default function Admin() {
  const [config, setConfig] = useState<any>({})
  const [locators, setLocators] = useState<any[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [blacklist, setBlacklist] = useState<any[]>([])
  const [devices, setDevices] = useState<any[]>([])
  const [schedule, setSchedule] = useState<any>(null)
  const [pairingCode, setPairingCode] = useState('')
  const [notifSettings, setNotifSettings] = useState<any>({})
  const [newBl, setNewBl] = useState({ type: 'profile_url', value: '', reason: '' })

  const fetchAll = async () => {
    const [cfgRes, locRes, campRes, blRes, devRes, schRes, notRes] = await Promise.all([
      fetch(`${API_URL}/api/admin/config`).then(r => r.json()),
      fetch(`${API_URL}/api/locators`).then(r => r.json()),
      fetch(`${API_URL}/api/campaigns`).then(r => r.json()),
      fetch(`${API_URL}/api/blacklist`).then(r => r.json()),
      fetch(`${API_URL}/api/pairing/devices`).then(r => r.json()),
      fetch(`${API_URL}/api/schedule/current`).then(r => r.json()),
      fetch(`${API_URL}/api/notification-settings`).then(r => r.json()),
    ])
    setConfig(cfgRes)
    setLocators(locRes.locators || [])
    setCampaigns(campRes.campaigns || [])
    setBlacklist(blRes.blacklist || [])
    setDevices(devRes.devices || [])
    setSchedule(schRes)
    setNotifSettings(notRes)
  }

  useEffect(() => { fetchAll() }, [])

  const saveAppearance = async () => {
    await fetch(`${API_URL}/api/admin/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
    alert('Saved')
  }

  const updateLocator = async (name: string, css: string, xpath: string) => {
    await fetch(`${API_URL}/api/locators/${name}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ css_selector: css, xpath }),
    })
    fetchAll()
  }

  const testLocator = async (name: string) => {
    const res = await fetch(`${API_URL}/api/locators/${name}/test`, { method: 'POST' })
    const data = await res.json()
    alert(data.result === 'pass' ? `Locator ${name} passed` : `Locator ${name} failed: ${data.message}`)
  }

  const addBlacklist = async () => {
    await fetch(`${API_URL}/api/blacklist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBl),
    })
    setNewBl({ type: 'profile_url', value: '', reason: '' })
    fetchAll()
  }

  const removeBlacklist = async (id: string) => {
    await fetch(`${API_URL}/api/blacklist/${id}`, { method: 'DELETE' })
    fetchAll()
  }

  const generatePairingCode = async () => {
    const res = await fetch(`${API_URL}/api/pairing/generate`, { method: 'POST' })
    const data = await res.json()
    setPairingCode(data.pairing_code)
  }

  const unpairDevice = async (id: string) => {
    await fetch(`${API_URL}/api/pairing/unpair/${id}`, { method: 'POST' })
    fetchAll()
  }

  const scheduleAction = async (action: string) => {
    await fetch(`${API_URL}/api/schedule/override`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    fetchAll()
  }

  const updateNotif = async (type: string, enabled: boolean) => {
    const updated = { ...notifSettings, [type]: enabled }
    await fetch(`${API_URL}/api/notification-settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [type === 'captcha' ? 'notif_captcha' : type === 'session_expired' ? 'notif_session_expired' : type === 'campaign_complete' ? 'notif_campaign_complete' : type === 'daily_summary' ? 'notif_daily_summary' : 'notif_locator_fail']: enabled }),
    })
    setNotifSettings(updated)
  }

  const sendTestPush = async (deviceId: string) => {
    await fetch(`${API_URL}/api/push/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: deviceId }),
    })
    alert('Test notification sent')
  }

  const sessionRefresh = async () => {
    await fetch(`${API_URL}/api/session/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshed: true }) })
    alert('Session refreshed')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link to="/"><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button></Link>
          <h1 className="text-xl font-bold">Admin Panel</h1>
        </div>
        <Button onClick={sessionRefresh}><RefreshCw className="h-4 w-4 mr-1" />Session Refreshed - Resume</Button>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        <Tabs defaultValue="appearance">
          <TabsList className="mb-4 flex-wrap">
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="locators">Locators</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="blacklist">Blacklist</TabsTrigger>
            <TabsTrigger value="notifications">Push Settings</TabsTrigger>
            <TabsTrigger value="devices">Devices</TabsTrigger>
          </TabsList>

          <TabsContent value="appearance">
            <Card>
              <CardHeader><CardTitle>App Appearance</CardTitle></CardHeader>
              <CardContent className="space-y-4 max-w-xl">
                <div className="space-y-2"><Label>App Name</Label><Input value={config.app_name || ''} onChange={e => setConfig({ ...config, app_name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Logo URL</Label><Input value={config.app_logo_url || ''} onChange={e => setConfig({ ...config, app_logo_url: e.target.value })} /></div>
                <div className="space-y-2"><Label>Primary Color</Label><Input type="color" value={config.primary_color || '#1F4E79'} onChange={e => setConfig({ ...config, primary_color: e.target.value })} /></div>
                <div className="space-y-2"><Label>Secondary Color</Label><Input type="color" value={config.secondary_color || '#4A90D9'} onChange={e => setConfig({ ...config, secondary_color: e.target.value })} /></div>
                <div className="space-y-2"><Label>Report Email</Label><Input value={config.report_email || ''} onChange={e => setConfig({ ...config, report_email: e.target.value })} /></div>
                <Button onClick={saveAppearance}>Save Appearance</Button>
                {config.app_logo_url && <img src={config.app_logo_url} alt="Logo preview" className="h-16 mt-2" />}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="locators">
            <Card>
              <CardHeader><CardTitle>Locators Manager</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Name</TableHead><TableHead>CSS Selector</TableHead><TableHead>XPath</TableHead><TableHead>Actions</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {locators.map(l => (
                      <TableRow key={l.name}>
                        <TableCell className="font-medium">{l.name}</TableCell>
                        <TableCell><Input value={l.css_selector || ''} onChange={e => updateLocator(l.name, e.target.value, l.xpath || '')} /></TableCell>
                        <TableCell><Input value={l.xpath || ''} onChange={e => updateLocator(l.name, l.css_selector || '', e.target.value)} /></TableCell>
                        <TableCell><Button size="sm" variant="outline" onClick={() => testLocator(l.name)}><TestTube className="h-3 w-3 mr-1" />Test</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="campaigns">
            <Card>
              <CardHeader><CardTitle>Campaign Overview</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Name</TableHead><TableHead>Status</TableHead><TableHead>Sent</TableHead><TableHead>Accepted</TableHead><TableHead>Rate</TableHead><TableHead>Last Run</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map(c => (
                      <TableRow key={c.id}>
                        <TableCell>{c.name}</TableCell>
                        <TableCell><Badge>{c.status}</Badge></TableCell>
                        <TableCell>{c.total_sent}</TableCell>
                        <TableCell>{c.total_accepted}</TableCell>
                        <TableCell>{c.total_sent ? Math.round((c.total_accepted / c.total_sent) * 100) : 0}%</TableCell>
                        <TableCell>{c.last_run_at ? new Date(c.last_run_at).toLocaleDateString() : 'Never'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule">
            <Card>
              <CardHeader><CardTitle>Schedule Override</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button onClick={() => scheduleAction('run_today')}><Play className="h-4 w-4 mr-1" />Run Today</Button>
                  <Button variant="outline" onClick={() => scheduleAction('skip_today')}><SkipForward className="h-4 w-4 mr-1" />Skip Today</Button>
                  <Button variant="outline" onClick={() => scheduleAction('regenerate_week')}><RefreshCw className="h-4 w-4 mr-1" />Regenerate Week</Button>
                </div>
                <pre className="bg-gray-100 p-3 rounded text-sm">{JSON.stringify(schedule, null, 2)}</pre>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="blacklist">
            <Card>
              <CardHeader><CardTitle>Blacklist Manager</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <select className="border rounded px-2 py-1" value={newBl.type} onChange={e => setNewBl({ ...newBl, type: e.target.value })}>
                    <option value="profile_url">Profile URL</option>
                    <option value="company_name">Company Name</option>
                  </select>
                  <Input placeholder="Value" value={newBl.value} onChange={e => setNewBl({ ...newBl, value: e.target.value })} />
                  <Input placeholder="Reason (optional)" value={newBl.reason} onChange={e => setNewBl({ ...newBl, reason: e.target.value })} />
                  <Button onClick={addBlacklist}>Add</Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Type</TableHead><TableHead>Value</TableHead><TableHead>Reason</TableHead><TableHead>Actions</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {blacklist.map(b => (
                      <TableRow key={b.id}>
                        <TableCell>{b.type}</TableCell>
                        <TableCell className="max-w-xs truncate">{b.value}</TableCell>
                        <TableCell>{b.reason}</TableCell>
                        <TableCell><Button size="sm" variant="destructive" onClick={() => removeBlacklist(b.id)}><Trash2 className="h-3 w-3" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader><CardTitle>Push Notification Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: 'captcha', label: 'CAPTCHA Alert' },
                  { key: 'session_expired', label: 'Session Expired' },
                  { key: 'campaign_complete', label: 'Campaign Complete' },
                  { key: 'daily_summary', label: 'Daily Summary' },
                  { key: 'locator_fail', label: 'Locator Failure' },
                ].map(n => (
                  <div key={n.key} className="flex items-center justify-between">
                    <Label>{n.label}</Label>
                    <Switch checked={notifSettings[n.key] !== false} onCheckedChange={v => updateNotif(n.key, v)} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="devices">
            <Card>
              <CardHeader><CardTitle>Paired Devices</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={generatePairingCode}><Smartphone className="h-4 w-4 mr-1" />Generate New Pairing Code</Button>
                {pairingCode && <p className="text-2xl font-bold text-blue-600">{pairingCode}</p>}
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Label</TableHead><TableHead>Paired At</TableHead><TableHead>Actions</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {devices.map(d => (
                      <TableRow key={d.id}>
                        <TableCell>{d.device_label || 'Unknown'}</TableCell>
                        <TableCell>{d.paired_at ? new Date(d.paired_at).toLocaleString() : 'N/A'}</TableCell>
                        <TableCell className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => sendTestPush(d.id)}>Test Push</Button>
                          <Button size="sm" variant="destructive" onClick={() => unpairDevice(d.id)}>Unpair</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
