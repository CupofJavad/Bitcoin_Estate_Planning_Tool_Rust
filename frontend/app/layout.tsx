import type { Metadata } from 'next'
import { Newsreader, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { GlobalToasts } from '@/components/GlobalToasts'
import { AuthProvider } from '@/context/AuthContext'
import { AuthGate } from '@/components/AuthGate'
import { AppShell } from '@/components/AppShell'
import { Footer } from '@/components/Footer'

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
})

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: 'Legacy Vault — Sovereign Multi-Chain Estate Planning',
  description:
    'Institutional-grade multi-chain inheritance planning for Bitcoin (BTC), Monero (XMR), and Stacks (STX) with BIP-380 Miniscript timelocks, proof-of-life heartbeats, zero-knowledge vault notes, and offline Shamir key sharding.',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    title: 'Legacy Vault — Sovereign Multi-Chain Estate Planning',
    description:
      'Secure your Bitcoin, Monero, and Stacks legacy with cryptographic verification, timelock descriptors, and zero-knowledge heir dossiers.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${plusJakarta.variable} ${jetbrainsMono.variable}`}
    >
      <body className="flex min-h-screen flex-col bg-[#f6f4ef] text-[#16181d]">
        <AuthProvider>
          <AuthGate>
            <AppShell>
              <main className="flex-1">{children}</main>
            </AppShell>
            <Footer />
          </AuthGate>
        </AuthProvider>
        <GlobalToasts />
      </body>
    </html>
  )
}
