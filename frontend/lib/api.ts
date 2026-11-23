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

export interface HeartbeatStatus {
  status: 'healthy' | 'due_soon' | 'grace_period' | 'triggered'
  heartbeat_interval_days: number
  grace_period_days: number
  last_checkin_at: string
  next_due_at: string
  grace_ends_at: string
  days_remaining: number
  progress_percent: number
}

export interface ReadinessCheckItem {
  key: string
  label: string
  status: 'pass' | 'warn' | 'fail'
  points: number
  max_points: number
  detail: string
}

export interface ReadinessReport {
  score: number
  grade: string
  checks: ReadinessCheckItem[]
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
  heartbeat_interval_days: number
  last_checkin_at: string
  grace_period_days: number
  created_at: string
  updated_at: string
}

export interface EstatePlanWithRelations extends EstatePlan {
  beneficiaries: Beneficiary[]
  timelock_policies: TimelockPolicy[]
  heartbeat: HeartbeatStatus
  readiness: ReadinessReport
  vault_notes_count: number
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

  create: async (
    data: Omit<
      EstatePlan,
      'id' | 'created_at' | 'updated_at' | 'last_checkin_at' | 'heartbeat_interval_days' | 'grace_period_days'
    > & {
      heartbeat_interval_days?: number
      grace_period_days?: number
    }
  ): Promise<EstatePlan> => {
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

// ----- Legacy Vault v2 APIs -----

export interface AddressValidationResult {
  valid: boolean
  chain: string
  network: string | null
  address_type: string | null
  checksum_verified: boolean
  message: string
}

export interface TimelockDescriptorRequest {
  owner_key?: string
  heir_keys: string[]
  heir_threshold: number
  timelock_blocks: number
  lock_mode: 'csv' | 'cltv'
  network: 'mainnet' | 'testnet'
}

export interface TimelockDescriptorResponse {
  policy: string
  wsh_descriptor: string
  taproot_descriptor: string
  script_asm: string
  lock_mode: string
  timelock_blocks: number
  estimated_days: number
  estimated_unlock_at: string
  estimated_witness_vbytes: number
  network: string
  recovery_steps: string[]
}

export interface PlanCheckin {
  id: number
  estate_plan_id: number
  user_id: number
  note: string | null
  created_at: string
}

export interface EncryptedVaultNote {
  id: number
  estate_plan_id: number
  title: string
  ciphertext_b64: string
  iv_b64: string
  salt_b64: string
  kdf_iterations: number
  algorithm: string
  hint: string | null
  created_at: string
  updated_at: string
}

export interface PlanDashboardItem {
  id: number
  name: string
  is_active: boolean
  beneficiary_count: number
  total_allocation: number
  timelock_count: number
  vault_notes_count: number
  readiness_score: number
  readiness_grade: string
  heartbeat: HeartbeatStatus
  chains: string[]
}

export interface DashboardSummary {
  total_plans: number
  active_plans: number
  total_beneficiaries: number
  total_timelocks: number
  total_vault_notes: number
  average_readiness_score: number
  healthy_heartbeats: number
  attention_needed_heartbeats: number
  next_checkin_due_at: string | null
  next_checkin_plan_id: number | null
  next_checkin_plan_name: string | null
  chain_coverage: {
    btc_plans: number
    xmr_plans: number
    stx_plans: number
  }
  plans: PlanDashboardItem[]
}

export interface InheritancePacket {
  schema_version: string
  generated_at: string
  integrity_sha256: string
  plan: EstatePlan
  heartbeat: HeartbeatStatus
  readiness: ReadinessReport
  beneficiaries: Beneficiary[]
  timelock_policies: Array<{
    policy: TimelockPolicy
    descriptor: TimelockDescriptorResponse
  }>
  encrypted_vault_notes: EncryptedVaultNote[]
  recent_checkins: PlanCheckin[]
  heir_instructions: string[]
}

export const dashboardApi = {
  summary: async (): Promise<DashboardSummary> => {
    const res = await authFetch(`${BASE_URL}/dashboard/summary`)
    if (!res.ok) await throwApiError(res, 'Failed to fetch dashboard summary')
    return res.json()
  },
}

export const cryptoApi = {
  validateAddress: async (chain: 'btc' | 'xmr' | 'stx', address: string): Promise<AddressValidationResult> => {
    const res = await fetch(`${BASE_URL}/crypto/validate-address`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chain, address }),
    })
    if (!res.ok) await throwApiError(res, 'Failed to validate address')
    return res.json()
  },

  timelockDescriptor: async (data: TimelockDescriptorRequest): Promise<TimelockDescriptorResponse> => {
    const res = await fetch(`${BASE_URL}/crypto/timelock-descriptor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) await throwApiError(res, 'Failed to generate timelock descriptor')
    return res.json()
  },
}

export const heartbeatApi = {
  checkin: async (
    planId: number,
    note?: string
  ): Promise<{ checkin: PlanCheckin; heartbeat: HeartbeatStatus }> => {
    const res = await authFetch(`${BASE_URL}/estate-plans/${planId}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: note || null }),
    })
    if (!res.ok) await throwApiError(res, 'Failed to record proof-of-life check-in')
    return res.json()
  },

  listCheckins: async (planId: number): Promise<PlanCheckin[]> => {
    const res = await authFetch(`${BASE_URL}/estate-plans/${planId}/checkins`)
    if (!res.ok) await throwApiError(res, 'Failed to fetch check-in history')
    return res.json()
  },

  readiness: async (planId: number): Promise<ReadinessReport> => {
    const res = await authFetch(`${BASE_URL}/estate-plans/${planId}/readiness`)
    if (!res.ok) await throwApiError(res, 'Failed to fetch readiness report')
    return res.json()
  },

  inheritancePacket: async (planId: number): Promise<InheritancePacket> => {
    const res = await authFetch(`${BASE_URL}/estate-plans/${planId}/inheritance-packet`)
    if (!res.ok) await throwApiError(res, 'Failed to generate inheritance packet')
    return res.json()
  },
}

export const vaultNotesApi = {
  list: async (planId: number): Promise<EncryptedVaultNote[]> => {
    const res = await authFetch(`${BASE_URL}/estate-plans/${planId}/vault-notes`)
    if (!res.ok) await throwApiError(res, 'Failed to fetch encrypted vault notes')
    return res.json()
  },

  create: async (
    planId: number,
    data: {
      title: string
      ciphertext_b64: string
      iv_b64: string
      salt_b64: string
      kdf_iterations: number
      algorithm: string
      hint?: string | null
    }
  ): Promise<EncryptedVaultNote> => {
    const res = await authFetch(`${BASE_URL}/estate-plans/${planId}/vault-notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) await throwApiError(res, 'Failed to store encrypted vault note')
    return res.json()
  },

  delete: async (noteId: number): Promise<void> => {
    const res = await authFetch(`${BASE_URL}/vault-notes/${noteId}`, { method: 'DELETE' })
    if (!res.ok) await throwApiError(res, 'Failed to delete encrypted vault note')
  },
}

export const API_DOCS_URL = `${API_URL}/docs`


