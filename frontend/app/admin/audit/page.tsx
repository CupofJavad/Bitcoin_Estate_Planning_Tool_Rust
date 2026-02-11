'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { adminApi, type AuditEventRow } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { ArrowLeft, Download } from 'lucide-react'

export default function AdminAuditPage() {
  const { user } = useAuth()
  const [events, setEvents] = useState<AuditEventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [action, setAction] = useState('')
  const [entityType, setEntityType] = useState('')

  const fetchEvents = useCallback(() => {
    if (user?.role !== 'admin') return
    const params: Parameters<typeof adminApi.listAuditEvents>[0] = { limit: 200 }
    if (from) params.from = `${from}T00:00:00.000Z`
    if (to) params.to = `${to}T23:59:59.999Z`
    if (action) params.action = action
    if (entityType) params.entity_type = entityType
    adminApi
      .listAuditEvents(params)
      .then(setEvents)
      .catch((err) => toast(err instanceof Error ? err.message : 'Failed to load audit events', 'error'))
      .finally(() => setLoading(false))
  }, [user?.role, from, to, action, entityType])

  useEffect(() => {
    if (user?.role !== 'admin') return
    setLoading(true)
    fetchEvents()
  }, [user?.role, fetchEvents])

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-events-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast('Export downloaded', 'success')
  }

  if (user && user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#334155] mb-4">You do not have permission to view this page.</p>
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="inline-flex items-center text-sm text-[#0ea5e9] hover:underline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Link>
            <Link href="/admin" className="text-sm text-[#334155] hover:text-[#0f172a]">
              Users
            </Link>
            <span className="text-sm font-medium text-[#0f172a]">Audit</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-[#0f172a] mb-4">Admin – Audit events</h1>

        <div className="bg-white rounded-lg border border-[#e2e8f0] p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-[#334155] mb-1">From (ISO date)</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full px-2 py-1.5 border border-[#e2e8f0] rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#334155] mb-1">To (ISO date)</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full px-2 py-1.5 border border-[#e2e8f0] rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#334155] mb-1">Action</label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="w-full px-2 py-1.5 border border-[#e2e8f0] rounded text-sm"
              >
                <option value="">All</option>
                <option value="created">created</option>
                <option value="updated">updated</option>
                <option value="deleted">deleted</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#334155] mb-1">Entity type</label>
              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                className="w-full px-2 py-1.5 border border-[#e2e8f0] rounded text-sm"
              >
                <option value="">All</option>
                <option value="estate_plan">estate_plan</option>
                <option value="beneficiary">beneficiary</option>
                <option value="timelock_policy">timelock_policy</option>
              </select>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchEvents()}>
              Apply
            </Button>
          </div>
        </div>

        <div className="flex justify-end mb-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={events.length === 0}>
            <Download className="h-4 w-4 mr-1" />
            Export JSON
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0ea5e9]" />
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-[#e2e8f0] overflow-x-auto">
            <table className="min-w-full divide-y divide-[#e2e8f0]">
              <thead className="bg-[#f8fafc]">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[#334155] uppercase">Time</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[#334155] uppercase">User ID</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[#334155] uppercase">Action</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[#334155] uppercase">Entity</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[#334155] uppercase">Entity ID</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[#334155] uppercase">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {events.map((e) => (
                  <tr key={e.id} className="text-sm">
                    <td className="px-3 py-2 text-[#334155] whitespace-nowrap">
                      {new Date(e.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-[#334155]">{e.user_id ?? '—'}</td>
                    <td className="px-3 py-2 text-[#0f172a]">{e.action}</td>
                    <td className="px-3 py-2 text-[#334155]">{e.entity_type}</td>
                    <td className="px-3 py-2 text-[#334155]">{e.entity_id ?? '—'}</td>
                    <td className="px-3 py-2 text-[#334155] max-w-[200px] truncate">
                      {e.details ? JSON.stringify(e.details) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {events.length === 0 && (
              <p className="px-4 py-8 text-center text-[#334155]">No audit events found.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
