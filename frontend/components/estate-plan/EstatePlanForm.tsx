'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { EstatePlan } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { AddressInput } from '@/components/crypto/AddressInput'

export interface EstatePlanFormData {
  name: string
  description: string
  bitcoin_address: string
  monero_address: string
  stacks_address: string
  heartbeat_interval_days: number
  grace_period_days: number
  is_active: boolean
}

interface EstatePlanFormProps {
  estatePlan?: EstatePlan
  onSubmit: (data: EstatePlanFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export function EstatePlanForm({
  estatePlan,
  onSubmit,
  onCancel,
  isLoading,
}: EstatePlanFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EstatePlanFormData>({
    defaultValues: {
      name: estatePlan?.name || '',
      description: estatePlan?.description || '',
      bitcoin_address: estatePlan?.bitcoin_address || '',
      monero_address: estatePlan?.monero_address || '',
      stacks_address: estatePlan?.stacks_address || '',
      heartbeat_interval_days: estatePlan?.heartbeat_interval_days ?? 90,
      grace_period_days: estatePlan?.grace_period_days ?? 14,
      is_active: estatePlan?.is_active ?? true,
    },
  })

  useEffect(() => {
    if (estatePlan) {
      reset({
        name: estatePlan.name,
        description: estatePlan.description || '',
        bitcoin_address: estatePlan.bitcoin_address || '',
        monero_address: estatePlan.monero_address || '',
        stacks_address: estatePlan.stacks_address || '',
        heartbeat_interval_days: estatePlan.heartbeat_interval_days ?? 90,
        grace_period_days: estatePlan.grace_period_days ?? 14,
        is_active: estatePlan.is_active,
      })
    }
  }, [estatePlan, reset])

  const onSubmitForm = async (data: EstatePlanFormData) => {
    await onSubmit({
      ...data,
      heartbeat_interval_days: Number(data.heartbeat_interval_days) || 90,
      grace_period_days: Number(data.grace_period_days) || 14,
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
      <div>
        <label htmlFor="plan-name" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#4b505a]">
          Vault Name <span className="text-[#b91c1c]">*</span>
        </label>
        <input
          id="plan-name"
          data-testid="plan-name-input"
          type="text"
          placeholder="e.g., Family Cold Storage Trust"
          {...register('name', { required: 'Vault name is required' })}
          className="lv-input"
        />
        {errors.name && <p className="mt-1 text-xs text-[#b91c1c]">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="plan-description" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#4b505a]">
          Custody Notes / Purpose
        </label>
        <textarea
          id="plan-description"
          {...register('description')}
          rows={2}
          placeholder="High-level summary of hardware custody setup and scope"
          className="lv-input"
        />
      </div>

      <div className="rounded-xl border border-[#e3ddd1] bg-[#faf8f4] p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#7c7465]">
          Multi-Chain Vault Addresses (Live Cryptographic Verification)
        </p>
        <Controller
          control={control}
          name="bitcoin_address"
          render={({ field }) => (
            <AddressInput
              id="bitcoin_address"
              chain="btc"
              label="Bitcoin (BTC)"
              placeholder="bc1q... / bc1p... / 1... / 3..."
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
              id="monero_address"
              chain="xmr"
              label="Monero (XMR)"
              placeholder="4... or 8... (95-char CryptoNote)"
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
              id="stacks_address"
              chain="stx"
              label="Stacks (STX)"
              placeholder="SP... or SM... (c32check)"
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="heartbeat_interval_days"
            className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#4b505a]"
          >
            Proof-of-Life Interval (Days)
          </label>
          <input
            id="heartbeat_interval_days"
            type="number"
            min={7}
            max={3650}
            {...register('heartbeat_interval_days', { valueAsNumber: true })}
            className="lv-input"
          />
          <p className="mt-1 text-[11px] text-[#575d68]">How often you check in (default: 90 days).</p>
        </div>
        <div>
          <label
            htmlFor="grace_period_days"
            className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#4b505a]"
          >
            Grace Period (Days)
          </label>
          <input
            id="grace_period_days"
            type="number"
            min={1}
            max={365}
            {...register('grace_period_days', { valueAsNumber: true })}
            className="lv-input"
          />
          <p className="mt-1 text-[11px] text-[#575d68]">Buffer after missed check-in before trigger.</p>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <input
          id="is_active"
          type="checkbox"
          {...register('is_active')}
          className="h-4 w-4 rounded border-[#cfc7b6] text-[#a87b24] focus:ring-[#a87b24]"
        />
        <label htmlFor="is_active" className="text-sm font-medium text-[#16181d]">
          Vault Active (monitored by heartbeat schedule)
        </label>
      </div>

      <div className="flex gap-3 pt-3">
        <Button type="submit" variant="primary" disabled={isLoading} className="flex-1" data-testid="plan-submit-btn">
          {isLoading ? 'Saving…' : estatePlan ? 'Save Vault Changes' : 'Create Estate Plan'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} className="flex-1">
          Cancel
        </Button>
      </div>
    </form>
  )
}
