'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Beneficiary } from '@/lib/api'
import { Button } from '@/components/ui/button'

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
  estatePlanId, 
  totalAllocation,
  onSubmit, 
  onCancel, 
  isLoading 
}: BeneficiaryFormProps) {
  const { register, handleSubmit, formState: { errors }, watch, reset } = useForm<BeneficiaryFormData>({
    defaultValues: {
      name: beneficiary?.name || '',
      email: beneficiary?.email || '',
      bitcoin_address: beneficiary?.bitcoin_address || '',
      monero_address: beneficiary?.monero_address || '',
      stacks_address: beneficiary?.stacks_address || '',
      allocation_percentage: beneficiary?.allocation_percentage || 0,
    },
  })

  const allocationPercentage = watch('allocation_percentage')
  const remainingAllocation = 100 - totalAllocation + (beneficiary?.allocation_percentage || 0)
  const maxAllocation = remainingAllocation

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
    // Validate total allocation doesn't exceed 100%
    const newTotal = totalAllocation - (beneficiary?.allocation_percentage || 0) + data.allocation_percentage
    if (newTotal > 100) {
      alert(`Total allocation cannot exceed 100%. Maximum allowed: ${maxAllocation.toFixed(2)}%`)
      return
    }
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
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          {...register('email', {
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address',
            },
          })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
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
      </div>

      <div>
        <label htmlFor="allocation_percentage" className="block text-sm font-medium text-gray-700 mb-1">
          Allocation Percentage <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center gap-3">
          <input
            id="allocation_percentage"
            type="number"
            step="0.01"
            min="0"
            max={maxAllocation}
            {...register('allocation_percentage', {
              required: 'Allocation percentage is required',
              min: { value: 0, message: 'Must be at least 0%' },
              max: { value: maxAllocation, message: `Maximum ${maxAllocation.toFixed(2)}% available` },
            })}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-600">%</span>
        </div>
        {errors.allocation_percentage && (
          <p className="mt-1 text-sm text-red-600">{errors.allocation_percentage.message}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Remaining allocation: {remainingAllocation.toFixed(2)}%
        </p>
        {allocationPercentage && (
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(allocationPercentage, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading ? 'Saving...' : beneficiary ? 'Update' : 'Create'}
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

