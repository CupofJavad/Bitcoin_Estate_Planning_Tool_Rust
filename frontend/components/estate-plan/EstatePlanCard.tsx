'use client'

import { EstatePlan } from '@/lib/api'
import { formatDate, copyToClipboard } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Copy, Edit, Trash2, ArrowRight } from 'lucide-react'
import { toast } from '@/components/ui/toast'
import { useRouter } from 'next/navigation'

interface EstatePlanCardProps {
  estatePlan: EstatePlan
  onEdit: (estatePlan: EstatePlan) => void
  onDelete: (id: number) => void
}

export function EstatePlanCard({ estatePlan, onEdit, onDelete }: EstatePlanCardProps) {
  const router = useRouter()
  
  const handleCopyAddress = async () => {
    if (estatePlan.bitcoin_address) {
      await copyToClipboard(estatePlan.bitcoin_address)
      toast('Bitcoin address copied to clipboard', 'success')
    }
  }

  const handleViewDetails = () => {
    router.push(`/estate-plans/${estatePlan.id}`)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {estatePlan.name}
          </h3>
          {estatePlan.description && (
            <p className="text-sm text-gray-600 mb-3">{estatePlan.description}</p>
          )}
        </div>
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            estatePlan.is_active
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {estatePlan.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>

      {estatePlan.bitcoin_address && (
        <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 mb-1">Bitcoin Address</p>
              <p className="text-sm font-mono text-gray-900 truncate">
                {estatePlan.bitcoin_address}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopyAddress}
              className="ml-2 h-8 w-8 flex-shrink-0"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
        <span>Created: {formatDate(estatePlan.created_at)}</span>
        <span>Updated: {formatDate(estatePlan.updated_at)}</span>
      </div>

      <div className="flex gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={handleViewDetails}
          className="flex-1"
        >
          View Details
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(estatePlan)}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDelete(estatePlan.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

