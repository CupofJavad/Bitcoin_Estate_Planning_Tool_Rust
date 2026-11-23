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

  const addresses = [
    { label: 'BTC', value: beneficiary.bitcoin_address },
    { label: 'XMR', value: beneficiary.monero_address },
    { label: 'STX', value: beneficiary.stacks_address },
  ].filter((a) => a.value && a.value.trim().length > 0)

  return (
    <div className="rounded-xl border border-[#e3ddd1] bg-[#fdfcfa] p-4 transition-colors hover:border-[#cfc7b6]">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-[#13161b]">{beneficiary.name}</h3>
          {beneficiary.email && (
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[#575d68]">
              <Mail className="h-3.5 w-3.5 shrink-0 text-[#7c7465]" />
              <span className="truncate">{beneficiary.email}</span>
            </div>
          )}
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono-code text-lg font-bold text-[#a87b24]">
            {beneficiary.allocation_percentage.toFixed(1)}%
          </div>
          <div className="mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-[#e8e2d5]">
            <div
              className="h-full rounded-full bg-[#a87b24]"
              style={{ width: `${Math.min(beneficiary.allocation_percentage, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {addresses.length > 0 && (
        <div className="mb-3 space-y-1.5">
          {addresses.map(({ label, value }) => (
            <div
              key={label}
              className="flex items-center justify-between gap-2 rounded-md border border-[#ece6da] bg-[#faf8f4] px-2.5 py-1.5"
            >
              <div className="min-w-0 flex items-center gap-1.5">
                <span className="font-mono-code text-[10px] font-bold text-[#a87b24]">{label}</span>
                <span className="font-mono-code truncate text-[11px] text-[#374151]">{value}</span>
              </div>
              <button
                type="button"
                onClick={() => copyAddress(value!, label)}
                className="shrink-0 text-[#7c7465] hover:text-[#13161b]"
                title={`Copy ${label} address`}
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-[#ece6da] pt-2.5">
        <span className="text-[11px] text-[#7c7465]">Added {formatDate(beneficiary.created_at)}</span>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => onEdit(beneficiary)}>
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(beneficiary.id)}
            className="text-[#b91c1c] hover:bg-[#fef2f2]"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
