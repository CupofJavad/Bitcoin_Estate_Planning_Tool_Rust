'use client'

import Link from 'next/link'

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[#e2e8f0] bg-white/80 py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-2 text-sm text-[#334155]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>Legacy Vault – Secure your crypto for those who come next.</span>
          <span className="flex flex-wrap gap-4">
            <Link href="/terms" className="text-[#0ea5e9] hover:underline">
              Terms
            </Link>
            <Link href="/privacy" className="text-[#0ea5e9] hover:underline">
              Privacy
            </Link>
            <Link href="/data" className="text-[#0ea5e9] hover:underline">
              Data & security
            </Link>
            <Link href="/contact" className="text-[#0ea5e9] hover:underline">
              Contact
            </Link>
          </span>
        </div>
        <p className="text-xs text-[#64748b]">
          Digital estate planning tool only — not legal or fiduciary advice. See{' '}
          <Link href="/terms" className="text-[#0ea5e9] hover:underline">Terms</Link> for details.
        </p>
      </div>
    </footer>
  )
}
