'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { EstatePlanWithRelations, Beneficiary, TimelockPolicy, estatePlansApi, beneficiariesApi, timelockPoliciesApi } from '@/lib/api'
import { EstatePlanForm } from '@/components/estate-plan/EstatePlanForm'
import { BeneficiaryForm } from '@/components/beneficiary/BeneficiaryForm'
import { BeneficiaryCard } from '@/components/beneficiary/BeneficiaryCard'
import { TimelockPolicyForm } from '@/components/timelock-policy/TimelockPolicyForm'
import { TimelockPolicyCard } from '@/components/timelock-policy/TimelockPolicyCard'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { ArrowLeft, Plus, Edit } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function EstatePlanDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = parseInt(params.id as string)

  const [estatePlan, setEstatePlan] = useState<EstatePlanWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isBeneficiaryModalOpen, setIsBeneficiaryModalOpen] = useState(false)
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false)
  const [editingBeneficiary, setEditingBeneficiary] = useState<Beneficiary | undefined>()
  const [editingPolicy, setEditingPolicy] = useState<TimelockPolicy | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchEstatePlan = async () => {
    try {
      setLoading(true)
      const data = await estatePlansApi.get(id)
      setEstatePlan(data)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load estate plan'
      toast(message, 'error')
      console.error('Error fetching estate plan:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) {
      fetchEstatePlan()
    }
  }, [id])

  const totalAllocation = estatePlan?.beneficiaries.reduce((sum, b) => sum + Number(b.allocation_percentage), 0) || 0

  const handleUpdateEstatePlan = async (data: any) => {
    if (!estatePlan) return
    try {
      setIsSubmitting(true)
      await estatePlansApi.update(estatePlan.id, {
        ...estatePlan,
        ...data,
        user_id: estatePlan.user_id,
      })
      toast('Estate plan updated successfully', 'success')
      setIsEditModalOpen(false)
      fetchEstatePlan()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to update estate plan', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateBeneficiary = async (data: any) => {
    try {
      setIsSubmitting(true)
      await beneficiariesApi.create({
        ...data,
        estate_plan_id: id,
      })
      toast('Beneficiary created successfully', 'success')
      setIsBeneficiaryModalOpen(false)
      fetchEstatePlan()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to create beneficiary', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateBeneficiary = async (data: any) => {
    if (!editingBeneficiary) return
    try {
      setIsSubmitting(true)
      await beneficiariesApi.update(editingBeneficiary.id, {
        ...editingBeneficiary,
        ...data,
      })
      toast('Beneficiary updated successfully', 'success')
      setIsBeneficiaryModalOpen(false)
      setEditingBeneficiary(undefined)
      fetchEstatePlan()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to update beneficiary', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteBeneficiary = async (beneficiaryId: number) => {
    if (!confirm('Are you sure you want to delete this beneficiary?')) return
    try {
      await beneficiariesApi.delete(beneficiaryId)
      toast('Beneficiary deleted successfully', 'success')
      fetchEstatePlan()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to delete beneficiary', 'error')
    }
  }

  const handleCreatePolicy = async (data: any) => {
    try {
      setIsSubmitting(true)
      await timelockPoliciesApi.create({
        ...data,
        estate_plan_id: id,
      })
      toast('Timelock policy created successfully', 'success')
      setIsPolicyModalOpen(false)
      fetchEstatePlan()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to create timelock policy', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdatePolicy = async (data: any) => {
    if (!editingPolicy) return
    try {
      setIsSubmitting(true)
      await timelockPoliciesApi.update(editingPolicy.id, {
        ...editingPolicy,
        ...data,
      })
      toast('Timelock policy updated successfully', 'success')
      setIsPolicyModalOpen(false)
      setEditingPolicy(undefined)
      fetchEstatePlan()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to update timelock policy', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeletePolicy = async (policyId: number) => {
    if (!confirm('Are you sure you want to delete this timelock policy?')) return
    try {
      await timelockPoliciesApi.delete(policyId)
      toast('Timelock policy deleted successfully', 'success')
      fetchEstatePlan()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to delete timelock policy', 'error')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading estate plan...</p>
        </div>
      </div>
    )
  }

  if (!estatePlan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Estate plan not found</p>
          <Button onClick={() => router.push('/')}>Back to Home</Button>
        </div>
      </div>
    )
  }

  const chartData = estatePlan.beneficiaries.map((b, index) => ({
    name: b.name,
    value: Number(b.allocation_percentage),
    color: COLORS[index % COLORS.length],
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Estate Plans
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{estatePlan.name}</h1>
              {estatePlan.description && (
                <p className="text-gray-600 mt-2">{estatePlan.description}</p>
              )}
            </div>
            <Button onClick={() => setIsEditModalOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Plan
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Beneficiaries</p>
            <p className="text-2xl font-bold text-gray-900">{estatePlan.beneficiaries.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Total Allocation</p>
            <p className="text-2xl font-bold text-gray-900">{totalAllocation.toFixed(2)}%</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Timelock Policies</p>
            <p className="text-2xl font-bold text-gray-900">{estatePlan.timelock_policies.length}</p>
          </div>
        </div>

        {/* Allocation Chart */}
        {estatePlan.beneficiaries.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Beneficiary Allocation</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Beneficiaries Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Beneficiaries</h2>
            <Button onClick={() => {
              setEditingBeneficiary(undefined)
              setIsBeneficiaryModalOpen(true)
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Beneficiary
            </Button>
          </div>
          {estatePlan.beneficiaries.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <p className="text-gray-500 mb-4">No beneficiaries added yet</p>
              <Button onClick={() => setIsBeneficiaryModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Beneficiary
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {estatePlan.beneficiaries.map((beneficiary) => (
                <BeneficiaryCard
                  key={beneficiary.id}
                  beneficiary={beneficiary}
                  onEdit={(b) => {
                    setEditingBeneficiary(b)
                    setIsBeneficiaryModalOpen(true)
                  }}
                  onDelete={handleDeleteBeneficiary}
                />
              ))}
            </div>
          )}
        </div>

        {/* Timelock Policies Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Timelock Policies</h2>
            <Button onClick={() => {
              setEditingPolicy(undefined)
              setIsPolicyModalOpen(true)
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Policy
            </Button>
          </div>
          {estatePlan.timelock_policies.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <p className="text-gray-500 mb-4">No timelock policies configured</p>
              <Button onClick={() => setIsPolicyModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Policy
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {estatePlan.timelock_policies.map((policy) => (
                <TimelockPolicyCard
                  key={policy.id}
                  timelockPolicy={policy}
                  onEdit={(p) => {
                    setEditingPolicy(p)
                    setIsPolicyModalOpen(true)
                  }}
                  onDelete={handleDeletePolicy}
                />
              ))}
            </div>
          )}
        </div>

        {/* Modals */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Edit Estate Plan"
          size="lg"
        >
          <EstatePlanForm
            estatePlan={estatePlan}
            onSubmit={handleUpdateEstatePlan}
            onCancel={() => setIsEditModalOpen(false)}
            isLoading={isSubmitting}
          />
        </Modal>

        <Modal
          isOpen={isBeneficiaryModalOpen}
          onClose={() => {
            setIsBeneficiaryModalOpen(false)
            setEditingBeneficiary(undefined)
          }}
          title={editingBeneficiary ? 'Edit Beneficiary' : 'Add Beneficiary'}
          size="lg"
        >
          <BeneficiaryForm
            beneficiary={editingBeneficiary}
            estatePlanId={id}
            totalAllocation={totalAllocation}
            onSubmit={editingBeneficiary ? handleUpdateBeneficiary : handleCreateBeneficiary}
            onCancel={() => {
              setIsBeneficiaryModalOpen(false)
              setEditingBeneficiary(undefined)
            }}
            isLoading={isSubmitting}
          />
        </Modal>

        <Modal
          isOpen={isPolicyModalOpen}
          onClose={() => {
            setIsPolicyModalOpen(false)
            setEditingPolicy(undefined)
          }}
          title={editingPolicy ? 'Edit Timelock Policy' : 'Add Timelock Policy'}
          size="lg"
        >
          <TimelockPolicyForm
            timelockPolicy={editingPolicy}
            estatePlanId={id}
            onSubmit={editingPolicy ? handleUpdatePolicy : handleCreatePolicy}
            onCancel={() => {
              setIsPolicyModalOpen(false)
              setEditingPolicy(undefined)
            }}
            isLoading={isSubmitting}
          />
        </Modal>
      </div>
    </div>
  )
}

