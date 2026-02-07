'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { EstatePlan } from '@/lib/api'
import { Button } from '@/components/ui/button'

interface EstatePlanFormData {
  name: string
  description: string
  bitcoin_address: string
  monero_address: string
  stacks_address: string
  is_active: boolean
}

interface EstatePlanFormProps {
  estatePlan?: EstatePlan
  onSubmit: (data: EstatePlanFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export function EstatePlanForm({ estatePlan, onSubmit, onCancel, isLoading }: EstatePlanFormProps) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<EstatePlanFormData>({
    defaultValues: {
      name: estatePlan?.name || '',
      description: estatePlan?.description || '',
      bitcoin_address: estatePlan?.bitcoin_address || '',
      monero_address: estatePlan?.monero_address || '',
      stacks_address: estatePlan?.stacks_address || '',
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
        is_active: estatePlan.is_active,
      })
    }
  }, [estatePlan, reset])

  const onSubmitForm = async (data: EstatePlanFormData) => {
    await onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          {...register('name', { required: 'Name is required' })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="description"
          {...register('description')}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-3">
        <div>
          <label htmlFor="bitcoin_address" className="block text-sm font-medium text-gray-700 mb-1">
            Bitcoin (BTC) Address
          </label>
          <input
            id="bitcoin_address"
            type="text"
            {...register('bitcoin_address')}
            placeholder="bc1q... or 1..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
        </div>
        <div>
          <label htmlFor="monero_address" className="block text-sm font-medium text-gray-700 mb-1">
            Monero (XMR) Address
          </label>
          <input
            id="monero_address"
            type="text"
            {...register('monero_address')}
            placeholder="4... or 8..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
        </div>
        <div>
          <label htmlFor="stacks_address" className="block text-sm font-medium text-gray-700 mb-1">
            Stacks (STX) Address
          </label>
          <input
            id="stacks_address"
            type="text"
            {...register('stacks_address')}
            placeholder="SP... or ST..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
        </div>
        <p className="text-xs text-gray-500">
          Optional: enter payout addresses for each network (BTC, XMR, STX).
        </p>
      </div>

      <div className="flex items-center">
        <input
          id="is_active"
          type="checkbox"
          {...register('is_active')}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
          Active
        </label>
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading ? 'Saving...' : estatePlan ? 'Update' : 'Create'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}

