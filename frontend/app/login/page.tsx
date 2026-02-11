'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'

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
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center px-4 overflow-y-auto">
      <div className="w-full max-w-md py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#0f172a]">Legacy Vault</h1>
          <p className="text-[#334155] mt-1 text-sm">Secure your crypto for those who come next.</p>
        </div>
        <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-6">
          <h2 className="text-lg font-semibold text-[#0f172a] mb-4">Sign in</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-[#334155] mb-1">
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
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-[#334155] mb-1">
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
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full" data-testid="login-submit" aria-label="Sign in">
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-[#334155]">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-[#0ea5e9] hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
