'use client'

import { useState, useEffect } from 'react'
import { heartbeatApi, type InheritancePacket } from '@/lib/api'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { Download, Printer, ShieldCheck, Copy, Check } from 'lucide-react'

interface InheritancePacketModalProps {
  planId: number
  isOpen: boolean
  onClose: () => void
}

export function InheritancePacketModal({
  planId,
  isOpen,
  onClose,
}: InheritancePacketModalProps) {
  const [packet, setPacket] = useState<InheritancePacket | null>(null)
  const [loading, setLoading] = useState(false)
  const [copiedDigest, setCopiedDigest] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    heartbeatApi
      .inheritancePacket(planId)
      .then((data) => setPacket(data))
      .catch((err) => toast(err instanceof Error ? err.message : 'Failed to build packet', 'error'))
      .finally(() => setLoading(false))
  }, [isOpen, planId])

  const handleDownloadJson = () => {
    if (!packet) return
    const blob = new Blob([JSON.stringify(packet, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `legacy-vault-dossier-${packet.plan.id}-${packet.plan.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast('Heir inheritance dossier downloaded', 'success')
  }

  const handleCopyDigest = async () => {
    if (!packet) return
    await navigator.clipboard.writeText(packet.integrity_sha256)
    setCopiedDigest(true)
    setTimeout(() => setCopiedDigest(false), 1800)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Verifiable Heir Inheritance Dossier" size="xl">
      {loading || !packet ? (
        <div className="py-12 text-center text-sm text-[#575d68]">
          Compiling cryptographic descriptors and SHA-256 dossier integrity seal…
        </div>
      ) : (
        <div className="space-y-5">
          {/* Action bar */}
          <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e3ddd1] bg-[#faf8f4] p-3.5">
            <div className="flex items-center gap-2 text-xs text-[#136f4a]">
              <ShieldCheck className="h-4 w-4" />
              <span>Schema {packet.schema_version} · Generated {new Date(packet.generated_at).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => window.print()}>
                <Printer className="mr-1.5 h-3.5 w-3.5" />
                Print / Save PDF
              </Button>
              <Button size="sm" variant="gold" onClick={handleDownloadJson} data-testid="download-packet-json">
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Download JSON Dossier
              </Button>
            </div>
          </div>

          {/* Integrity Seal */}
          <div className="lv-card-obsidian p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#d6b15e]">
                SHA-256 Integrity Digest
              </span>
              <button
                type="button"
                onClick={handleCopyDigest}
                className="inline-flex items-center gap-1 text-xs text-[#d6b15e] hover:underline"
              >
                {copiedDigest ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedDigest ? 'Copied' : 'Copy digest'}
              </button>
            </div>
            <p className="mt-1.5 break-all font-mono-code text-xs text-[#f4f1ea]" data-testid="packet-sha256">
              {packet.integrity_sha256}
            </p>
          </div>

          {/* Summary Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-[#e3ddd1] p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7c7465]">Vault Plan</p>
              <p className="mt-1 font-serif-display text-lg font-semibold text-[#13161b]">{packet.plan.name}</p>
              <p className="mt-0.5 text-xs text-[#575d68]">
                Readiness {packet.readiness.score}/100 ({packet.readiness.grade})
              </p>
            </div>
            <div className="rounded-lg border border-[#e3ddd1] p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7c7465]">Heartbeat Schedule</p>
              <p className="mt-1 text-sm font-semibold text-[#13161b]">
                Every {packet.heartbeat.heartbeat_interval_days} days (+{packet.heartbeat.grace_period_days}d grace)
              </p>
              <p className="mt-0.5 text-xs text-[#575d68]">
                Next check-in: {new Date(packet.heartbeat.next_due_at).toLocaleDateString()}
              </p>
            </div>
            <div className="rounded-lg border border-[#e3ddd1] p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7c7465]">Included Artifacts</p>
              <p className="mt-1 text-sm font-semibold text-[#13161b]">
                {packet.beneficiaries.length} heirs · {packet.timelock_policies.length} descriptors ·{' '}
                {packet.encrypted_vault_notes.length} ZK notes
              </p>
            </div>
          </div>

          {/* Beneficiaries */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#4b505a]">
              Designated Beneficiaries
            </h3>
            {packet.beneficiaries.length === 0 ? (
              <p className="text-xs text-[#575d68]">No beneficiaries configured.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-[#e3ddd1]">
                <table className="min-w-full divide-y divide-[#e3ddd1] text-xs">
                  <thead className="bg-[#f6f4ef] text-left text-[#575d68]">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Beneficiary</th>
                      <th className="px-3 py-2 font-semibold">Allocation</th>
                      <th className="px-3 py-2 font-semibold">Destination Addresses</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ece6da] bg-white">
                    {packet.beneficiaries.map((b) => (
                      <tr key={b.id}>
                        <td className="px-3 py-2 font-medium text-[#13161b]">
                          {b.name}
                          {b.email && <div className="text-[11px] text-[#575d68]">{b.email}</div>}
                        </td>
                        <td className="px-3 py-2 font-semibold text-[#a87b24]">{b.allocation_percentage}%</td>
                        <td className="px-3 py-2 font-mono-code text-[11px] text-[#374151] space-y-0.5">
                          {b.bitcoin_address && <div>BTC: {b.bitcoin_address}</div>}
                          {b.monero_address && <div>XMR: {b.monero_address}</div>}
                          {b.stacks_address && <div>STX: {b.stacks_address}</div>}
                          {!b.bitcoin_address && !b.monero_address && !b.stacks_address && (
                            <span className="text-[#9ca3af]">Not specified</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Compiled Bitcoin Miniscript Descriptors */}
          {packet.timelock_policies.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#4b505a]">
                Compiled Bitcoin BIP-380 Timelock Descriptors
              </h3>
              <div className="space-y-2.5">
                {packet.timelock_policies.map(({ policy, descriptor }) => (
                  <div key={policy.id} className="rounded-lg border border-[#e3ddd1] bg-[#faf8f4] p-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-[#13161b]">
                      <span>{policy.name}</span>
                      <span className="text-[#a87b24]">
                        {policy.timelock_blocks.toLocaleString()} blocks (~{descriptor.estimated_days}d ·{' '}
                        {descriptor.lock_mode.toUpperCase()})
                      </span>
                    </div>
                    <div className="mt-2 rounded bg-[#13161b] p-2.5 font-mono-code text-[11px] text-[#e8e3d7] break-all">
                      {descriptor.wsh_descriptor}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Heir Recovery Checklist */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#4b505a]">
              Heir Execution Protocol
            </h3>
            <ol className="space-y-1.5 rounded-lg border border-[#e3ddd1] bg-white p-4 text-xs leading-relaxed text-[#374151]">
              {packet.heir_instructions.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </Modal>
  )
}
