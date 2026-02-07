import type { Metadata } from 'next'
import './globals.css'
import { GlobalToasts } from '@/components/GlobalToasts'

export const metadata: Metadata = {
  title: 'Multi-Chain Estate Planning',
  description: 'Estate planning for BTC, XMR, and STX: beneficiaries, timelock policies, and payout addresses',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <GlobalToasts />
      </body>
    </html>
  )
}

