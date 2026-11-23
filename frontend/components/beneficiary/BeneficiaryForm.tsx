'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { Beneficiary } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { AddressInput } from '@/components/crypto/AddressInput'

interface BeneficiaryFormData {
  name: string
  email: string
  bitcoin_address: string
  monero_address: string
  stacks_address: string
  allocation_percentage: number
}

interface BeneficiaryFormProps {
  beneficiary?: Beneficiary
  estatePlanId: number
  totalAllocation: number
  onSubmit: (data: BeneficiaryFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export function BeneficiaryForm({
  beneficiary,
  totalAllocation,
  onSubmit,
  onCancel,
  isLoading,
}: BeneficiaryFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<BeneficiaryFormData>({
    defaultValues: {
      name: beneficiary?.name || '',
      email: beneficiary?.email || '',
      bitcoin_address: beneficiary?.bitcoin_address || '',
      monero_address: beneficiary?.monero_address || '',
      stacks_address: beneficiary?.stacks_address || '',
      allocation_percentage: beneficiary?.allocation_percentage || 0,
    },
  })

  const allocationPercentage = Number(watch('allocation_percentage') || 0)
  const remainingAllocation = Math.max(
    0,
    100 - totalAllocation + (beneficiary?.allocation_percentage || 0)
  )

  useEffect(() => {
    if (beneficiary) {
      reset({
        name: beneficiary.name,
        email: beneficiary.email || '',
        bitcoin_address: beneficiary.bitcoin_address || '',
        monero_address: beneficiary.monero_address || '',
        stacks_address: beneficiary.stacks_address || '',
        allocation_percentage: beneficiary.allocation_percentage,
      })
    }
  }, [beneficiary, reset])

  const onSubmitForm = async (data: BeneficiaryFormData) => {
    const pct = Number(data.allocation_percentage)
    const newTotal = totalAllocation - (beneficiary?.allocation_percentage || 0) + pct
    if (newTotal > 100.001) {
      toast(
        `Total allocation cannot exceed 100%. Maximum available: ${remainingAllocation.toFixed(2)}%`,
        'error'
      )
      return
    }
    await onSubmit({ ...data, allocation_percentage: pct })
  }

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ben-name" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#4b505a]">
            Heir / Beneficiary Name <span className="text-[#b91c1c]">*</span>
          </label>
          <input
            id="ben-name"
            type="text"
            {...register('name', { required: 'Name is required' })}
            placeholder="Full legal name"
            className="lv-input"
          />
          {errors.name && <p className="mt-1 text-xs text-[#b91c1c]">{errors.name.message}</p>}
        </div>

        <div>
          <label htmlFor="ben-email" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#4b505a]">
            Contact Email
          </label>
          <input
            id="ben-email"
            type="email"
            {...register('email', {
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address',
              },
            })}
            placeholder="heir@example.com"
            className="lv-input"
          />
          {errors.email && <p className="mt-1 text-xs text-[#b91c1c]">{errors.email.message}</p>}
        </div>
      </div>

      <div className="rounded-xl border border-[#e3ddd1] bg-[#faf8f4] p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#7c7465]">
          Heir Payout Addresses (Verified On-the-Fly)
        </p>
        <Controller
          control={control}
          name="bitcoin_address"
          render={({ field }) => (
            <AddressInput
              id="ben_bitcoin_address"
              chain="btc"
              label="Bitcoin (BTC) Payout Address"
              placeholder="bc1q... or bc1p..."
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="monero_address"
          render={({ field }) => (
            <AddressInput
              id="ben_monero_address"
              chain="xmr"
              label="Monero (XMR) Payout Address"
              placeholder="4... or 8..."
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="stacks_address"
          render={({ field }) => (
            <AddressInput
              id="ben_stacks_address"
              chain="stx"
              label="Stacks (STX) Payout Address"
              placeholder="SP... or SM..."
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="allocation_percentage" className="text-xs font-semibold uppercase tracking-wider text-[#4b505a]">
            Estate Allocation (%) <span className="text-[#b91c1c]">*</span>
          </label>
          <span className="text-xs font-medium text-[#a87b24]">
            Available: {remainingAllocation.toFixed(2)}%
          </span>
        </div>
        <div className="flex items-center gap-3">
          <input
            id="allocation_percentage"
            type="number"
            step="0.01"
            min="0"
            max={remainingAllocation}
            {...register('allocation_percentage', {
              required: 'Allocation percentage is required',
              valueAsNumber: true,
              min: { value: 0, message: 'Must be at least 0%' },
              max: {
                value: remainingAllocation,
                message: `Maximum ${remainingAllocation.toFixed(2)}% available`,
              },
            })}
            className="lv-input"
          />
          <span className="font-semibold text-[#4b505a]">%</span>
        </div>
        {errors.allocation_percentage && (
          <p className="mt-1 text-xs text-[#b91c1c]">{errors.allocation_percentage.message}</p>
        )}
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#e8e2d5]">
          <div
            className="h-full rounded-full bg-[#a87b24] transition-all duration-200"
            style={{ width: `${Math.min(Math.max(allocationPercentage, 0), 100)}%` }}
          />
        </div>
      </div>

      <div className="flex gap-3 pt-3">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? 'Saving…' : beneficiary ? 'Update Beneficiary' : 'Add Beneficiary'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} className="flex-1">
          Cancel
        </Button>
      </div>
    </form>
  )
}
