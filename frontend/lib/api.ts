/**
 * API Client for Bitcoin Estate Planning Platform
 * Centralized API communication with error handling
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const BASE_URL = `${API_URL}/api/v1`

export interface EstatePlan {
  id: number
  user_id: number
  name: string
  description: string | null
  bitcoin_address: string | null
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
      const res = await fetch(url)
      if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: `Failed to fetch estate plans: ${res.status} ${res.statusText}` }))
        throw new Error(error.detail || 'Failed to fetch estate plans')
      }
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
      const res = await fetch(`${BASE_URL}/estate-plans/${id}`)
      if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: `Failed to fetch estate plan: ${res.status} ${res.statusText}` }))
        throw new Error(error.detail || 'Failed to fetch estate plan')
      }
      return res.json()
    } catch (error) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Unable to connect to the server. Please ensure the backend API is running at ' + API_URL)
      }
      throw error
    }
  },

  create: async (data: Omit<EstatePlan, 'id' | 'created_at' | 'updated_at'>): Promise<EstatePlan> => {
    const res = await fetch(`${BASE_URL}/estate-plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Failed to create estate plan' }))
      throw new Error(error.detail || 'Failed to create estate plan')
    }
    return res.json()
  },

  update: async (id: number, data: Partial<EstatePlan>): Promise<EstatePlan> => {
    const res = await fetch(`${BASE_URL}/estate-plans/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Failed to update estate plan' }))
      throw new Error(error.detail || 'Failed to update estate plan')
    }
    return res.json()
  },

  delete: async (id: number): Promise<void> => {
    const res = await fetch(`${BASE_URL}/estate-plans/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Failed to delete estate plan')
  },
}

// Beneficiaries API
export const beneficiariesApi = {
  list: async (estate_plan_id?: number): Promise<Beneficiary[]> => {
    const url = estate_plan_id
      ? `${BASE_URL}/beneficiaries?estate_plan_id=${estate_plan_id}`
      : `${BASE_URL}/beneficiaries`
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to fetch beneficiaries')
    return res.json()
  },

  get: async (id: number): Promise<Beneficiary> => {
    const res = await fetch(`${BASE_URL}/beneficiaries/${id}`)
    if (!res.ok) throw new Error('Failed to fetch beneficiary')
    return res.json()
  },

  create: async (data: Omit<Beneficiary, 'id' | 'created_at' | 'updated_at'>): Promise<Beneficiary> => {
    const res = await fetch(`${BASE_URL}/beneficiaries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Failed to create beneficiary' }))
      throw new Error(error.detail || 'Failed to create beneficiary')
    }
    return res.json()
  },

  update: async (id: number, data: Partial<Beneficiary>): Promise<Beneficiary> => {
    const res = await fetch(`${BASE_URL}/beneficiaries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Failed to update beneficiary' }))
      throw new Error(error.detail || 'Failed to update beneficiary')
    }
    return res.json()
  },

  delete: async (id: number): Promise<void> => {
    const res = await fetch(`${BASE_URL}/beneficiaries/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Failed to delete beneficiary')
  },
}

// Timelock Policies API
export const timelockPoliciesApi = {
  list: async (estate_plan_id?: number): Promise<TimelockPolicy[]> => {
    const url = estate_plan_id
      ? `${BASE_URL}/timelock-policies?estate_plan_id=${estate_plan_id}`
      : `${BASE_URL}/timelock-policies`
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to fetch timelock policies')
    return res.json()
  },

  get: async (id: number): Promise<TimelockPolicy> => {
    const res = await fetch(`${BASE_URL}/timelock-policies/${id}`)
    if (!res.ok) throw new Error('Failed to fetch timelock policy')
    return res.json()
  },

  create: async (data: Omit<TimelockPolicy, 'id' | 'created_at' | 'updated_at'>): Promise<TimelockPolicy> => {
    const res = await fetch(`${BASE_URL}/timelock-policies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Failed to create timelock policy' }))
      throw new Error(error.detail || 'Failed to create timelock policy')
    }
    return res.json()
  },

  update: async (id: number, data: Partial<TimelockPolicy>): Promise<TimelockPolicy> => {
    const res = await fetch(`${BASE_URL}/timelock-policies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Failed to update timelock policy' }))
      throw new Error(error.detail || 'Failed to update timelock policy')
    }
    return res.json()
  },

  delete: async (id: number): Promise<void> => {
    const res = await fetch(`${BASE_URL}/timelock-policies/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Failed to delete timelock policy')
  },
}

