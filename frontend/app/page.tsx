'use client'

import { useState, useEffect } from 'react'
import { EstatePlan, estatePlansApi } from '@/lib/api'
import { EstatePlanList } from '@/components/estate-plan/EstatePlanList'
import { EstatePlanForm } from '@/components/estate-plan/EstatePlanForm'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'

export default function Home() {
  const [estatePlans, setEstatePlans] = useState<EstatePlan[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<EstatePlan | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchEstatePlans = async () => {
    try {
      setLoading(true)
      const data = await estatePlansApi.list()
      setEstatePlans(data)
    } catch (error) {
      toast('Failed to load estate plans', 'error')
      console.error('Error fetching estate plans:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEstatePlans()
  }, [])

  const handleCreate = () => {
    setEditingPlan(undefined)
    setIsModalOpen(true)
  }

  const handleEdit = (estatePlan: EstatePlan) => {
    setEditingPlan(estatePlan)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this estate plan? This action cannot be undone.')) {
      return
    }

    try {
      await estatePlansApi.delete(id)
      toast('Estate plan deleted successfully', 'success')
      fetchEstatePlans()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to delete estate plan', 'error')
      console.error('Error deleting estate plan:', error)
    }
  }

  const handleSubmit = async (data: {
    name: string
    description: string
    bitcoin_address: string
    monero_address: string
    stacks_address: string
    is_active: boolean
  }) => {
    try {
      setIsSubmitting(true)
      
      if (editingPlan) {
        await estatePlansApi.update(editingPlan.id, {
          ...editingPlan,
          ...data,
          user_id: editingPlan.user_id,
        })
        toast('Estate plan updated successfully', 'success')
      } else {
        await estatePlansApi.create({
          ...data,
          user_id: 1, // TODO: Get from auth context
        })
        toast('Estate plan created successfully', 'success')
      }
      
      setIsModalOpen(false)
      setEditingPlan(undefined)
      fetchEstatePlans()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save estate plan'
      toast(message, 'error')
      console.error('Error saving estate plan:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading estate plans...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Multi-Chain Estate Planning</h1>
          <p className="text-gray-600 mt-2">
            Estate plans for Bitcoin (BTC), Monero (XMR), and Stacks (STX)—beneficiaries, timelock policies, and payout addresses
          </p>
        </div>

        {/* Estate Plans List */}
        <EstatePlanList
          estatePlans={estatePlans}
          onCreate={handleCreate}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        {/* Create/Edit Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setEditingPlan(undefined)
          }}
          title={editingPlan ? 'Edit Estate Plan' : 'Create Estate Plan'}
          size="lg"
        >
          <EstatePlanForm
            estatePlan={editingPlan}
            onSubmit={handleSubmit}
            onCancel={() => {
              setIsModalOpen(false)
              setEditingPlan(undefined)
            }}
            isLoading={isSubmitting}
          />
        </Modal>

      </div>
    </div>
  )
}
