import { useState } from 'react'
import { API_URL } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export default function Pairing() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const handlePair = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/pairing/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairing_code: code, device_label: 'PWA Device' }),
      })
      const data = await res.json()
      if (data.device_token) {
        localStorage.setItem('device_token', data.device_token)
        setResult('Device paired successfully! You can now close this page and open the app.')
      } else {
        setResult(data.message || 'Invalid or expired pairing code.')
      }
    } catch {
      setResult('Connection failed. Check your internet.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Pair Your Device</CardTitle>
          <p className="text-center text-muted-foreground">Enter the 6-digit code shown on your desktop web app.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className="text-center text-2xl tracking-widest"
            maxLength={6}
          />
          <Button onClick={handlePair} disabled={code.length !== 6 || loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Pair Device
          </Button>
          {result && <p className={`text-sm text-center ${result.includes('success') ? 'text-green-600' : 'text-red-600'}`}>{result}</p>}
        </CardContent>
      </Card>
    </div>
  )
}
