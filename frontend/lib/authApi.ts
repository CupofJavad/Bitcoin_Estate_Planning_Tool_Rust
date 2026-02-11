/**
 * Auth API: login, register, logout, me.
 * All requests use credentials: 'include' for session cookies.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface MeUser {
  id: number
  email: string
  name: string | null
  role: string
  email_verified_at?: string | null
  created_at?: string
}

async function throwApiError(res: Response, fallback: string): Promise<never> {
  const text = await res.text()
  let message = fallback
  if (text) {
    try {
      const j = JSON.parse(text)
      if (typeof j.detail === 'string') message = j.detail
    } catch {
      message = text
    }
  }
  throw new Error(message)
}

export const authApi = {
  me: async (): Promise<MeUser | null> => {
    const res = await fetch(`${API_URL}/api/v1/me`, { credentials: 'include' })
    if (res.status === 401) return null
    if (!res.ok) await throwApiError(res, 'Failed to fetch user')
    return res.json()
  },

  register: async (email: string, password: string, name: string): Promise<MeUser> => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, name }),
    })
    if (!res.ok) await throwApiError(res, 'Registration failed')
    const data = await res.json()
    return data as MeUser
  },

  login: async (email: string, password: string): Promise<MeUser> => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) await throwApiError(res, 'Login failed')
    const data = (await res.json()) as MeUser
    return data
  },

  logout: async (): Promise<void> => {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })
  },

  updateMe: async (data: { name?: string; email?: string }): Promise<MeUser> => {
    const res = await fetch(`${API_URL}/api/v1/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    })
    if (!res.ok) await throwApiError(res, 'Failed to update profile')
    return res.json()
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    const res = await fetch(`${API_URL}/api/v1/me/password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    })
    if (!res.ok) await throwApiError(res, 'Failed to change password')
  },

  /** Export my data as JSON (estate plans + beneficiaries + timelock policies). */
  exportData: async (): Promise<{ exported_at: string; estate_plans: unknown[] }> => {
    const res = await fetch(`${API_URL}/api/v1/me/export`, { credentials: 'include' })
    if (!res.ok) await throwApiError(res, 'Failed to export data')
    return res.json()
  },

  /** Delete account (requires password). Redirect to login after. */
  deleteAccount: async (password: string): Promise<void> => {
    const res = await fetch(`${API_URL}/api/v1/me/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ password }),
    })
    if (!res.ok) await throwApiError(res, 'Failed to delete account')
  },
}
