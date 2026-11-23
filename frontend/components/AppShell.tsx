'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { API_DOCS_URL } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  Shield,
  Cpu,
  KeyRound,
  User,
  ShieldAlert,
  LogOut,
  FileCode2,
} from 'lucide-react'

const HIDE_SHELL_PATHS = ['/login', '/register']

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  if (!user || HIDE_SHELL_PATHS.some((p) => pathname?.startsWith(p))) {
    return <>{children}</>
  }

  const navItems = [
    { href: '/', label: 'Vault Overview', icon: Shield, exact: true },
    { href: '/tools/crypto', label: 'Crypto & Miniscript Lab', icon: Cpu, exact: false },
    { href: '/tools/sharding', label: 'Key Sharding (SSS)', icon: KeyRound, exact: false },
    { href: '/account', label: 'Account', icon: User, exact: false },
  ]

  if (user.role === 'admin') {
    navItems.push({ href: '/admin', label: 'Admin', icon: ShieldAlert, exact: false })
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="no-print sticky top-0 z-30 border-b border-[#e3ddd1] bg-[#ffffff]/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-7">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#13161b] text-[#d6b15e] shadow-sm transition-transform duration-150 group-hover:scale-[1.03]">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 2L4 5.5v6.2c0 5.1 3.4 9.7 8 11.3 4.6-1.6 8-6.2 8-11.3V5.5L12 2z" />
                  <circle cx="12" cy="11" r="2.2" />
                  <path d="M12 13.2V16" />
                </svg>
              </div>
              <div className="leading-tight">
                <span className="font-serif-display block text-lg font-semibold text-[#13161b]">
                  Legacy Vault
                </span>
                <span className="block text-[10px] font-medium uppercase tracking-[0.14em] text-[#7c7465]">
                  Multi-Chain Custody
                </span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1" aria-label="Primary navigation">
              {navItems.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname?.startsWith(item.href)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-[#13161b] text-[#f6f4ef]'
                        : 'text-[#4b505a] hover:bg-[#f0ece3] hover:text-[#13161b]'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={API_DOCS_URL}
              target="_blank"
              rel="noreferrer"
              className="hidden lg:inline-flex items-center gap-1 text-xs font-medium text-[#575d68] hover:text-[#a87b24] transition-colors"
              title="OpenAPI 3.1 Reference"
            >
              <FileCode2 className="h-3.5 w-3.5" />
              API Docs
            </a>
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-[#e3ddd1] bg-[#f6f4ef] px-3 py-1 text-xs text-[#3b4048]">
              <span className="h-2 w-2 rounded-full bg-[#136f4a]" />
              <span className="max-w-[160px] truncate font-medium">{user.email}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logout().then(() => window.location.assign('/login'))}
              data-testid="nav-signout"
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5" />
              Sign out
            </Button>
          </div>
        </div>

        {/* Mobile navigation strip */}
        <div className="flex md:hidden items-center gap-1 overflow-x-auto border-t border-[#ece6da] px-4 py-2">
          {navItems.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname?.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${
                  active
                    ? 'bg-[#13161b] text-[#f6f4ef]'
                    : 'text-[#4b505a] hover:bg-[#f0ece3]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </header>
      {children}
    </div>
  )
}
