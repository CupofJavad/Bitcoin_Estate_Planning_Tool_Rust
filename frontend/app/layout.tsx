import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Bitcoin Estate Planning Platform',
  description: 'Bitcoin-native estate planning with timelock policies and beneficiary management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

