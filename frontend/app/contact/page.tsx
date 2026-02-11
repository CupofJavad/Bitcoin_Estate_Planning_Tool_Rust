'use client'

import Link from 'next/link'

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/" className="text-[#0ea5e9] hover:underline text-sm mb-6 inline-block">
          ← Back to Legacy Vault
        </Link>
        <h1 className="text-3xl font-bold text-[#0f172a] mb-4">Contact & Support</h1>
        <p className="text-[#334155] mb-8">
          For account questions, privacy requests, or technical support, use the channel below. We aim to respond
          within <strong>48–72 hours</strong> for non-urgent requests. For security or data incidents, we will
          prioritise and follow our incident response process.
        </p>

        <div className="prose prose-slate max-w-none text-[#334155] space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-[#0f172a] mt-6 mb-2">Support channel</h2>
            <p>
              Email: <a href="mailto:support@legacyvault.example" className="text-[#0ea5e9] hover:underline">support@legacyvault.example</a>
              <br />
              <span className="text-sm text-[#64748b]">
                (Replace with your actual support email before launch. See DEPLOY.md §8.)
              </span>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#0f172a] mt-6 mb-2">What to include</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Your registered email (so we can find your account).</li>
              <li>Brief description of the issue or request (e.g. account deletion, data export, bug report).</li>
              <li>For privacy requests (access, correction, deletion, export), we will respond within the timeframes required by law (e.g. one month under GDPR where applicable).</li>
            </ul>
            <p className="text-sm text-[#64748b] mt-2">
              To lodge a complaint with a data protection authority (e.g. in the EEA), see our{' '}
              <Link href="/privacy" className="text-[#0ea5e9] hover:underline">Privacy Policy</Link> §4.
            </p>
          </section>

          <p className="text-sm mt-8 pt-4 border-t border-[#e2e8f0]">
            <Link href="/privacy" className="text-[#0ea5e9] hover:underline">Privacy Policy</Link>
            {' · '}
            <Link href="/terms" className="text-[#0ea5e9] hover:underline">Terms of Service</Link>
            {' · '}
            <Link href="/data" className="text-[#0ea5e9] hover:underline">How we handle your data</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
