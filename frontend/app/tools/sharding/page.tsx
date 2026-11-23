'use client'

import { useState } from 'react'
import { splitSecret, combineShards, type GeneratedShard } from '@/lib/shamir'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { KeyRound, ShieldCheck, Copy, Check, Printer, RefreshCw } from 'lucide-react'

export default function KeyShardingPage() {
  const [mode, setMode] = useState<'split' | 'reconstruct'>('split')

  // Split state
  const [secret, setSecret] = useState('')
  const [totalShares, setTotalShares] = useState(3)
  const [threshold, setThreshold] = useState(2)
  const [custodians, setCustodians] = useState<string[]>([
    'Primary Heir / Spouse',
    'Estate Attorney / Executor',
    'Home Safe / Bank Vault',
  ])
  const [shards, setShards] = useState<GeneratedShard[]>([])
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)

  // Reconstruct state
  const [inputShards, setInputShards] = useState<string[]>(['', ''])
  const [recovered, setRecovered] = useState<string | null>(null)

  const handleTotalChange = (nextTotal: number) => {
    const clamped = Math.min(Math.max(2, nextTotal), 10)
    setTotalShares(clamped)
    if (threshold > clamped) setThreshold(clamped)
    setCustodians((prev) => {
      const copy = [...prev]
      while (copy.length < clamped) copy.push(`Custodian #${copy.length + 1}`)
      return copy.slice(0, clamped)
    })
  }

  const handleSplit = (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const out = splitSecret(secret.trim(), totalShares, threshold)
      setShards(out)
      toast(`Split locally into ${totalShares} shards (${threshold}-of-${totalShares} quorum)`, 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to split secret', 'error')
    }
  }

  const handleReconstruct = (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const result = combineShards(inputShards)
      setRecovered(result)
      toast('Secret reconstructed and checksum-verified offline', 'success')
    } catch (err) {
      setRecovered(null)
      toast(err instanceof Error ? err.message : 'Reconstruction failed', 'error')
    }
  }

  const copyShard = async (idx: number, encoded: string) => {
    await navigator.clipboard.writeText(encoded)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 1600)
  }

  const loadSampleIntoReconstruct = () => {
    if (shards.length < threshold) return
    setInputShards(shards.slice(0, threshold).map((s) => s.encoded))
    setRecovered(null)
    setMode('reconstruct')
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="no-print flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a87b24]">
            Zero-Network Cryptographic Studio
          </p>
          <h1 className="font-serif-display mt-1 text-3xl font-semibold text-[#13161b]">
            Shamir Secret Sharing (M-of-N)
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#575d68]">
            Split a master vault passphrase, BIP-39 seed phrase, or recovery key over finite field GF(2⁸). Any M shards recover the exact secret; fewer than M reveal zero bits of information.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-[#136f4a]/30 bg-[#f2faf6] px-3.5 py-1.5 text-xs font-medium text-[#136f4a]">
          <ShieldCheck className="h-4 w-4" />
          100% Offline · Runs Only in Browser Memory
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="no-print flex gap-2 border-b border-[#e3ddd1] pb-3">
        <button
          type="button"
          onClick={() => setMode('split')}
          data-testid="sss-tab-split"
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            mode === 'split'
              ? 'bg-[#13161b] text-[#f6f4ef]'
              : 'text-[#4b505a] hover:bg-[#ece7dc]'
          }`}
        >
          Split Secret into Shards
        </button>
        <button
          type="button"
          onClick={() => setMode('reconstruct')}
          data-testid="sss-tab-reconstruct"
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            mode === 'reconstruct'
              ? 'bg-[#13161b] text-[#f6f4ef]'
              : 'text-[#4b505a] hover:bg-[#ece7dc]'
          }`}
        >
          Reconstruct &amp; Verify Secret
        </button>
      </div>

      {mode === 'split' ? (
        <div className="space-y-6">
          <form onSubmit={handleSplit} className="no-print lv-card p-6 space-y-5">
            <div>
              <label htmlFor="sss-secret" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#4b505a]">
                Master Secret / Vault Passphrase / Seed Phrase
              </label>
              <textarea
                id="sss-secret"
                data-testid="sss-secret-input"
                rows={3}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="Enter your recovery passphrase or seed words (never transmitted over network)…"
                className="lv-input font-mono-code text-xs"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#4b505a]">
                  Total Shards (N): {totalShares}
                </label>
                <input
                  type="range"
                  min={2}
                  max={10}
                  value={totalShares}
                  onChange={(e) => handleTotalChange(parseInt(e.target.value, 10))}
                  className="w-full accent-[#a87b24]"
                />
                <p className="text-[11px] text-[#575d68]">Total number of physical/custodian share cards to issue.</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#4b505a]">
                  Quorum Threshold (M): {threshold}-of-{totalShares}
                </label>
                <input
                  type="range"
                  min={2}
                  max={totalShares}
                  value={threshold}
                  onChange={(e) => setThreshold(parseInt(e.target.value, 10))}
                  className="w-full accent-[#a87b24]"
                />
                <p className="text-[11px] text-[#575d68]">Minimum shards required together to reconstruct the secret.</p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#4b505a]">
                Custodian / Heir Share Labels (Optional)
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {custodians.map((label, idx) => (
                  <input
                    key={idx}
                    type="text"
                    value={label}
                    onChange={(e) =>
                      setCustodians((prev) => prev.map((v, i) => (i === idx ? e.target.value : v)))
                    }
                    placeholder={`Shard #${idx + 1} Holder`}
                    className="lv-input py-1.5 text-xs"
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" variant="gold" data-testid="sss-split-btn">
                <KeyRound className="mr-1.5 h-4 w-4" />
                Generate {threshold}-of-{totalShares} Cryptographic Shards
              </Button>
              {shards.length > 0 && (
                <>
                  <Button type="button" variant="outline" onClick={loadSampleIntoReconstruct} data-testid="sss-test-reconstruct-btn">
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    Test Reconstruction with {threshold} Shards
                  </Button>
                  <Button type="button" variant="outline" onClick={() => window.print()}>
                    <Printer className="mr-1.5 h-3.5 w-3.5" />
                    Print Custodian Cards
                  </Button>
                </>
              )}
            </div>
          </form>

          {shards.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2" data-testid="sss-shards-grid">
              {shards.map((shard, idx) => (
                <div key={shard.index} className="lv-card p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a87b24]">
                        Legacy Vault Key Shard #{shard.index} of {shard.total}
                      </span>
                      <h3 className="mt-0.5 font-serif-display text-lg font-semibold text-[#13161b]">
                        {custodians[idx] || `Custodian #${shard.index}`}
                      </h3>
                    </div>
                    <span className="rounded bg-[#13161b] px-2 py-0.5 font-mono-code text-[11px] text-[#d6b15e]">
                      {shard.threshold}-of-{shard.total}
                    </span>
                  </div>

                  <div className="mt-3 rounded-lg bg-[#13161b] p-3 font-mono-code text-[11px] text-[#f4f1ea] break-all">
                    {shard.encoded}
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-[#575d68]">
                    <span className="font-mono-code">Checksum: {shard.checksum}</span>
                    <button
                      type="button"
                      onClick={() => copyShard(shard.index, shard.encoded)}
                      className="no-print inline-flex items-center gap-1 font-medium text-[#13161b] hover:text-[#a87b24]"
                    >
                      {copiedIdx === shard.index ? (
                        <Check className="h-3.5 w-3.5 text-[#136f4a]" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {copiedIdx === shard.index ? 'Copied' : 'Copy shard'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleReconstruct} className="lv-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif-display text-xl font-semibold text-[#13161b]">
              Reconstruct Master Secret from Shards
            </h2>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setInputShards((prev) => [...prev, ''])}
            >
              + Add Shard Slot
            </Button>
          </div>

          <div className="space-y-3">
            {inputShards.map((val, idx) => (
              <div key={idx}>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#4b505a]">
                  Shard Input #{idx + 1}
                </label>
                <input
                  type="text"
                  value={val}
                  onChange={(e) =>
                    setInputShards((prev) => prev.map((v, i) => (i === idx ? e.target.value : v)))
                  }
                  placeholder="LV-SHARD-v1:..."
                  className="lv-input font-mono-code text-xs"
                />
              </div>
            ))}
          </div>

          <Button type="submit" variant="primary" data-testid="sss-reconstruct-btn">
            Reconstruct Secret Locally
          </Button>

          {recovered !== null && (
            <div
              className="rounded-xl border border-[#136f4a]/30 bg-[#f2faf6] p-4"
              data-testid="sss-recovered-output"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-[#136f4a]">
                Reconstructed Secret (Verified)
              </p>
              <pre className="mt-1.5 whitespace-pre-wrap break-all font-mono-code text-sm text-[#13161b]">
                {recovered}
              </pre>
            </div>
          )}
        </form>
      )}
    </div>
  )
}
