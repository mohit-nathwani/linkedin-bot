import { useEffect, useState } from 'react'
import { API_URL } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertTriangle, Play, Pause, Square, Plus, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<any>({
    name: '', linkedin_search_url: '', connection_draft: '', connection_draft_b: '', connection_draft_c: '',
    followup_draft: '', second_followup_draft: '', daily_target_avg: 20, daily_max: 25,
    min_delay_seconds: 120, max_delay_seconds: 240, warm_up_mode: false,
  })
  const [delayWarning, setDelayWarning] = useState<string | null>(null)

  const fetchCampaigns = async () => {
    const res = await fetch(`${API_URL}/api/campaigns`)
    const data = await res.json()
    setCampaigns(data.campaigns || [])
  }

  useEffect(() => { fetchCampaigns() }, [])

  const checkDelayWarning = (min: number, max: number) => {
    if (min < 60) return 'HIGH RISK: Delays this short will very likely trigger LinkedIn bot detection. Your account may be restricted or permanently banned. Are you sure?'
    if (min < 120) return 'CAUTION: Delays under 120 seconds increase detection risk. Recommended minimum is 120 seconds. Proceed?'
    if (max > 240) return 'INFO: Longer delays reduce risk further but slow down daily progress. This is fine.'
    return null
  }

  const handleSave = async () => {
    const warning = checkDelayWarning(form.min_delay_seconds, form.max_delay_seconds)
    if (warning && !form.delay_warning_acknowledged) {
      setDelayWarning(warning)
      return
    }
    if (editingId) {
      await fetch(`${API_URL}/api/campaigns/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, delay_warning_acknowledged: true }),
      })
    } else {
      await fetch(`${API_URL}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, delay_warning_acknowledged: true }),
      })
    }
    setShowForm(false)
    setEditingId(null)
    setDelayWarning(null)
    setForm({
      name: '', linkedin_search_url: '', connection_draft: '', connection_draft_b: '', connection_draft_c: '',
      followup_draft: '', second_followup_draft: '', daily_target_avg: 20, daily_max: 25,
      min_delay_seconds: 120, max_delay_seconds: 240, warm_up_mode: false,
    })
    fetchCampaigns()
  }

  const editCampaign = (c: any) => {
    setEditingId(c.id)
    setForm({ ...c })
    setShowForm(true)
  }

  const deleteCampaign = async (id: string) => {
    if (!confirm('Delete this campaign?')) return
    await fetch(`${API_URL}/api/campaigns/${id}`, { method: 'DELETE' })
    fetchCampaigns()
  }

  const toggleStatus = async (id: string, action: 'pause' | 'resume' | 'stop') => {
    await fetch(`${API_URL}/api/campaigns/${id}/${action}`, { method: 'POST' })
    fetchCampaigns()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-100 text-green-800">Active</Badge>
      case 'paused': return <Badge className="bg-yellow-100 text-yellow-800">Paused</Badge>
      case 'stopped': return <Badge className="bg-red-100 text-red-800">Stopped</Badge>
      case 'completed': return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>
      default: return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link to="/"><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button></Link>
          <h1 className="text-xl font-bold">Campaign Manager</h1>
        </div>
        <Button onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', linkedin_search_url: '', connection_draft: '', connection_draft_b: '', connection_draft_c: '', followup_draft: '', second_followup_draft: '', daily_target_avg: 20, daily_max: 25, min_delay_seconds: 120, max_delay_seconds: 240, warm_up_mode: false }) }}>
          <Plus className="h-4 w-4 mr-1" />New Campaign
        </Button>
      </header>

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {showForm && (
          <Card>
            <CardHeader><CardTitle>{editingId ? 'Edit Campaign' : 'New Campaign'}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Campaign Name</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>LinkedIn Search URL</Label>
                  <Input value={form.linkedin_search_url} onChange={e => setForm({ ...form, linkedin_search_url: e.target.value })} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Connection Note Draft A (supports {'<firstname>'} {'<lastname>'} {'<currenttitle>'})</Label>
                  <Textarea value={form.connection_draft} onChange={e => setForm({ ...form, connection_draft: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Draft B (optional)</Label>
                  <Textarea value={form.connection_draft_b || ''} onChange={e => setForm({ ...form, connection_draft_b: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Draft C (optional)</Label>
                  <Textarea value={form.connection_draft_c || ''} onChange={e => setForm({ ...form, connection_draft_c: e.target.value })} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Follow-Up Draft</Label>
                  <Textarea value={form.followup_draft} onChange={e => setForm({ ...form, followup_draft: e.target.value })} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Second Follow-Up Draft (optional, sent after 7 days no reply)</Label>
                  <Textarea value={form.second_followup_draft || ''} onChange={e => setForm({ ...form, second_followup_draft: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Daily Target (avg)</Label>
                  <Input type="number" value={form.daily_target_avg} onChange={e => setForm({ ...form, daily_target_avg: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label>Daily Max Hard Cap</Label>
                  <Input type="number" value={form.daily_max} onChange={e => setForm({ ...form, daily_max: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label>Min Delay (seconds)</Label>
                  <Input type="number" min={15} value={form.min_delay_seconds} onChange={e => setForm({ ...form, min_delay_seconds: parseInt(e.target.value) || 15 })} />
                </div>
                <div className="space-y-2">
                  <Label>Max Delay (seconds)</Label>
                  <Input type="number" min={15} value={form.max_delay_seconds} onChange={e => setForm({ ...form, max_delay_seconds: parseInt(e.target.value) || 15 })} />
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={form.warm_up_mode} onCheckedChange={v => setForm({ ...form, warm_up_mode: v })} />
                  <Label>Warm-Up Mode (new accounts)</Label>
                </div>
              </div>

              {delayWarning && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-yellow-800">{delayWarning}</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => { setDelayWarning(null); handleSave() }}>I Understand, Proceed</Button>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleSave}>{editingId ? 'Update' : 'Create'}</Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>All Campaigns</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Accepted</TableHead>
                  <TableHead>Replied</TableHead>
                  <TableHead>Last Run</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{getStatusBadge(c.status)}</TableCell>
                    <TableCell>{c.total_sent || 0}</TableCell>
                    <TableCell>{c.total_accepted || 0}</TableCell>
                    <TableCell>{c.total_replied || 0}</TableCell>
                    <TableCell>{c.last_run_at ? new Date(c.last_run_at).toLocaleDateString() : 'Never'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {c.status === 'active' && <Button size="sm" variant="outline" onClick={() => toggleStatus(c.id, 'pause')}><Pause className="h-3 w-3" /></Button>}
                        {c.status === 'paused' && <Button size="sm" variant="outline" onClick={() => toggleStatus(c.id, 'resume')}><Play className="h-3 w-3" /></Button>}
                        {(c.status === 'active' || c.status === 'paused') && <Button size="sm" variant="outline" onClick={() => toggleStatus(c.id, 'stop')}><Square className="h-3 w-3" /></Button>}
                        <Button size="sm" variant="outline" onClick={() => editCampaign(c)}>Edit</Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteCampaign(c.id)}>Delete</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
