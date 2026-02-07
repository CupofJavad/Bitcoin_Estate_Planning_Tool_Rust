'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { TimelockPolicy } from '@/lib/api'
import { Button } from '@/components/ui/button'

interface TimelockPolicyFormData {
  name: string
  description: string
  timelock_blocks: number
  trigger_condition: string
  is_active: boolean
}

interface TimelockPolicyFormProps {
  timelockPolicy?: TimelockPolicy
  estatePlanId: number
  onSubmit: (data: TimelockPolicyFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

const TRIGGER_CONDITIONS = [
  { value: 'death', label: 'Death Confirmation' },
  { value: 'inactivity', label: 'Inactivity Period' },
  { value: 'manual', label: 'Manual Trigger' },
  { value: 'date', label: 'Specific Date' },
]

export function TimelockPolicyForm({ 
  timelockPolicy, 
  estatePlanId, 
  onSubmit, 
  onCancel, 
  isLoading 
}: TimelockPolicyFormProps) {
  const { register, handleSubmit, formState: { errors }, watch, reset } = useForm<TimelockPolicyFormData>({
    defaultValues: {
      name: timelockPolicy?.name || '',
      description: timelockPolicy?.description || '',
      timelock_blocks: timelockPolicy?.timelock_blocks || 144,
      trigger_condition: timelockPolicy?.trigger_condition || 'death',
      is_active: timelockPolicy?.is_active ?? true,
    },
  })

  const timelockBlocks = watch('timelock_blocks')
  // Approximate: 1 block ≈ 10 minutes, 144 blocks ≈ 1 day
  const estimatedDays = timelockBlocks ? (timelockBlocks / 144).toFixed(1) : '0'

  useEffect(() => {
    if (timelockPolicy) {
      reset({
        name: timelockPolicy.name,
        description: timelockPolicy.description || '',
        timelock_blocks: timelockPolicy.timelock_blocks,
        trigger_condition: timelockPolicy.trigger_condition || 'death',
        is_active: timelockPolicy.is_active,
      })
    }
  }, [timelockPolicy, reset])

  const onSubmitForm = async (data: TimelockPolicyFormData) => {
    await onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Policy Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          {...register('name', { required: 'Policy name is required' })}
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
        <label htmlFor="trigger_condition" className="block text-sm font-medium text-gray-700 mb-1">
          Trigger Condition
        </label>
        <select
          id="trigger_condition"
          {...register('trigger_condition')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {TRIGGER_CONDITIONS.map((condition) => (
            <option key={condition.value} value={condition.value}>
              {condition.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="timelock_blocks" className="block text-sm font-medium text-gray-700 mb-1">
          Timelock Blocks <span className="text-red-500">*</span>
        </label>
        <input
          id="timelock_blocks"
          type="number"
          min="1"
          {...register('timelock_blocks', {
            required: 'Timelock blocks is required',
            min: { value: 1, message: 'Must be at least 1 block' },
          })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.timelock_blocks && (
          <p className="mt-1 text-sm text-red-600">{errors.timelock_blocks.message}</p>
        )}
        <div className="mt-2 p-3 bg-blue-50 rounded border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Estimated Duration:</strong> ~{estimatedDays} days
            <br />
            <span className="text-xs">(Based on ~10 minutes per block, 144 blocks per day)</span>
          </p>
        </div>
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
          {isLoading ? 'Saving...' : timelockPolicy ? 'Update' : 'Create'}
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

