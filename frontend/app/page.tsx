'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  EstatePlan,
  DashboardSummary,
  estatePlansApi,
  dashboardApi,
  heartbeatApi,
} from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { EstatePlanForm, type EstatePlanFormData } from '@/components/estate-plan/EstatePlanForm'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import {
  Plus,
  HeartPulse,
  ShieldCheck,
  Users,
  Clock,
  Lock,
  ArrowRight,
  Edit,
  Trash2,
  Cpu,
  KeyRound,
  AlertTriangle,
} from 'lucide-react'

function gradeColor(score: number): string {
  if (score >= 80) return 'text-[#136f4a] bg-[#f2faf6] border-[#136f4a]/30'
  if (score >= 60) return 'text-[#a87b24] bg-[#fdf8ed] border-[#a87b24]/30'
  return 'text-[#b91c1c] bg-[#fef2f2] border-[#b91c1c]/30'
}

function heartbeatBadge(status: string): { label: string; cls: string } {
  switch (status) {
    case 'healthy':
      return { label: 'Heartbeat Healthy', cls: 'text-[#136f4a] bg-[#f2faf6] border-[#136f4a]/25' }
    case 'due_soon':
      return { label: 'Check-In Due Soon', cls: 'text-[#b45309] bg-[#fffbeb] border-[#b45309]/30' }
    case 'grace_period':
      return { label: 'Grace Period', cls: 'text-[#b91c1c] bg-[#fef2f2] border-[#b91c1c]/30' }
    default:
      return { label: 'Triggered', cls: 'text-white bg-[#b91c1c] border-[#b91c1c]' }
  }
}

export default function Home() {
  const { user } = useAuth()
  const [estatePlans, setEstatePlans] = useState<EstatePlan[]>([])
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<EstatePlan | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [checkingInId, setCheckingInId] = useState<number | null>(null)

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true)
      const [plansData, summaryData] = await Promise.all([
        estatePlansApi.list(),
        dashboardApi.summary(),
      ])
      setEstatePlans(plansData)
      setSummary(summaryData)
    } catch (error) {
      toast(
        error instanceof Error ? error.message : 'Failed to load estate vaults',
        'error'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

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
      toast('Estate plan deleted', 'success')
      fetchAll()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to delete estate plan', 'error')
    }
  }

  const handleQuickCheckin = async (planId: number, planName: string) => {
    try {
      setCheckingInId(planId)
      await heartbeatApi.checkin(planId, 'Quick dashboard proof-of-life check-in')
      toast(`Proof-of-life verified for ${planName}`, 'success')
      await fetchAll()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Check-in failed', 'error')
    } finally {
      setCheckingInId(null)
    }
  }

  const handleSubmit = async (data: EstatePlanFormData) => {
    try {
      setIsSubmitting(true)
      const payload = {
        name: data.name,
        description: data.description || null,
        bitcoin_address: data.bitcoin_address.trim() || null,
        monero_address: data.monero_address.trim() || null,
        stacks_address: data.stacks_address.trim() || null,
        heartbeat_interval_days: data.heartbeat_interval_days,
        grace_period_days: data.grace_period_days,
        is_active: data.is_active,
      }
      if (editingPlan) {
        await estatePlansApi.update(editingPlan.id, {
          ...payload,
          user_id: editingPlan.user_id,
        })
        toast('Estate plan updated successfully', 'success')
      } else {
        if (!user) throw new Error('Not logged in')
        await estatePlansApi.create({
          ...payload,
          user_id: user.id,
        })
        toast('Estate plan created successfully', 'success')
      }
      setIsModalOpen(false)
      setEditingPlan(undefined)
      fetchAll()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to save estate plan', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[#e3ddd1] border-t-[#a87b24]" />
          <p className="text-sm text-[#575d68]">Loading sovereign estate ledger…</p>
        </div>
      </div>
    )
  }

  const summaryMap = new Map(summary?.plans.map((p) => [p.id, p]) || [])
  const avgScore = summary?.average_readiness_score ?? 0

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Executive Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a87b24]">
            Sovereign Estate Ledger
          </p>
          <h1 className="font-serif-display mt-1 text-3xl font-semibold text-[#13161b] sm:text-4xl">
            Multi-Chain Inheritance Vaults
          </h1>
          <p className="mt-1.5 text-sm text-[#575d68]">
            Manage Bitcoin (BTC), Monero (XMR), and Stacks (STX) succession plans, proof-of-life heartbeats, and encrypted heir dossiers.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/tools/crypto">
            <Button variant="outline" size="md">
              <Cpu className="mr-1.5 h-4 w-4 text-[#a87b24]" />
              Miniscript Lab
            </Button>
          </Link>
          <Link href="/tools/sharding">
            <Button variant="outline" size="md">
              <KeyRound className="mr-1.5 h-4 w-4 text-[#a87b24]" />
              Key Sharding
            </Button>
          </Link>
          <Button variant="primary" size="md" onClick={handleCreate} data-testid="create-estate-plan-btn">
            <Plus className="mr-1.5 h-4 w-4 text-[#d6b15e]" />
            Create Estate Plan
          </Button>
        </div>
      </div>

      {/* Institutional Analytics Ribbon */}
      {summary && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Obsidian Readiness Card */}
          <div className="lv-card-obsidian p-6 lg:col-span-5 flex items-center justify-between gap-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#d6b15e]">
                Estate Readiness Index
              </p>
              <div className="mt-2 flex items-baseline gap-2.5">
                <span className="font-serif-display text-4xl font-semibold text-[#f6f4ef]">
                  {avgScore}
                </span>
                <span className="text-sm text-[#9ca3af]">/ 100</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[#b8bec9]">
                {summary.total_plans === 0
                  ? 'Create your first vault to establish cryptographic continuity.'
                  : `${summary.active_plans} active vault(s) · ${summary.total_beneficiaries} heir(s) · ${summary.total_timelocks} timelock(s)`}
              </p>
            </div>
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
              <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="#282f3a"
                  strokeWidth="2.8"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="#d6b15e"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeDasharray={`${avgScore}, 100`}
                />
              </svg>
              <ShieldCheck className="absolute h-6 w-6 text-[#d6b15e]" />
            </div>
          </div>

          {/* Proof-of-Life Heartbeat Card */}
          <div className="lv-card p-6 lg:col-span-4 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7c7465]">
                  Proof-of-Life Heartbeat
                </p>
                <p className="mt-1.5 text-lg font-semibold text-[#13161b]">
                  {summary.healthy_heartbeats} Healthy
                  {summary.attention_needed_heartbeats > 0 && (
                    <span className="ml-2 text-sm font-medium text-[#b45309]">
                      · {summary.attention_needed_heartbeats} Attention
                    </span>
                  )}
                </p>
              </div>
              <HeartPulse className="h-5 w-5 text-[#136f4a]" />
            </div>

            {summary.next_checkin_due_at && summary.next_checkin_plan_id ? (
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#ece6da] pt-3">
                <div className="text-xs text-[#575d68]">
                  Next due:{' '}
                  <strong className="text-[#13161b]">
                    {new Date(summary.next_checkin_due_at).toLocaleDateString()}
                  </strong>
                  <div className="truncate max-w-[170px] text-[11px]">
                    {summary.next_checkin_plan_name}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={checkingInId === summary.next_checkin_plan_id}
                  onClick={() =>
                    handleQuickCheckin(
                      summary.next_checkin_plan_id!,
                      summary.next_checkin_plan_name || 'Vault'
                    )
                  }
                >
                  {checkingInId === summary.next_checkin_plan_id ? 'Verifying…' : 'Verify Alive'}
                </Button>
              </div>
            ) : (
              <p className="mt-4 border-t border-[#ece6da] pt-3 text-xs text-[#575d68]">
                Configure an active estate plan to start dead-man&apos;s-switch check-in monitoring.
              </p>
            )}
          </div>

          {/* Multi-Chain & ZK Coverage Card */}
          <div className="lv-card p-6 lg:col-span-3 flex flex-col justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7c7465]">
              Chain &amp; Vault Coverage
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-[#faf8f4] border border-[#e8e2d5] py-2">
                <div className="font-mono-code text-base font-bold text-[#13161b]">
                  {summary.chain_coverage.btc_plans}
                </div>
                <div className="text-[10px] font-semibold tracking-wider text-[#a87b24]">BTC</div>
              </div>
              <div className="rounded-lg bg-[#faf8f4] border border-[#e8e2d5] py-2">
                <div className="font-mono-code text-base font-bold text-[#13161b]">
                  {summary.chain_coverage.xmr_plans}
                </div>
                <div className="text-[10px] font-semibold tracking-wider text-[#575d68]">XMR</div>
              </div>
              <div className="rounded-lg bg-[#faf8f4] border border-[#e8e2d5] py-2">
                <div className="font-mono-code text-base font-bold text-[#13161b]">
                  {summary.chain_coverage.stx_plans}
                </div>
                <div className="text-[10px] font-semibold tracking-wider text-[#575d68]">STX</div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-[#ece6da] pt-2.5 text-xs text-[#575d68]">
              <span className="inline-flex items-center gap-1">
                <Lock className="h-3.5 w-3.5 text-[#a87b24]" />
                {summary.total_vault_notes} ZK Encrypted Note(s)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Estate Vaults Section */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif-display text-2xl font-semibold text-[#13161b]">
            Your Estate Plans ({estatePlans.length})
          </h2>
        </div>

        {estatePlans.length === 0 ? (
          <div className="lv-card p-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#13161b] text-[#d6b15e]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="font-serif-display text-xl font-semibold text-[#13161b]">
              Establish Your First Sovereign Vault
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-[#575d68]">
              Define multi-chain BTC/XMR/STX addresses, assign heir allocations totaling 100%, configure Bitcoin Miniscript timelocks, and store zero-knowledge encrypted recovery notes.
            </p>
            <div className="mt-6">
              <Button variant="gold" onClick={handleCreate}>
                <Plus className="mr-1.5 h-4 w-4" />
                Create Estate Plan
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {estatePlans.map((plan) => {
              const meta = summaryMap.get(plan.id)
              const hb = meta?.heartbeat
              const hbBadge = hb ? heartbeatBadge(hb.status) : null
              return (
                <div
                  key={plan.id}
                  className="lv-card flex flex-col justify-between p-5 transition-all duration-150 hover:border-[#cfc7b6]"
                  data-testid={`estate-plan-card-${plan.id}`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/estate-plans/${plan.id}`}
                          className="font-serif-display block truncate text-xl font-semibold text-[#13161b] hover:text-[#a87b24] transition-colors"
                        >
                          {plan.name}
                        </Link>
                        {plan.description && (
                          <p className="mt-1 line-clamp-2 text-xs text-[#575d68]">
                            {plan.description}
                          </p>
                        )}
                      </div>
                      {meta && (
                        <span
                          className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-bold ${gradeColor(
                            meta.readiness_score
                          )}`}
                          title={`Estate Readiness Score: ${meta.readiness_score}/100`}
                        >
                          {meta.readiness_grade} · {meta.readiness_score}
                        </span>
                      )}
                    </div>

                    {/* Chain pills */}
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {meta && meta.chains.length > 0 ? (
                        meta.chains.map((ch) => (
                          <span
                            key={ch}
                            className="rounded bg-[#13161b] px-2 py-0.5 font-mono-code text-[10px] font-semibold text-[#d6b15e]"
                          >
                            {ch}
                          </span>
                        ))
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#b45309]">
                          <AlertTriangle className="h-3 w-3" />
                          No vault addresses yet
                        </span>
                      )}
                      {hbBadge && (
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${hbBadge.cls}`}
                        >
                          {hbBadge.label}
                        </span>
                      )}
                    </div>

                    {/* Metrics */}
                    {meta && (
                      <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-[#faf8f4] border border-[#ece6da] p-2.5 text-center text-xs">
                        <div>
                          <div className="flex items-center justify-center gap-1 font-semibold text-[#13161b]">
                            <Users className="h-3 w-3 text-[#7c7465]" />
                            {meta.beneficiary_count}
                          </div>
                          <div className="text-[10px] text-[#7c7465]">
                            {meta.total_allocation.toFixed(0)}% Alloc
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-center gap-1 font-semibold text-[#13161b]">
                            <Clock className="h-3 w-3 text-[#7c7465]" />
                            {meta.timelock_count}
                          </div>
                          <div className="text-[10px] text-[#7c7465]">Timelocks</div>
                        </div>
                        <div>
                          <div className="flex items-center justify-center gap-1 font-semibold text-[#13161b]">
                            <Lock className="h-3 w-3 text-[#7c7465]" />
                            {meta.vault_notes_count}
                          </div>
                          <div className="text-[10px] text-[#7c7465]">ZK Notes</div>
                        </div>
                      </div>
                    )}

                    {/* Heartbeat bar */}
                    {hb && (
                      <div className="mt-3">
                        <div className="mb-1 flex items-center justify-between text-[11px] text-[#575d68]">
                          <span>Next check-in</span>
                          <span className="font-medium text-[#13161b]">
                            {hb.days_remaining >= 0
                              ? `${hb.days_remaining}d left`
                              : `${Math.abs(hb.days_remaining)}d overdue`}
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#e8e2d5]">
                          <div
                            className={`h-full rounded-full transition-all ${
                              hb.status === 'healthy'
                                ? 'bg-[#136f4a]'
                                : hb.status === 'due_soon'
                                ? 'bg-[#b45309]'
                                : 'bg-[#b91c1c]'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(4, hb.progress_percent))}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="mt-5 flex items-center justify-between gap-2 border-t border-[#ece6da] pt-3.5">
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleQuickCheckin(plan.id, plan.name)}
                        disabled={checkingInId === plan.id}
                        title="Record proof-of-life check-in"
                      >
                        <HeartPulse className="h-3.5 w-3.5 text-[#136f4a]" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(plan)}
                        title="Edit vault"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(plan.id)}
                        className="text-[#b91c1c] hover:bg-[#fef2f2]"
                        title="Delete vault"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Link href={`/estate-plans/${plan.id}`}>
                      <Button size="sm" variant="primary">
                        Open Vault
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Create / Edit Modal */}
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
  )
}
