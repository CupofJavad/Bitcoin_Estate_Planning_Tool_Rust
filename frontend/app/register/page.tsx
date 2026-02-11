'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
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
      await register(email.trim(), password, name.trim() || email.trim())
      router.push('/')
      router.refresh()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Registration failed', 'error')
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
          <h2 className="text-lg font-semibold text-[#0f172a] mb-4">Create an account</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reg-email" className="block text-sm font-medium text-[#334155] mb-1">
                Email
              </label>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="register-email"
                aria-label="Email"
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="reg-name" className="block text-sm font-medium text-[#334155] mb-1">
                Name (optional)
              </label>
              <input
                id="reg-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="register-name"
                aria-label="Name (optional)"
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent"
                placeholder="Your name"
              />
            </div>
            <div>
              <label htmlFor="reg-password" className="block text-sm font-medium text-[#334155] mb-1">
                Password (min 8 characters)
              </label>
              <input
                id="reg-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="register-password"
                aria-label="Password"
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full" data-testid="register-submit" aria-label="Register">
              {loading ? 'Creating account...' : 'Register'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-[#334155]">
            Already have an account?{' '}
            <Link href="/login" className="text-[#0ea5e9] hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
