'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { ShieldCheck } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuth()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      toast('Please enter your email', 'error')
      return
    }
    if (password.length < 8) {
      toast('Password must be at least 8 characters', 'error')
      return
    }
    setLoading(true)
    try {
      await register(email.trim(), password, name.trim())
      toast('Account created. Welcome to Legacy Vault.', 'success')
      router.push('/')
      router.refresh()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Registration failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-[#f6f4ef]">
      <div className="hidden lg:flex lg:col-span-6 flex-col justify-between bg-[#13161b] p-12 text-[#f4f1ea]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#2d3440] bg-[#1b2028] text-[#d6b15e]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="font-serif-display text-xl font-semibold">Legacy Vault</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#9ca3af]">
              Sovereign Multi-Chain Custody
            </p>
          </div>
        </div>
        <div className="max-w-md space-y-4">
          <h2 className="font-serif-display text-4xl font-semibold leading-tight">
            Establish your family&apos;s cryptographic continuity.
          </h2>
          <p className="text-sm leading-relaxed text-[#a6adb8]">
            Create a private vault account to design verifiable Bitcoin Miniscript timelocks, schedule proof-of-life check-ins, and compile zero-knowledge heir dossiers.
          </p>
        </div>
        <p className="text-xs text-[#6f7785]">
          Argon2id password hashing · HttpOnly session cookies · Zero-knowledge notes
        </p>
      </div>

      <div className="lg:col-span-6 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:text-left">
            <h1 className="font-serif-display text-3xl font-semibold text-[#13161b]">
              Create Account
            </h1>
            <p className="mt-1.5 text-sm text-[#575d68]">
              Start planning your multi-chain estate in under two minutes.
            </p>
          </div>

          <div className="lv-card p-7">
            <h2 className="mb-5 text-lg font-semibold text-[#13161b]">Register</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="register-email"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#4b505a]"
                >
                  Email
                </label>
                <input
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="register-email"
                  aria-label="Email"
                  className="lv-input"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label
                  htmlFor="register-name"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#4b505a]"
                >
                  Name (Optional)
                </label>
                <input
                  id="register-name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  data-testid="register-name"
                  aria-label="Name"
                  className="lv-input"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label
                  htmlFor="register-password"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#4b505a]"
                >
                  Password
                </label>
                <input
                  id="register-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="register-password"
                  aria-label="Password"
                  className="lv-input"
                  placeholder="At least 8 characters"
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                className="w-full py-2.5"
                data-testid="register-submit"
                aria-label="Register"
              >
                {loading ? 'Creating account…' : 'Create Account'}
              </Button>
            </form>

            <p className="mt-5 text-center text-sm text-[#575d68]">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-[#a87b24] hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
