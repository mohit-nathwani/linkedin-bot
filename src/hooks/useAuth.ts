import { useState, useEffect, useCallback } from 'react'
import { API_URL } from '@/lib/supabase'

export function useAuth() {
  const [deviceToken, setDeviceToken] = useState<string | null>(() => localStorage.getItem('device_token'))
  const [isPaired, setIsPaired] = useState<boolean>(!!localStorage.getItem('device_token'))
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  const checkSetup = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/config`)
      const data = await res.json()
      setSetupComplete(data.setup_complete)
      setIsAdmin(data.setup_complete)
    } catch {
      setSetupComplete(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkSetup()
  }, [checkSetup])

  const pairDevice = async (code: string, label: string) => {
    const res = await fetch(`${API_URL}/api/pairing/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pairing_code: code, device_label: label }),
    })
    const data = await res.json()
    if (data.device_token) {
      localStorage.setItem('device_token', data.device_token)
      setDeviceToken(data.device_token)
      setIsPaired(true)
      return { success: true }
    }
    return { success: false, message: data.detail || 'Pairing failed' }
  }

  const unpairDevice = () => {
    localStorage.removeItem('device_token')
    setDeviceToken(null)
    setIsPaired(false)
  }

  return { deviceToken, isPaired, setupComplete, isAdmin, loading, pairDevice, unpairDevice, checkSetup }
}
