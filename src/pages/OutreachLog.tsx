import { useEffect, useState } from 'react'
import { API_URL } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Search } from 'lucide-react'
import { Link } from 'react-router'

export default function OutreachLog() {
  const [logs, setLogs] = useState<any[]>([])
  const [filter, setFilter] = useState({ campaign_id: '', status: '', search: '' })
  const [offset, setOffset] = useState(0)
  const limit = 100

  const fetchLogs = async () => {
    let url = `${API_URL}/api/outreach-log?limit=${limit}&offset=${offset}`
    if (filter.campaign_id) url += `&campaign_id=${filter.campaign_id}`
    if (filter.status) url += `&status=${filter.status}`
    const res = await fetch(url)
    const data = await res.json()
    setLogs(data.logs || [])
  }

  useEffect(() => { fetchLogs() }, [offset, filter.campaign_id, filter.status])

  const filtered = logs.filter(l => {
    const s = filter.search.toLowerCase()
    if (!s) return true
    return (l.first_name?.toLowerCase().includes(s) || l.last_name?.toLowerCase().includes(s) || l.profile_url?.toLowerCase().includes(s))
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent': return <Badge className="bg-blue-100 text-blue-800">Sent</Badge>
      case 'accepted': return <Badge className="bg-green-100 text-green-800">Accepted</Badge>
      case 'followed_up': return <Badge className="bg-purple-100 text-purple-800">Followed Up</Badge>
      case 'second_followed_up': return <Badge className="bg-indigo-100 text-indigo-800">2nd Follow-Up</Badge>
      case 'replied': return <Badge className="bg-orange-100 text-orange-800">Replied</Badge>
      case 'skipped': return <Badge variant="secondary">Skipped</Badge>
      case 'failed': return <Badge variant="destructive">Failed</Badge>
      default: return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link to="/"><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button></Link>
          <h1 className="text-xl font-bold">Outreach Log</h1>
        </div>
      </header>
      <main className="p-6 max-w-7xl mx-auto space-y-4">
        <Card>
          <CardContent className="p-4 flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name..." value={filter.search} onChange={e => setFilter({ ...filter, search: e.target.value })} />
            </div>
            <Input placeholder="Campaign ID filter" value={filter.campaign_id} onChange={e => setFilter({ ...filter, campaign_id: e.target.value })} />
            <select className="border rounded px-2 py-1" value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })}>
              <option value="">All Statuses</option>
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
              <option value="followed_up">Followed Up</option>
              <option value="replied">Replied</option>
              <option value="skipped">Skipped</option>
            </select>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Records ({filtered.length})</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent At</TableHead>
                  <TableHead>Accepted</TableHead>
                  <TableHead>Follow-Up</TableHead>
                  <TableHead>Reply</TableHead>
                  <TableHead>Sentiment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(l => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <p className="font-medium">{l.first_name} {l.last_name}</p>
                      <a href={l.profile_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline truncate max-w-xs block">{l.profile_url}</a>
                    </TableCell>
                    <TableCell>{l.campaigns?.name || '-'}</TableCell>
                    <TableCell>{getStatusBadge(l.status)}</TableCell>
                    <TableCell>{l.connection_sent_at ? new Date(l.connection_sent_at).toLocaleDateString() : '-'}</TableCell>
                    <TableCell>{l.connection_accepted ? 'Yes' : 'No'}</TableCell>
                    <TableCell>{l.followup_sent ? 'Yes' : 'No'}</TableCell>
                    <TableCell>{l.reply_detected ? 'Yes' : 'No'}</TableCell>
                    <TableCell>{l.reply_sentiment || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-between mt-4">
              <Button variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}>Previous</Button>
              <Button variant="outline" onClick={() => setOffset(offset + limit)}>Next</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
