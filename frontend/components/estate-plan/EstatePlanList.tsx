'use client'

import { useState } from 'react'
import { EstatePlan } from '@/lib/api'
import { EstatePlanCard } from './EstatePlanCard'
import { Button } from '@/components/ui/button'
import { Plus, Search } from 'lucide-react'

interface EstatePlanListProps {
  estatePlans: EstatePlan[]
  onCreate: () => void
  onEdit: (estatePlan: EstatePlan) => void
  onDelete: (id: number) => void
}

export function EstatePlanList({ estatePlans, onCreate, onEdit, onDelete }: EstatePlanListProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredPlans = estatePlans.filter(plan =>
    plan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    plan.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Estate Plans</h2>
          <p className="text-sm text-gray-600 mt-1">
            BTC, XMR & STX plans with beneficiaries and timelock policies
          </p>
        </div>
        <Button onClick={onCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Estate Plan
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search estate plans..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* List */}
      {filteredPlans.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-500 mb-2">
            {searchQuery ? 'No estate plans match your search' : 'No estate plans found'}
          </p>
          {!searchQuery && (
            <Button variant="outline" onClick={onCreate} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Create your first estate plan
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlans.map((plan) => (
            <EstatePlanCard
              key={plan.id}
              estatePlan={plan}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

