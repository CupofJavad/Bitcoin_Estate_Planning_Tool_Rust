'use client'

import { useEffect, useState } from 'react'
import { cryptoApi, type AddressValidationResult } from '@/lib/api'
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'

interface AddressInputProps {
  id: string
  chain: 'btc' | 'xmr' | 'stx'
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
}

export function AddressInput({
  id,
  chain,
  label,
  placeholder,
  value,
  onChange,
}: AddressInputProps) {
  const [result, setResult] = useState<AddressValidationResult | null>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    const trimmed = value.trim()
    if (!trimmed) {
      setResult(null)
      setChecking(false)
      return
    }
    setChecking(true)
    const timer = setTimeout(() => {
      cryptoApi
        .validateAddress(chain, trimmed)
        .then((res) => setResult(res))
        .catch(() => setResult(null))
        .finally(() => setChecking(false))
    }, 320)
    return () => clearTimeout(timer)
  }, [chain, value])

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wider text-[#4b505a]">
          {label}
        </label>
        {checking && (
          <span className="inline-flex items-center gap-1 text-[11px] text-[#7c7465]">
            <Loader2 className="h-3 w-3 animate-spin" />
            Verifying checksum…
          </span>
        )}
        {!checking && result?.valid && (
          <span
            className="inline-flex items-center gap-1 text-[11px] font-medium text-[#136f4a]"
            data-testid={`address-valid-${chain}`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {result.network} · {result.address_type}
          </span>
        )}
        {!checking && result && !result.valid && (
          <span
            className="inline-flex items-center gap-1 text-[11px] font-medium text-[#b91c1c]"
            data-testid={`address-invalid-${chain}`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Checksum warning
          </span>
        )}
      </div>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`lv-input font-mono-code text-xs ${
          result
            ? result.valid
              ? 'border-[#136f4a]/60 bg-[#f6fbf8]'
              : 'border-[#b91c1c]/50 bg-[#fef7f7]'
            : ''
        }`}
      />
      {!checking && result && !result.valid && (
        <p className="mt-1 text-xs text-[#b91c1c]">{result.message}</p>
      )}
    </div>
  )
}
