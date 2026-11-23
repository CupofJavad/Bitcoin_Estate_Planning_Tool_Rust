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

export function TimelockPolicyCard({
  timelockPolicy,
  onEdit,
  onDelete,
}: TimelockPolicyCardProps) {
  const estimatedDays = (timelockPolicy.timelock_blocks / 144).toFixed(1)

  return (
    <div className="rounded-xl border border-[#e3ddd1] bg-[#fdfcfa] p-4 transition-colors hover:border-[#cfc7b6]">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex-1">
          <h3 className="text-base font-semibold text-[#13161b]">{timelockPolicy.name}</h3>
          {timelockPolicy.description && (
            <p className="mt-0.5 text-xs text-[#575d68]">{timelockPolicy.description}</p>
          )}
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
            timelockPolicy.is_active
              ? 'bg-[#f2faf6] text-[#136f4a]'
              : 'bg-[#ece7dc] text-[#575d68]'
          }`}
        >
          {timelockPolicy.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-[#374151]">
        <div className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-[#a87b24]" />
          <span className="font-mono-code font-semibold text-[#13161b]">
            {timelockPolicy.timelock_blocks.toLocaleString()} blocks
          </span>
          <span className="text-[#575d68]">(~{estimatedDays} days)</span>
        </div>
        {timelockPolicy.trigger_condition && (
          <span className="rounded bg-[#ece7dc] px-2 py-0.5 text-[11px] font-medium capitalize text-[#13161b]">
            Trigger: {timelockPolicy.trigger_condition}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-[#ece6da] pt-2.5">
        <span className="text-[11px] text-[#7c7465]">Created {formatDate(timelockPolicy.created_at)}</span>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => onEdit(timelockPolicy)}>
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(timelockPolicy.id)}
            className="text-[#b91c1c] hover:bg-[#fef2f2]"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
