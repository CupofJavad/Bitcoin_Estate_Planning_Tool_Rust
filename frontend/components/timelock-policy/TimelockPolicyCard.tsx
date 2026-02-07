'use client'

import { TimelockPolicy } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Edit, Trash2, Clock } from 'lucide-react'

interface TimelockPolicyCardProps {
  timelockPolicy: TimelockPolicy
  onEdit: (timelockPolicy: TimelockPolicy) => void
  onDelete: (id: number) => void
}

export function TimelockPolicyCard({ timelockPolicy, onEdit, onDelete }: TimelockPolicyCardProps) {
  const estimatedDays = (timelockPolicy.timelock_blocks / 144).toFixed(1)

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-base font-semibold text-gray-900 mb-1">
            {timelockPolicy.name}
          </h3>
          {timelockPolicy.description && (
            <p className="text-sm text-gray-600 mb-2">{timelockPolicy.description}</p>
          )}
        </div>
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            timelockPolicy.is_active
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {timelockPolicy.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-gray-400" />
          <span className="text-gray-600">Blocks:</span>
          <span className="font-semibold text-gray-900">{timelockPolicy.timelock_blocks.toLocaleString()}</span>
          <span className="text-gray-500">(~{estimatedDays} days)</span>
        </div>
        {timelockPolicy.trigger_condition && (
          <div className="text-sm">
            <span className="text-gray-600">Trigger:</span>
            <span className="ml-2 font-medium text-gray-900 capitalize">
              {timelockPolicy.trigger_condition.replace('_', ' ')}
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(timelockPolicy)}
          className="flex-1"
        >
          <Edit className="h-3 w-3 mr-1" />
          Edit
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDelete(timelockPolicy.id)}
          className="flex-1"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Delete
        </Button>
      </div>
    </div>
  )
}

