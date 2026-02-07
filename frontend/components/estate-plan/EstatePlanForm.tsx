'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { EstatePlan } from '@/lib/api'
import { Button } from '@/components/ui/button'

interface EstatePlanFormData {
  name: string
  description: string
  bitcoin_address: string
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
      is_active: estatePlan?.is_active ?? true,
    },
  })

  useEffect(() => {
    if (estatePlan) {
      reset({
        name: estatePlan.name,
        description: estatePlan.description || '',
        bitcoin_address: estatePlan.bitcoin_address || '',
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

      <div>
        <label htmlFor="bitcoin_address" className="block text-sm font-medium text-gray-700 mb-1">
          Bitcoin Address
        </label>
        <input
          id="bitcoin_address"
          type="text"
          {...register('bitcoin_address')}
          placeholder="bc1q..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
        />
        <p className="mt-1 text-xs text-gray-500">
          Enter a Bitcoin address for this estate plan
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

