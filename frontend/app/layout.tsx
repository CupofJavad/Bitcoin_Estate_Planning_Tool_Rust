import type { Metadata } from 'next'
import './globals.css'
import { GlobalToasts } from '@/components/GlobalToasts'
import { AuthProvider } from '@/context/AuthContext'
import { AuthGate } from '@/components/AuthGate'
import { Footer } from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Legacy Vault – Multi-Chain Estate Planning',
  description: 'Secure your crypto for those who come next. Plan beneficiaries and timelock policies for Bitcoin, Monero, and Stacks.',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    title: 'Legacy Vault – Multi-Chain Estate Planning',
    description: 'Secure your crypto for those who come next. Plan beneficiaries and timelock policies for Bitcoin, Monero, and Stacks.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <AuthProvider>
          <AuthGate>
            <main className="flex-1">{children}</main>
            <Footer />
          </AuthGate>
        </AuthProvider>
        <GlobalToasts />
      </body>
    </html>
  )
}

