import { useState } from 'react'
import { API_URL } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export default function Setup() {
  const [form, setForm] = useState({
    app_name: 'LinkedReach',
    app_logo_url: '',
    primary_color: '#1F4E79',
    secondary_color: '#4A90D9',
    report_email: '',
    gmail_app_password: '',
    gemini_api_key: '',
    supabase_url: import.meta.env.VITE_SUPABASE_URL || '',
  })
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch(`${API_URL}/api/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      setDone(true)
      window.location.reload()
    } catch (e) {
      alert('Setup failed. Check backend is running.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to LinkedIn Outreach Bot</CardTitle>
          <p className="text-muted-foreground">Complete this one-time setup to get started.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>App Name</Label>
              <Input value={form.app_name} onChange={e => setForm({ ...form, app_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>App Logo URL</Label>
              <Input value={form.app_logo_url} onChange={e => setForm({ ...form, app_logo_url: e.target.value })} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Primary Color</Label>
              <Input type="color" value={form.primary_color} onChange={e => setForm({ ...form, primary_color: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Secondary Color</Label>
              <Input type="color" value={form.secondary_color} onChange={e => setForm({ ...form, secondary_color: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Report Email (Gmail)</Label>
              <Input type="email" value={form.report_email} onChange={e => setForm({ ...form, report_email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Gmail App Password (16 chars)</Label>
              <Input type="password" value={form.gmail_app_password} onChange={e => setForm({ ...form, gmail_app_password: e.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Gemini API Key</Label>
              <Input type="password" value={form.gemini_api_key} onChange={e => setForm({ ...form, gemini_api_key: e.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Supabase Project URL</Label>
              <Input value={form.supabase_url} onChange={e => setForm({ ...form, supabase_url: e.target.value })} />
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full mt-4">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save & Continue
          </Button>
          {done && <p className="text-green-600 text-sm text-center">Setup complete! Reloading...</p>}
        </CardContent>
      </Card>
    </div>
  )
}
