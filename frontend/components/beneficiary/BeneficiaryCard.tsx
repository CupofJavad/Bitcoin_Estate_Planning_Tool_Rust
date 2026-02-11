'use client'

import { Beneficiary } from '@/lib/api'
import { formatDate, copyToClipboard } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Copy, Edit, Trash2, Mail } from 'lucide-react'
import { toast } from '@/components/ui/toast'

interface BeneficiaryCardProps {
  beneficiary: Beneficiary
  onEdit: (beneficiary: Beneficiary) => void
  onDelete: (id: number) => void
}

export function BeneficiaryCard({ beneficiary, onEdit, onDelete }: BeneficiaryCardProps) {
  const copyAddress = async (address: string, label: string) => {
    await copyToClipboard(address)
    toast(`${label} address copied to clipboard`, 'success')
  }
  const hasAnyAddress = beneficiary.bitcoin_address || beneficiary.monero_address || beneficiary.stacks_address

  return (
    <div className="bg-white border border-[#e2e8f0] rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-base font-semibold text-[#0f172a] mb-1">
            {beneficiary.name}
          </h3>
          {beneficiary.email && (
            <div className="flex items-center gap-1 text-sm text-[#334155] mb-2">
              <Mail className="h-4 w-4" />
              <span>{beneficiary.email}</span>
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-[#0ea5e9]">
            {beneficiary.allocation_percentage.toFixed(2)}%
          </div>
          <div className="w-16 bg-[#e2e8f0] rounded-full h-2 mt-1">
            <div
              className="bg-[#0ea5e9] h-2 rounded-full"
              style={{ width: `${beneficiary.allocation_percentage}%` }}
            />
          </div>
        </div>
      </div>

      {hasAnyAddress && (
        <div className="mb-3 p-2 bg-[#f8fafc] rounded border border-[#e2e8f0] space-y-1.5">
          {beneficiary.bitcoin_address && (
            <div className="flex items-center justify-between gap-1">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#334155] mb-0.5">Bitcoin (BTC)</p>
                <p className="text-xs font-mono text-[#0f172a] truncate">{beneficiary.bitcoin_address}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => copyAddress(beneficiary.bitcoin_address!, 'Bitcoin')} className="h-7 w-7 flex-shrink-0">
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )}
          {beneficiary.monero_address && (
            <div className="flex items-center justify-between gap-1">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#334155] mb-0.5">Monero (XMR)</p>
                <p className="text-xs font-mono text-[#0f172a] truncate">{beneficiary.monero_address}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => copyAddress(beneficiary.monero_address!, 'Monero')} className="h-7 w-7 flex-shrink-0">
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )}
          {beneficiary.stacks_address && (
            <div className="flex items-center justify-between gap-1">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#334155] mb-0.5">Stacks (STX)</p>
                <p className="text-xs font-mono text-[#0f172a] truncate">{beneficiary.stacks_address}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => copyAddress(beneficiary.stacks_address!, 'Stacks')} className="h-7 w-7 flex-shrink-0">
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(beneficiary)}
          className="flex-1"
        >
          <Edit className="h-3 w-3 mr-1" />
          Edit
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDelete(beneficiary.id)}
          className="flex-1"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Delete
        </Button>
      </div>
    </div>
  )
}

