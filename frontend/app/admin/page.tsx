'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { adminApi, type AdminUserSummary } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'
import { ArrowLeft, Pencil } from 'lucide-react'

export default function AdminPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<AdminUserSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<AdminUserSummary | null>(null)
  const [editRole, setEditRole] = useState('owner')
  const [editActive, setEditActive] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchUsers = useCallback(() => {
    if (user?.role !== 'admin') return
    adminApi
      .listUsers()
      .then(setUsers)
      .catch((err) => toast(err instanceof Error ? err.message : 'Failed to load users', 'error'))
      .finally(() => setLoading(false))
  }, [user?.role])

  useEffect(() => {
    if (user?.role !== 'admin') return
    setLoading(true)
    fetchUsers()
  }, [user?.role, fetchUsers])

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0ea5e9]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/" className="inline-flex items-center text-sm text-[#0ea5e9] hover:underline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Estate Plans
          </Link>
          <Link href="/admin/audit" className="text-sm text-[#334155] hover:text-[#0ea5e9]">
            Audit
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-[#0f172a] mb-6">Admin – Users</h1>
        <div className="bg-white rounded-lg border border-[#e2e8f0] overflow-hidden">
          <table className="min-w-full divide-y divide-[#e2e8f0]">
            <thead className="bg-[#f8fafc]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#334155] uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#334155] uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#334155] uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#334155] uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#334155] uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-[#334155] uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 text-sm text-[#0f172a]">{u.id}</td>
                  <td className="px-4 py-3 text-sm text-[#334155]">{u.email}</td>
                  <td className="px-4 py-3 text-sm text-[#334155]">{u.name ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-[#334155]">{u.role}</td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={
                        u.is_active
                          ? 'text-[#10b981] font-medium'
                          : 'text-[#ef4444]'
                      }
                    >
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(u)
                        setEditRole(u.role)
                        setEditActive(u.is_active)
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <p className="px-4 py-6 text-center text-[#334155]">No users found.</p>
          )}
        </div>

        <Modal
          isOpen={!!editing}
          onClose={() => setEditing(null)}
          title="Edit user"
        >
          {editing && (
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                setSaving(true)
                try {
                  await adminApi.updateUser(editing.id, {
                    role: editRole,
                    is_active: editActive,
                  })
                  toast('User updated', 'success')
                  setEditing(null)
                  fetchUsers()
                } catch (err) {
                  toast(err instanceof Error ? err.message : 'Failed to update user', 'error')
                } finally {
                  setSaving(false)
                }
              }}
              className="space-y-4"
            >
              <p className="text-sm text-[#334155]">
                {editing.email} {editing.id === user?.id && '(you)'}
              </p>
              <div>
                <label className="block text-sm font-medium text-[#334155] mb-1">Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]"
                >
                  <option value="owner">owner</option>
                  <option value="executor">executor</option>
                  <option value="admin">admin</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-active"
                  checked={editActive}
                  onChange={(e) => setEditActive(e.target.checked)}
                  disabled={editing.id === user?.id}
                  className="rounded border-[#e2e8f0] text-[#0ea5e9] focus:ring-[#0ea5e9]"
                />
                <label htmlFor="edit-active" className="text-sm text-[#334155]">
                  Active {editing.id === user?.id && '(you cannot deactivate yourself)'}
                </label>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </form>
          )}
        </Modal>
      </div>
    </div>
  )
}
