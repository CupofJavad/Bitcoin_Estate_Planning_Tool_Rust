'use client'

import { useState } from 'react'
import {
  cryptoApi,
  type AddressValidationResult,
  type TimelockDescriptorResponse,
} from '@/lib/api'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import {
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Plus,
  Trash2,
  ShieldCheck,
} from 'lucide-react'

const SAMPLE_ADDRESSES: Record<'btc' | 'xmr' | 'stx', { label: string; value: string }[]> = {
  btc: [
    { label: 'Mainnet Native SegWit (P2WPKH)', value: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4' },
    { label: 'Mainnet Taproot (P2TR)', value: 'bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0' },
    { label: 'Mainnet Legacy (P2PKH)', value: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa' },
  ],
  xmr: [
    {
      label: 'Monero Project Donation (Mainnet)',
      value: '44AFFq5kSiGBoZ4NMDwYtN18obc8AemS33DBLWs3H7otXft3XjrpDtQGv7SqSsaBYBb98uNbr2VBBEt7f2wfn3RVGQBEP3A',
    },
  ],
  stx: [
    { label: 'Stacks Mainnet Single-Sig', value: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7' },
  ],
}

const TIMELOCK_PRESETS = [
  { label: '30 Days', blocks: 4320 },
  { label: '90 Days', blocks: 12960 },
  { label: '6 Months', blocks: 26280 },
  { label: '1 Year', blocks: 52560 },
]

export default function CryptoLabPage() {
  // Address Validator state
  const [chain, setChain] = useState<'btc' | 'xmr' | 'stx'>('btc')
  const [address, setAddress] = useState('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4')
  const [valResult, setValResult] = useState<AddressValidationResult | null>(null)
  const [validating, setValidating] = useState(false)

  // Bitcoin Miniscript Descriptor Builder state
  const [ownerKey, setOwnerKey] = useState('[d34db33f/48h/0h/0h/2h]xpub6OwnerPrimaryKey.../0/*')
  const [heirKeys, setHeirKeys] = useState<string[]>([
    '[a1b2c3d4/48h/0h/0h/2h]xpub6HeirSpouseKey.../0/*',
    '[f0e1d2c3/48h/0h/0h/2h]xpub6HeirExecutorKey.../0/*',
  ])
  const [heirThreshold, setHeirThreshold] = useState(2)
  const [timelockBlocks, setTimelockBlocks] = useState(26280)
  const [lockMode, setLockMode] = useState<'csv' | 'cltv'>('csv')
  const [network, setNetwork] = useState<'mainnet' | 'testnet'>('mainnet')
  const [descriptor, setDescriptor] = useState<TimelockDescriptorResponse | null>(null)
  const [building, setBuilding] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const handleValidate = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!address.trim()) {
      toast('Enter an address to verify', 'error')
      return
    }
    try {
      setValidating(true)
      const res = await cryptoApi.validateAddress(chain, address.trim())
      setValResult(res)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Validation error', 'error')
    } finally {
      setValidating(false)
    }
  }

  const handleBuildDescriptor = async (e?: React.FormEvent) => {
    e?.preventDefault()
    try {
      setBuilding(true)
      const res = await cryptoApi.timelockDescriptor({
        owner_key: ownerKey.trim() || undefined,
        heir_keys: heirKeys.map((k) => k.trim()).filter(Boolean),
        heir_threshold: Math.min(Math.max(1, heirThreshold), Math.max(1, heirKeys.length)),
        timelock_blocks: Math.max(1, timelockBlocks),
        lock_mode: lockMode,
        network,
      })
      setDescriptor(res)
      toast('BIP-380 Miniscript descriptor compiled with checksum', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to build descriptor', 'error')
    } finally {
      setBuilding(false)
    }
  }

  const copyText = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1600)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a87b24]">
          Cryptographic Workbench
        </p>
        <h1 className="font-serif-display mt-1 text-3xl font-semibold text-[#13161b]">
          Multi-Chain Verifier &amp; Bitcoin Miniscript Lab
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-[#575d68]">
          Verify cryptographic checksums across Bitcoin (Bech32, Bech32m, Base58Check), Monero (CryptoNote Keccak-256), and Stacks (c32check), and compile Sparrow/Liana-ready BIP-380 Bitcoin inheritance descriptors.
        </p>
      </div>

      {/* Section 1: Multi-Chain Address Checksum Verifier */}
      <section className="lv-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[#a87b24]" />
          <h2 className="font-serif-display text-xl font-semibold text-[#13161b]">
            Multi-Chain Address Checksum Verifier
          </h2>
        </div>

        <form onSubmit={handleValidate} className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(['btc', 'xmr', 'stx'] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setChain(c)
                  setAddress(SAMPLE_ADDRESSES[c][0].value)
                  setValResult(null)
                }}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  chain === c
                    ? 'bg-[#13161b] text-[#f6f4ef]'
                    : 'border border-[#e3ddd1] bg-[#faf8f4] text-[#4b505a] hover:border-[#a87b24]'
                }`}
              >
                {c === 'btc' ? 'Bitcoin (BTC)' : c === 'xmr' ? 'Monero (XMR)' : 'Stacks (STX)'}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              data-testid="crypto-lab-address-input"
              placeholder="Paste a BTC, XMR, or STX address…"
              className="lv-input flex-1 font-mono-code text-xs"
            />
            <Button type="submit" variant="primary" disabled={validating} data-testid="crypto-lab-verify-btn">
              {validating ? 'Verifying…' : 'Verify Checksum'}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-[#575d68]">
            <span>Sample vectors:</span>
            {SAMPLE_ADDRESSES[chain].map((sample) => (
              <button
                key={sample.label}
                type="button"
                onClick={() => {
                  setAddress(sample.value)
                  setValResult(null)
                }}
                className="rounded border border-[#e3ddd1] bg-white px-2 py-0.5 text-[11px] hover:border-[#a87b24] hover:text-[#13161b]"
              >
                {sample.label}
              </button>
            ))}
          </div>
        </form>

        {valResult && (
          <div
            data-testid="crypto-lab-validation-result"
            className={`mt-5 rounded-xl border p-4 ${
              valResult.valid
                ? 'border-[#136f4a]/30 bg-[#f2faf6]'
                : 'border-[#b91c1c]/30 bg-[#fef2f2]'
            }`}
          >
            <div className="flex items-start gap-3">
              {valResult.valid ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#136f4a]" />
              ) : (
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#b91c1c]" />
              )}
              <div>
                <p className="text-sm font-semibold text-[#13161b]">{valResult.message}</p>
                <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-[#4b505a]">
                  <span>
                    Chain: <strong className="uppercase">{valResult.chain}</strong>
                  </span>
                  {valResult.network && (
                    <span>
                      Network: <strong className="capitalize">{valResult.network}</strong>
                    </span>
                  )}
                  {valResult.address_type && (
                    <span>
                      Type: <strong>{valResult.address_type}</strong>
                    </span>
                  )}
                  <span>
                    Cryptographic Checksum:{' '}
                    <strong>{valResult.checksum_verified ? 'Verified' : 'Failed'}</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Section 2: Bitcoin Miniscript / Timelock Output Descriptor Builder */}
      <section className="lv-card p-6">
        <div className="mb-5 flex items-center gap-2">
          <Cpu className="h-5 w-5 text-[#a87b24]" />
          <div>
            <h2 className="font-serif-display text-xl font-semibold text-[#13161b]">
              Bitcoin Inheritance Timelock &amp; Miniscript Descriptor Builder
            </h2>
            <p className="text-xs text-[#575d68]">
              Compiles owner-priority + timelocked M-of-N heir recovery policies into BIP-380 WSH and Taproot descriptors with verified checksums.
            </p>
          </div>
        </div>

        <form onSubmit={handleBuildDescriptor} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#4b505a]">
                Owner Primary Key / xpub
              </label>
              <input
                type="text"
                value={ownerKey}
                onChange={(e) => setOwnerKey(e.target.value)}
                className="lv-input font-mono-code text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#4b505a]">
                  Timelock Opcode
                </label>
                <select
                  value={lockMode}
                  onChange={(e) => setLockMode(e.target.value as 'csv' | 'cltv')}
                  className="lv-input text-sm"
                >
                  <option value="csv">Relative CSV (older / BIP-112)</option>
                  <option value="cltv">Absolute CLTV (after / BIP-65)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#4b505a]">
                  Network
                </label>
                <select
                  value={network}
                  onChange={(e) => setNetwork(e.target.value as 'mainnet' | 'testnet')}
                  className="lv-input text-sm"
                >
                  <option value="mainnet">Bitcoin Mainnet</option>
                  <option value="testnet">Bitcoin Testnet / Signet</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#4b505a]">
                  Heir Recovery Keys ({heirKeys.length})
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setHeirKeys((prev) => [
                      ...prev,
                      `[0000000${prev.length + 1}/48h/0h/0h/2h]xpub6Heir${prev.length + 1}Key.../0/*`,
                    ])
                  }
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#a87b24] hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Heir Key
                </button>
              </div>
              <div className="space-y-2">
                {heirKeys.map((hk, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={hk}
                      onChange={(e) =>
                        setHeirKeys((prev) => prev.map((v, i) => (i === idx ? e.target.value : v)))
                      }
                      className="lv-input flex-1 font-mono-code text-xs"
                    />
                    {heirKeys.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setHeirKeys((prev) => prev.filter((_, i) => i !== idx))}
                        className="rounded p-2 text-[#b91c1c] hover:bg-[#fef2f2]"
                        aria-label="Remove heir key"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#4b505a]">
                  Heir Signing Threshold: {Math.min(heirThreshold, heirKeys.length)}-of-{heirKeys.length}
                </label>
                <input
                  type="range"
                  min={1}
                  max={Math.max(1, heirKeys.length)}
                  value={Math.min(heirThreshold, heirKeys.length)}
                  onChange={(e) => setHeirThreshold(parseInt(e.target.value, 10))}
                  className="w-full accent-[#a87b24]"
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#4b505a]">
                    Timelock Delay (Blocks)
                  </label>
                  <span className="text-xs font-medium text-[#a87b24]">
                    ≈ {(timelockBlocks / 144).toFixed(1)} days
                  </span>
                </div>
                <input
                  type="number"
                  min={1}
                  value={timelockBlocks}
                  onChange={(e) => setTimelockBlocks(parseInt(e.target.value, 10) || 144)}
                  className="lv-input font-mono-code text-sm"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {TIMELOCK_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setTimelockBlocks(p.blocks)}
                      className="rounded border border-[#e3ddd1] bg-[#faf8f4] px-2.5 py-1 text-[11px] font-medium text-[#374151] hover:border-[#a87b24]"
                    >
                      {p.label} ({p.blocks.toLocaleString()})
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Button type="submit" variant="gold" disabled={building} data-testid="compile-descriptor-btn">
            {building ? 'Compiling Descriptor…' : 'Compile BIP-380 Miniscript Descriptor'}
          </Button>
        </form>

        {descriptor && (
          <div className="mt-6 space-y-4" data-testid="descriptor-output">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-[#e3ddd1] bg-[#faf8f4] p-3.5">
                <p className="text-[11px] uppercase tracking-wider text-[#7c7465]">Estimated Duration</p>
                <p className="mt-0.5 text-lg font-semibold text-[#13161b]">
                  ~{descriptor.estimated_days} days ({descriptor.timelock_blocks.toLocaleString()} blocks)
                </p>
              </div>
              <div className="rounded-lg border border-[#e3ddd1] bg-[#faf8f4] p-3.5">
                <p className="text-[11px] uppercase tracking-wider text-[#7c7465]">Witness Weight</p>
                <p className="mt-0.5 text-lg font-semibold text-[#13161b]">
                  ~{descriptor.estimated_witness_vbytes} vBytes
                </p>
              </div>
              <div className="rounded-lg border border-[#e3ddd1] bg-[#faf8f4] p-3.5">
                <p className="text-[11px] uppercase tracking-wider text-[#7c7465]">Projected Unlock</p>
                <p className="mt-0.5 text-sm font-semibold text-[#13161b]">
                  {new Date(descriptor.estimated_unlock_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {[
              { key: 'policy', label: 'Miniscript Policy', value: descriptor.policy },
              { key: 'wsh', label: 'SegWit WSH Descriptor (BIP-380 + Checksum)', value: descriptor.wsh_descriptor },
              { key: 'tr', label: 'Taproot Descriptor (BIP-386 + Checksum)', value: descriptor.taproot_descriptor },
              { key: 'asm', label: 'Bitcoin Script ASM', value: descriptor.script_asm },
            ].map((item) => (
              <div key={item.key} className="lv-card-obsidian p-4">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#d6b15e]">
                    {item.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(item.key, item.value)}
                    className="inline-flex items-center gap-1 text-xs text-[#d6b15e] hover:underline"
                  >
                    {copiedKey === item.key ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedKey === item.key ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <pre className="whitespace-pre-wrap break-all font-mono-code text-xs text-[#f4f1ea]">
                  {item.value}
                </pre>
              </div>
            ))}

            <div className="rounded-xl border border-[#e3ddd1] bg-[#faf8f4] p-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#4b505a]">
                Hardware Wallet Deployment &amp; Recovery Steps
              </h3>
              <ol className="list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-[#374151]">
                {descriptor.recovery_steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
