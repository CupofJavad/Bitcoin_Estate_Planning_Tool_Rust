/**
 * API Client for Legacy Vault (multi-chain estate planning)
 * Centralized API communication with error handling.
 * All requests use credentials: 'include' for session cookies.
 * On 401, redirects to /login (client-side only).
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const BASE_URL = `${API_URL}/api/v1`

const DEFAULT_FETCH_OPTIONS: RequestInit = {
  credentials: 'include',
}

/** Throw with server message (Rust API returns plain text or JSON detail). */
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

/** Fetch with credentials; on 401 redirect to /login when in browser. */
async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, { ...DEFAULT_FETCH_OPTIONS, ...options })
  if (res.status === 401 && typeof window !== 'undefined') {
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  return res
}

export interface EstatePlan {
  id: number
  user_id: number
  name: string
  description: string | null
  bitcoin_address: string | null
  monero_address: string | null
  stacks_address: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface EstatePlanWithRelations extends EstatePlan {
  beneficiaries: Beneficiary[]
  timelock_policies: TimelockPolicy[]
}

export interface Beneficiary {
  id: number
  estate_plan_id: number
  name: string
  email: string | null
  bitcoin_address: string | null
  monero_address: string | null
  stacks_address: string | null
  allocation_percentage: number
  created_at: string
  updated_at: string
}

export interface TimelockPolicy {
  id: number
  estate_plan_id: number
  name: string
  description: string | null
  timelock_blocks: number
  trigger_condition: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// Estate Plans API
export const estatePlansApi = {
  list: async (user_id?: number): Promise<EstatePlan[]> => {
    try {
      const url = user_id 
        ? `${BASE_URL}/estate-plans?user_id=${user_id}`
        : `${BASE_URL}/estate-plans`
      const res = await authFetch(url)
      if (!res.ok) await throwApiError(res, 'Failed to fetch estate plans')
      return res.json()
    } catch (error) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Unable to connect to the server. Please ensure the backend API is running at ' + API_URL)
      }
      throw error
    }
  },

  get: async (id: number): Promise<EstatePlanWithRelations> => {
    try {
      const res = await authFetch(`${BASE_URL}/estate-plans/${id}`)
      if (!res.ok) await throwApiError(res, 'Failed to fetch estate plan')
      return res.json()
    } catch (error) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Unable to connect to the server. Please ensure the backend API is running at ' + API_URL)
      }
      throw error
    }
  },

  create: async (data: Omit<EstatePlan, 'id' | 'created_at' | 'updated_at'>): Promise<EstatePlan> => {
    const res = await authFetch(`${BASE_URL}/estate-plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) await throwApiError(res, 'Failed to create estate plan')
    return res.json()
  },

  update: async (id: number, data: Partial<EstatePlan>): Promise<EstatePlan> => {
    const res = await authFetch(`${BASE_URL}/estate-plans/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) await throwApiError(res, 'Failed to update estate plan')
    return res.json()
  },

  delete: async (id: number): Promise<void> => {
    const res = await authFetch(`${BASE_URL}/estate-plans/${id}`, { method: 'DELETE' })
    if (!res.ok) await throwApiError(res, 'Failed to delete estate plan')
  },
}

// Beneficiaries API
export const beneficiariesApi = {
  list: async (estate_plan_id?: number): Promise<Beneficiary[]> => {
    const url = estate_plan_id
      ? `${BASE_URL}/beneficiaries?estate_plan_id=${estate_plan_id}`
      : `${BASE_URL}/beneficiaries`
    const res = await authFetch(url)
    if (!res.ok) await throwApiError(res, 'Failed to fetch beneficiaries')
    return res.json()
  },

  get: async (id: number): Promise<Beneficiary> => {
    const res = await authFetch(`${BASE_URL}/beneficiaries/${id}`)
    if (!res.ok) await throwApiError(res, 'Failed to fetch beneficiary')
    return res.json()
  },

  create: async (data: Omit<Beneficiary, 'id' | 'created_at' | 'updated_at'>): Promise<Beneficiary> => {
    const res = await authFetch(`${BASE_URL}/beneficiaries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) await throwApiError(res, 'Failed to create beneficiary')
    return res.json()
  },

  update: async (id: number, data: Partial<Beneficiary>): Promise<Beneficiary> => {
    const res = await authFetch(`${BASE_URL}/beneficiaries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) await throwApiError(res, 'Failed to update beneficiary')
    return res.json()
  },

  delete: async (id: number): Promise<void> => {
    const res = await authFetch(`${BASE_URL}/beneficiaries/${id}`, { method: 'DELETE' })
    if (!res.ok) await throwApiError(res, 'Failed to delete beneficiary')
  },
}

// Timelock Policies API
export const timelockPoliciesApi = {
  list: async (estate_plan_id?: number): Promise<TimelockPolicy[]> => {
    const url = estate_plan_id
      ? `${BASE_URL}/timelock-policies?estate_plan_id=${estate_plan_id}`
      : `${BASE_URL}/timelock-policies`
    const res = await authFetch(url)
    if (!res.ok) await throwApiError(res, 'Failed to fetch timelock policies')
    return res.json()
  },

  get: async (id: number): Promise<TimelockPolicy> => {
    const res = await authFetch(`${BASE_URL}/timelock-policies/${id}`)
    if (!res.ok) await throwApiError(res, 'Failed to fetch timelock policy')
    return res.json()
  },

  create: async (data: Omit<TimelockPolicy, 'id' | 'created_at' | 'updated_at'>): Promise<TimelockPolicy> => {
    const res = await authFetch(`${BASE_URL}/timelock-policies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) await throwApiError(res, 'Failed to create timelock policy')
    return res.json()
  },

  update: async (id: number, data: Partial<TimelockPolicy>): Promise<TimelockPolicy> => {
    const res = await authFetch(`${BASE_URL}/timelock-policies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) await throwApiError(res, 'Failed to update timelock policy')
    return res.json()
  },

  delete: async (id: number): Promise<void> => {
    const res = await authFetch(`${BASE_URL}/timelock-policies/${id}`, { method: 'DELETE' })
    if (!res.ok) await throwApiError(res, 'Failed to delete timelock policy')
  },
}

// Admin API (requires role === 'admin')
export interface AdminUserSummary {
  id: number
  email: string
  name: string | null
  role: string
  is_active: boolean
}

export const adminApi = {
  listUsers: async (): Promise<AdminUserSummary[]> => {
    const res = await authFetch(`${BASE_URL}/admin/users`)
    if (!res.ok) await throwApiError(res, 'Failed to fetch users')
    return res.json()
  },

  updateUser: async (
    id: number,
    data: { role?: string; is_active?: boolean }
  ): Promise<AdminUserSummary> => {
    const res = await authFetch(`${BASE_URL}/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) await throwApiError(res, 'Failed to update user')
    return res.json()
  },

  listAuditEvents: async (params?: {
    from?: string
    to?: string
    user_id?: number
    action?: string
    entity_type?: string
    limit?: number
  }): Promise<AuditEventRow[]> => {
    const search = new URLSearchParams()
    if (params?.from) search.set('from', params.from)
    if (params?.to) search.set('to', params.to)
    if (params?.user_id != null) search.set('user_id', String(params.user_id))
    if (params?.action) search.set('action', params.action)
    if (params?.entity_type) search.set('entity_type', params.entity_type)
    if (params?.limit != null) search.set('limit', String(params.limit))
    const qs = search.toString()
    const url = qs ? `${BASE_URL}/admin/audit?${qs}` : `${BASE_URL}/admin/audit`
    const res = await authFetch(url)
    if (!res.ok) await throwApiError(res, 'Failed to fetch audit events')
    return res.json()
  },
}

export interface AuditEventRow {
  id: number
  created_at: string
  user_id: number | null
  action: string
  entity_type: string
  entity_id: number | null
  details: Record<string, unknown> | null
}

