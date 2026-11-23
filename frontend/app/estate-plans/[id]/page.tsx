'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  EstatePlanWithRelations,
  Beneficiary,
  TimelockPolicy,
  PlanCheckin,
  TimelockDescriptorResponse,
  estatePlansApi,
  beneficiariesApi,
  timelockPoliciesApi,
  heartbeatApi,
  cryptoApi,
} from '@/lib/api'
import { EstatePlanForm, type EstatePlanFormData } from '@/components/estate-plan/EstatePlanForm'
import { BeneficiaryForm } from '@/components/beneficiary/BeneficiaryForm'
import { BeneficiaryCard } from '@/components/beneficiary/BeneficiaryCard'
import { TimelockPolicyForm } from '@/components/timelock-policy/TimelockPolicyForm'
import { TimelockPolicyCard } from '@/components/timelock-policy/TimelockPolicyCard'
import { ZeroKnowledgeNotes } from '@/components/vault/ZeroKnowledgeNotes'
import { InheritancePacketModal } from '@/components/vault/InheritancePacketModal'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import {
  ArrowLeft,
  Plus,
  Edit,
  HeartPulse,
  FileDown,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Cpu,
  Copy,
  Check,
  Clock,
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

// Curated Swiss private-custody chart palette (Brass, Obsidian, Emerald, Slate, Burnished Copper, Warm Stone)
const COLORS = ['#a87b24', '#13161b', '#136f4a', '#4b5563', '#b45309', '#78716c']

export default function EstatePlanDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = parseInt(params.id as string, 10)

  const [estatePlan, setEstatePlan] = useState<EstatePlanWithRelations | null>(null)
  const [checkins, setCheckins] = useState<PlanCheckin[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isBeneficiaryModalOpen, setIsBeneficiaryModalOpen] = useState(false)
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false)
  const [isPacketOpen, setIsPacketOpen] = useState(false)
  const [editingBeneficiary, setEditingBeneficiary] = useState<Beneficiary | undefined>()
  const [editingPolicy, setEditingPolicy] = useState<TimelockPolicy | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [checkinNote, setCheckinNote] = useState('')
  const [checkingIn, setCheckingIn] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [compiledDescriptors, setCompiledDescriptors] = useState<
    Record<number, TimelockDescriptorResponse>
  >({})

  const fetchEstatePlan = useCallback(async () => {
    if (!id || Number.isNaN(id)) return
    try {
      setLoading(true)
      const [data, history] = await Promise.all([
        estatePlansApi.get(id),
        heartbeatApi.listCheckins(id),
      ])
      setEstatePlan(data)
      setCheckins(history)
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to load estate plan', 'error')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchEstatePlan()
  }, [fetchEstatePlan])

  const totalAllocation =
    estatePlan?.beneficiaries.reduce((sum, b) => sum + Number(b.allocation_percentage), 0) || 0

  const handleRecordCheckin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!estatePlan) return
    try {
      setCheckingIn(true)
      await heartbeatApi.checkin(estatePlan.id, checkinNote.trim() || 'Verified proof-of-life')
      setCheckinNote('')
      toast('Proof-of-life check-in recorded — heartbeat timer reset', 'success')
      await fetchEstatePlan()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Check-in failed', 'error')
    } finally {
      setCheckingIn(false)
    }
  }

  const handleCompileDescriptor = async (policy: TimelockPolicy) => {
    if (!estatePlan) return
    try {
      const heirKeys = estatePlan.beneficiaries.map(
        (b, i) => `HEIR_${b.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || i + 1}_XPUB/0/*`
      )
      const desc = await cryptoApi.timelockDescriptor({
        owner_key: estatePlan.bitcoin_address
          ? `OWNER_KEY(${estatePlan.bitcoin_address.slice(0, 12)}...)`
          : 'OWNER_XPUB/0/*',
        heir_keys: heirKeys.length > 0 ? heirKeys : ['HEIR_1_XPUB/0/*'],
        heir_threshold: 1,
        timelock_blocks: Math.max(1, policy.timelock_blocks),
        lock_mode: policy.trigger_condition === 'date' ? 'cltv' : 'csv',
        network: 'mainnet',
      })
      setCompiledDescriptors((prev) => ({ ...prev, [policy.id]: desc }))
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to compile descriptor', 'error')
    }
  }

  const handleUpdateEstatePlan = async (data: EstatePlanFormData) => {
    if (!estatePlan) return
    try {
      setIsSubmitting(true)
      await estatePlansApi.update(estatePlan.id, {
        name: data.name,
        description: data.description || null,
        bitcoin_address: data.bitcoin_address.trim() || null,
        monero_address: data.monero_address.trim() || null,
        stacks_address: data.stacks_address.trim() || null,
        heartbeat_interval_days: data.heartbeat_interval_days,
        grace_period_days: data.grace_period_days,
        is_active: data.is_active,
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

  const handleCreateBeneficiary = async (data: {
    name: string
    email: string
    bitcoin_address: string
    monero_address: string
    stacks_address: string
    allocation_percentage: number
  }) => {
    try {
      setIsSubmitting(true)
      await beneficiariesApi.create({
        estate_plan_id: id,
        name: data.name,
        email: data.email || null,
        bitcoin_address: data.bitcoin_address.trim() || null,
        monero_address: data.monero_address.trim() || null,
        stacks_address: data.stacks_address.trim() || null,
        allocation_percentage: Number(data.allocation_percentage),
      })
      toast('Beneficiary added', 'success')
      setIsBeneficiaryModalOpen(false)
      fetchEstatePlan()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to create beneficiary', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateBeneficiary = async (data: {
    name: string
    email: string
    bitcoin_address: string
    monero_address: string
    stacks_address: string
    allocation_percentage: number
  }) => {
    if (!editingBeneficiary) return
    try {
      setIsSubmitting(true)
      await beneficiariesApi.update(editingBeneficiary.id, {
        name: data.name,
        email: data.email || null,
        bitcoin_address: data.bitcoin_address.trim() || null,
        monero_address: data.monero_address.trim() || null,
        stacks_address: data.stacks_address.trim() || null,
        allocation_percentage: Number(data.allocation_percentage),
      })
      toast('Beneficiary updated', 'success')
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
      toast('Beneficiary removed', 'success')
      fetchEstatePlan()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to delete beneficiary', 'error')
    }
  }

  const handleCreatePolicy = async (data: {
    name: string
    description: string
    timelock_blocks: number
    trigger_condition: string
    is_active: boolean
  }) => {
    try {
      setIsSubmitting(true)
      await timelockPoliciesApi.create({
        estate_plan_id: id,
        name: data.name,
        description: data.description || null,
        timelock_blocks: Number(data.timelock_blocks),
        trigger_condition: data.trigger_condition || null,
        is_active: data.is_active,
      })
      toast('Timelock policy created', 'success')
      setIsPolicyModalOpen(false)
      fetchEstatePlan()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to create timelock policy', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdatePolicy = async (data: {
    name: string
    description: string
    timelock_blocks: number
    trigger_condition: string
    is_active: boolean
  }) => {
    if (!editingPolicy) return
    try {
      setIsSubmitting(true)
      await timelockPoliciesApi.update(editingPolicy.id, {
        name: data.name,
        description: data.description || null,
        timelock_blocks: Number(data.timelock_blocks),
        trigger_condition: data.trigger_condition || null,
        is_active: data.is_active,
      })
      toast('Timelock policy updated', 'success')
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
      toast('Timelock policy deleted', 'success')
      fetchEstatePlan()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to delete timelock policy', 'error')
    }
  }

  const copyAddr = async (key: string, val: string) => {
    await navigator.clipboard.writeText(val)
    setCopiedField(key)
    setTimeout(() => setCopiedField(null), 1500)
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[#e3ddd1] border-t-[#a87b24]" />
          <p className="text-sm text-[#575d68]">Loading vault details…</p>
        </div>
      </div>
    )
  }

  if (!estatePlan) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-sm text-[#575d68]">Estate plan not found</p>
          <Button onClick={() => router.push('/')}>Back to Vault Overview</Button>
        </div>
      </div>
    )
  }

  const chartData = estatePlan.beneficiaries.map((b, index) => ({
    name: b.name,
    value: Number(b.allocation_percentage),
    color: COLORS[index % COLORS.length],
  }))

  const { heartbeat, readiness } = estatePlan

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Back navigation */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Back to Vault Overview
        </Button>
      </div>

      {/* Obsidian Vault Hero Banner */}
      <section className="lv-card-obsidian p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-[#262d38] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#d6b15e]">
                {estatePlan.is_active ? 'Active Vault' : 'Inactive Vault'}
              </span>
              <span className="text-xs text-[#9ca3af]">
                Vault #{estatePlan.id} · Updated {new Date(estatePlan.updated_at).toLocaleDateString()}
              </span>
            </div>
            <h1 className="font-serif-display text-3xl font-semibold text-[#f6f4ef] sm:text-4xl">
              {estatePlan.name}
            </h1>
            {estatePlan.description && (
              <p className="text-sm leading-relaxed text-[#b8bec9]">{estatePlan.description}</p>
            )}

            {/* Multi-chain vault addresses */}
            <div className="flex flex-wrap gap-2 pt-3">
              {[
                { key: 'BTC', val: estatePlan.bitcoin_address },
                { key: 'XMR', val: estatePlan.monero_address },
                { key: 'STX', val: estatePlan.stacks_address },
              ]
                .filter((a) => a.val && a.val.trim().length > 0)
                .map(({ key, val }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => copyAddr(key, val!)}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#2d3542] bg-[#1a1f27] px-3 py-1.5 text-xs text-[#e8e3d7] hover:border-[#d6b15e]"
                    title="Copy vault address"
                  >
                    <span className="font-mono-code font-bold text-[#d6b15e]">{key}</span>
                    <span className="font-mono-code max-w-[180px] truncate">{val}</span>
                    {copiedField === key ? (
                      <Check className="h-3.5 w-3.5 text-[#34d399]" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-[#9ca3af]" />
                    )}
                  </button>
                ))}
            </div>
          </div>

          {/* Readiness Gauge + Actions */}
          <div className="flex flex-col items-end gap-4">
            <div className="flex items-center gap-4 rounded-xl border border-[#2a313d] bg-[#1a1f27] px-4 py-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#9ca3af]">
                  Readiness Score
                </p>
                <div className="flex items-baseline gap-2">
                  <span
                    className="font-serif-display text-3xl font-semibold text-[#f6f4ef]"
                    data-testid="plan-readiness-score"
                  >
                    {readiness.score}
                  </span>
                  <span className="rounded bg-[#d6b15e]/20 px-1.5 py-0.5 text-xs font-bold text-[#d6b15e]">
                    {readiness.grade}
                  </span>
                </div>
              </div>
              <svg className="h-14 w-14 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#2c3442" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="#d6b15e"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${readiness.score}, 100`}
                />
              </svg>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="gold"
                size="sm"
                onClick={() => setIsPacketOpen(true)}
                data-testid="open-inheritance-packet-btn"
              >
                <FileDown className="mr-1.5 h-3.5 w-3.5" />
                Export Heir Dossier
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditModalOpen(true)}
                className="border-[#3a4252] bg-transparent text-[#f4f1ea] hover:bg-[#232934] hover:border-[#d6b15e]"
              >
                <Edit className="mr-1.5 h-3.5 w-3.5" />
                Edit Plan
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Heartbeat Proof-of-Life & Readiness Checklist */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Proof-of-Life Heartbeat Card */}
        <section className="lv-card p-6 lg:col-span-5 flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <HeartPulse className="h-5 w-5 text-[#136f4a]" />
                <h2 className="font-serif-display text-xl font-semibold text-[#13161b]">
                  Dead-Man&apos;s-Switch Heartbeat
                </h2>
              </div>
              <span
                data-testid="heartbeat-status-badge"
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                  heartbeat.status === 'healthy'
                    ? 'bg-[#f2faf6] text-[#136f4a]'
                    : heartbeat.status === 'due_soon'
                    ? 'bg-[#fffbeb] text-[#b45309]'
                    : 'bg-[#fef2f2] text-[#b91c1c]'
                }`}
              >
                {heartbeat.status.replace('_', ' ')}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-[#faf8f4] border border-[#ece6da] p-3">
                <p className="text-[#7c7465]">Check-In Interval</p>
                <p className="mt-0.5 font-semibold text-[#13161b]">
                  Every {heartbeat.heartbeat_interval_days} days
                </p>
              </div>
              <div className="rounded-lg bg-[#faf8f4] border border-[#ece6da] p-3">
                <p className="text-[#7c7465]">Next Check-In Due</p>
                <p className="mt-0.5 font-semibold text-[#13161b]">
                  {new Date(heartbeat.next_due_at).toLocaleDateString()} ({heartbeat.days_remaining}d)
                </p>
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-1 flex justify-between text-[11px] text-[#575d68]">
                <span>Last verified: {new Date(heartbeat.last_checkin_at).toLocaleString()}</span>
                <span>+{heartbeat.grace_period_days}d grace</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#e8e2d5]">
                <div
                  className="h-full rounded-full bg-[#136f4a] transition-all"
                  style={{ width: `${Math.min(100, Math.max(4, heartbeat.progress_percent))}%` }}
                />
              </div>
            </div>

            <form onSubmit={handleRecordCheckin} className="mt-4 flex gap-2">
              <input
                type="text"
                value={checkinNote}
                onChange={(e) => setCheckinNote(e.target.value)}
                data-testid="checkin-note-input"
                placeholder="Optional check-in memo (e.g. hardware audit)"
                className="lv-input py-1.5 text-xs flex-1"
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={checkingIn}
                data-testid="record-checkin-btn"
              >
                {checkingIn ? 'Verifying…' : 'Verify Alive'}
              </Button>
            </form>
          </div>

          {/* Check-in History */}
          <div className="border-t border-[#ece6da] pt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#7c7465]">
              Recent Proof-of-Life Log ({checkins.length})
            </p>
            {checkins.length === 0 ? (
              <p className="text-xs text-[#575d68]">No manual check-ins recorded yet.</p>
            ) : (
              <ul className="max-h-36 space-y-1.5 overflow-y-auto text-xs">
                {checkins.slice(0, 5).map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-2 rounded bg-[#faf8f4] px-2.5 py-1.5"
                  >
                    <span className="truncate text-[#16181d]">{c.note || 'Proof-of-life confirmed'}</span>
                    <span className="shrink-0 font-mono-code text-[10px] text-[#7c7465]">
                      {new Date(c.created_at).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Itemized Readiness Audit Checklist */}
        <section className="lv-card p-6 lg:col-span-7">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif-display text-xl font-semibold text-[#13161b]">
              Estate Readiness Audit
            </h2>
            <span className="text-xs font-semibold text-[#a87b24]">
              {readiness.score} / 100 pts ({readiness.grade})
            </span>
          </div>
          <div className="divide-y divide-[#ece6da]">
            {readiness.checks.map((item) => (
              <div key={item.key} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex items-start gap-2.5">
                  {item.status === 'pass' ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#136f4a]" />
                  ) : item.status === 'warn' ? (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#b45309]" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#b91c1c]" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-[#13161b]">{item.label}</p>
                    <p className="text-xs text-[#575d68]">{item.detail}</p>
                  </div>
                </div>
                <span className="shrink-0 font-mono-code text-xs font-semibold text-[#4b505a]">
                  {item.points}/{item.max_points}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Beneficiaries & Allocation Section */}
      <section className="lv-card p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-serif-display text-2xl font-semibold text-[#13161b]">
              Beneficiaries &amp; Estate Allocation ({totalAllocation.toFixed(1)}%)
            </h2>
            <p className="mt-0.5 text-xs text-[#575d68]">
              Combined allocation across all heirs must equal or remain below 100%.
            </p>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              setEditingBeneficiary(undefined)
              setIsBeneficiaryModalOpen(true)
            }}
            disabled={totalAllocation >= 100}
            data-testid="add-beneficiary-btn"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Beneficiary
          </Button>
        </div>

        {estatePlan.beneficiaries.length > 0 && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-center">
            <div className="lg:col-span-5 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={88}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => `${val ?? 0}%`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="lg:col-span-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          </div>
        )}

        {estatePlan.beneficiaries.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#d8d0c1] bg-[#faf8f4] p-8 text-center">
            <p className="text-sm font-medium text-[#16181d]">No beneficiaries designated yet</p>
            <p className="mt-1 text-xs text-[#575d68]">
              Add one or more heirs with verified BTC, XMR, or STX payout addresses.
            </p>
          </div>
        )}
      </section>

      {/* Timelock Policies + Inline BIP-380 Miniscript Descriptor Compiler */}
      <section className="lv-card p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#a87b24]" />
              <h2 className="font-serif-display text-2xl font-semibold text-[#13161b]">
                Timelock Policies &amp; Bitcoin Descriptors
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-[#575d68]">
              Enforce block-height delays (CSV / CLTV) and compile BIP-380 watch-only descriptors for Sparrow or Liana.
            </p>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              setEditingPolicy(undefined)
              setIsPolicyModalOpen(true)
            }}
            data-testid="add-policy-btn"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Timelock Policy
          </Button>
        </div>

        {estatePlan.timelock_policies.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#d8d0c1] bg-[#faf8f4] p-8 text-center">
            <p className="text-sm font-medium text-[#16181d]">No timelock policies configured</p>
            <p className="mt-1 text-xs text-[#575d68]">
              Add a Bitcoin CSV or CLTV policy to protect against premature heir recovery.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {estatePlan.timelock_policies.map((policy) => {
              const compiled = compiledDescriptors[policy.id]
              return (
                <div key={policy.id} className="space-y-3">
                  <TimelockPolicyCard
                    timelockPolicy={policy}
                    onEdit={(p) => {
                      setEditingPolicy(p)
                      setIsPolicyModalOpen(true)
                    }}
                    onDelete={handleDeletePolicy}
                  />
                  <div className="flex items-center justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCompileDescriptor(policy)}
                    >
                      <Cpu className="mr-1.5 h-3.5 w-3.5 text-[#a87b24]" />
                      {compiled ? 'Recompile BIP-380 Descriptor' : 'Compile BIP-380 Miniscript Descriptor'}
                    </Button>
                  </div>
                  {compiled && (
                    <div className="lv-card-obsidian p-4 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#d6b15e]">
                          BIP-380 WSH Descriptor ({compiled.lock_mode.toUpperCase()} · ~{compiled.estimated_days}d)
                        </span>
                        <button
                          type="button"
                          onClick={() => copyAddr(`desc-${policy.id}`, compiled.wsh_descriptor)}
                          className="text-[#d6b15e] hover:underline"
                        >
                          {copiedField === `desc-${policy.id}` ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <pre className="whitespace-pre-wrap break-all font-mono-code text-[11px] text-[#f4f1ea]">
                        {compiled.wsh_descriptor}
                      </pre>
                      <div className="pt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9ca3af]">
                        Taproot (BIP-386)
                      </div>
                      <pre className="whitespace-pre-wrap break-all font-mono-code text-[11px] text-[#d6d1c4]">
                        {compiled.taproot_descriptor}
                      </pre>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Zero-Knowledge Client-Side Encrypted Vault Notes */}
      <ZeroKnowledgeNotes planId={estatePlan.id} onChanged={fetchEstatePlan} />

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
          estatePlanId={estatePlan.id}
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
          estatePlanId={estatePlan.id}
          onSubmit={editingPolicy ? handleUpdatePolicy : handleCreatePolicy}
          onCancel={() => {
            setIsPolicyModalOpen(false)
            setEditingPolicy(undefined)
          }}
          isLoading={isSubmitting}
        />
      </Modal>

      <InheritancePacketModal
        planId={estatePlan.id}
        isOpen={isPacketOpen}
        onClose={() => setIsPacketOpen(false)}
      />
    </div>
  )
}
