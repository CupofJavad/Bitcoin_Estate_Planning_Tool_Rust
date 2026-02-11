'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { authApi } from '@/lib/authApi'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'

export default function AccountPage() {
  const { user, refresh } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (user) {
      setName(user.name ?? '')
      setEmail(user.email ?? '')
    }
  }, [user])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    try {
      setProfileSaving(true)
      await authApi.updateMe({ name: name || undefined, email: email || undefined })
      await refresh()
      toast('Profile updated', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update profile', 'error')
    } finally {
      setProfileSaving(false)
    }
  }

  const handleExportData = async () => {
    try {
      setExporting(true)
      const data = await authApi.exportData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `legacy-vault-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast('Export downloaded', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Export failed', 'error')
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (deleteConfirm !== 'DELETE') {
      toast('Type DELETE to confirm', 'error')
      return
    }
    try {
      setDeleting(true)
      await authApi.deleteAccount(deletePassword)
      await authApi.logout()
      toast('Account deleted', 'success')
      window.location.href = '/login'
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete account', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 8) {
      toast('New password must be at least 8 characters', 'error')
      return
    }
    if (newPassword !== confirmPassword) {
      toast('New passwords do not match', 'error')
      return
    }
    try {
      setPasswordSaving(true)
      await authApi.changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast('Password changed', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to change password', 'error')
    } finally {
      setPasswordSaving(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <p className="text-[#334155]">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/" className="text-[#0ea5e9] hover:underline text-sm">
            ← Back to estate plans
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-[#0f172a] mb-2">Account</h1>
        <p className="text-[#334155] mb-8">Manage your profile and password.</p>

        {/* Profile */}
        <section className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-[#0f172a] mb-4">Profile</h2>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label htmlFor="account-name" className="block text-sm font-medium text-[#334155] mb-1">
                Name
              </label>
              <input
                id="account-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent"
                placeholder="Your name"
              />
            </div>
            <div>
              <label htmlFor="account-email" className="block text-sm font-medium text-[#334155] mb-1">
                Email
              </label>
              <input
                id="account-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent"
                placeholder="you@example.com"
                required
              />
            </div>
            <Button type="submit" disabled={profileSaving}>
              {profileSaving ? 'Saving…' : 'Save profile'}
            </Button>
          </form>
        </section>

        {/* Export data */}
        <section className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-[#0f172a] mb-2">Export my data</h2>
          <p className="text-sm text-[#334155] mb-4">
            Download your estate plans, beneficiaries, and timelock policies as JSON. See our{' '}
            <Link href="/privacy" className="text-[#0ea5e9] hover:underline">Privacy Policy</Link> for your rights.
          </p>
          <Button variant="outline" onClick={handleExportData} disabled={exporting}>
            {exporting ? 'Preparing…' : 'Export my data'}
          </Button>
        </section>

        {/* Change password */}
        <section className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-[#0f172a] mb-4">Change password</h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label htmlFor="current-password" className="block text-sm font-medium text-[#334155] mb-1">
                Current password
              </label>
              <input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent"
                required
              />
            </div>
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-[#334155] mb-1">
                New password (min 8 characters)
              </label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent"
                minLength={8}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-[#334155] mb-1">
                Confirm new password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent"
                minLength={8}
              />
            </div>
            <Button type="submit" disabled={passwordSaving}>
              {passwordSaving ? 'Changing…' : 'Change password'}
            </Button>
          </form>
        </section>

        {/* Delete account */}
        <section className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-6 mt-8 border-[#ef4444]/30">
          <h2 className="text-lg font-semibold text-[#0f172a] mb-2">Delete account</h2>
          <p className="text-sm text-[#334155] mb-4">
            This permanently deletes your account and all your estate plans, beneficiaries, and timelock policies. This cannot be undone.
          </p>
          <form onSubmit={handleDeleteAccount} className="space-y-4">
            <div>
              <label htmlFor="delete-password" className="block text-sm font-medium text-[#334155] mb-1">
                Your password
              </label>
              <input
                id="delete-password"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent"
                required
              />
            </div>
            <div>
              <label htmlFor="delete-confirm" className="block text-sm font-medium text-[#334155] mb-1">
                Type DELETE to confirm
              </label>
              <input
                id="delete-confirm"
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#ef4444]"
                placeholder="DELETE"
              />
            </div>
            <Button type="submit" variant="destructive" disabled={deleting || deleteConfirm !== 'DELETE'}>
              {deleting ? 'Deleting…' : 'Delete my account'}
            </Button>
          </form>
        </section>
      </div>
    </div>
  )
}
