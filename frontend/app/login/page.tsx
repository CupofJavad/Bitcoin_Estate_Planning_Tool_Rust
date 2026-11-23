'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { ShieldCheck, Lock, Cpu, KeyRound } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      toast('Please enter email and password', 'error')
      return
    }
    setLoading(true)
    try {
      await login(email.trim(), password)
      router.push('/')
      router.refresh()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Login failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-[#f6f4ef]">
      {/* Left Institutional Custody Panel */}
      <div className="hidden lg:flex lg:col-span-6 flex-col justify-between bg-[#13161b] p-12 text-[#f4f1ea]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#2d3440] bg-[#1b2028] text-[#d6b15e]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="font-serif-display text-xl font-semibold tracking-tight">Legacy Vault</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#9ca3af]">
              Sovereign Multi-Chain Custody
            </p>
          </div>
        </div>

        <div className="max-w-md space-y-6">
          <h2 className="font-serif-display text-4xl font-semibold leading-tight text-[#f6f4ef]">
            Secure your crypto for those who come next.
          </h2>
          <p className="text-sm leading-relaxed text-[#a6adb8]">
            Institutional-grade inheritance engineering for Bitcoin (BTC), Monero (XMR), and Stacks (STX) — built on verifiable cryptography, never custodial compromises.
          </p>

          <div className="space-y-3.5 pt-2">
            <div className="flex items-start gap-3">
              <Cpu className="mt-0.5 h-4 w-4 shrink-0 text-[#d6b15e]" />
              <div className="text-xs leading-relaxed text-[#c6ccd6]">
                <strong className="text-[#f4f1ea]">BIP-380 Miniscript &amp; Checksums</strong> — Verified Bech32m Taproot, Monero Keccak-256, Stacks c32check, and timelock output descriptors.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[#d6b15e]" />
              <div className="text-xs leading-relaxed text-[#c6ccd6]">
                <strong className="text-[#f4f1ea]">Zero-Knowledge Vault Notes</strong> — Client-side PBKDF2 + AES-256-GCM heir instructions that never reach the server in plaintext.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-[#d6b15e]" />
              <div className="text-xs leading-relaxed text-[#c6ccd6]">
                <strong className="text-[#f4f1ea]">Offline GF(2⁸) Shamir Sharding</strong> — Split recovery secrets across M-of-N trusted heirs and custodians with printable cards.
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-[#6f7785]">
          Non-custodial architecture · Powered by Rust/Axum + PostgreSQL
        </p>
      </div>

      {/* Right Sign-in Form */}
      <div className="lg:col-span-6 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:text-left">
            <h1 className="font-serif-display text-3xl font-semibold text-[#13161b]">
              Legacy Vault
            </h1>
            <p className="mt-1.5 text-sm text-[#575d68]">
              Sign in to manage your sovereign estate vaults and proof-of-life schedule.
            </p>
          </div>

          <div className="lv-card p-7">
            <h2 className="mb-5 text-lg font-semibold text-[#13161b]">Sign in</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="login-email"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#4b505a]"
                >
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="login-email"
                  aria-label="Email"
                  className="lv-input"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label
                  htmlFor="login-password"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#4b505a]"
                >
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="login-password"
                  aria-label="Password"
                  className="lv-input"
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                className="w-full py-2.5"
                data-testid="login-submit"
                aria-label="Sign in"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>

            <p className="mt-5 text-center text-sm text-[#575d68]">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-semibold text-[#a87b24] hover:underline">
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
