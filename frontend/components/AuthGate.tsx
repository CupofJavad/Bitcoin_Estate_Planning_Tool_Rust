'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'

const PUBLIC_PATHS = ['/login', '/register', '/terms', '/privacy', '/data', '/contact']

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return
    if (user) return
    if (PUBLIC_PATHS.some((p) => pathname?.startsWith(p))) return
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  }, [loading, user, pathname])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0ea5e9] mx-auto mb-4" />
          <p className="text-[#334155]">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user && pathname && !PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0ea5e9] mx-auto mb-4" />
          <p className="text-[#334155]">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
