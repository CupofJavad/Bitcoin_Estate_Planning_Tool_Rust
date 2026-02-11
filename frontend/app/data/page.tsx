'use client'

import Link from 'next/link'

export default function DataPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/" className="text-[#0ea5e9] hover:underline text-sm mb-6 inline-block">
          ← Back to Legacy Vault
        </Link>
        <h1 className="text-3xl font-bold text-[#0f172a] mb-4">How We Handle Your Data</h1>
        <p className="text-[#334155] mb-8">
          A short summary. For full details, see our{' '}
          <Link href="/privacy" className="text-[#0ea5e9] hover:underline">Privacy Policy</Link> and{' '}
          <Link href="/terms" className="text-[#0ea5e9] hover:underline">Terms of Service</Link>.
        </p>

        <div className="prose prose-slate max-w-none text-[#334155] space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-[#0f172a] mt-6 mb-2">What we collect</h2>
            <p>
              We store your account details (email, name, secure password), the estate plans and beneficiaries you
              create, and technical data needed to run the service (e.g. sessions, security logs). We do not sell your
              data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#0f172a] mt-6 mb-2">How long we keep it</h2>
            <p>
              Account and plan data: while your account is active, then up to 30 days after you ask us to delete your
              account. Security and audit logs: up to 12 months. Sessions: until they expire or you log out.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#0f172a] mt-6 mb-2">How we protect it</h2>
            <p>
              We use industry-standard practices: passwords are hashed, sessions are secure, and we use HTTPS in
              production. We do not log passwords or sensitive plan content. For incidents, we follow our runbook and
              will notify you where required by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#0f172a] mt-6 mb-2">Your rights</h2>
            <p>
              You can access, correct, and delete your data through your account and our support channel. You may
              also request a copy of your data (e.g. export of your plans). If you are in the EEA or UK, you may have
              the right to lodge a complaint with a supervisory authority; see our{' '}
              <Link href="/privacy" className="text-[#0ea5e9] hover:underline">Privacy Policy</Link> for full rights.
            </p>
          </section>

          <p className="text-sm mt-8 pt-4 border-t border-[#e2e8f0]">
            Questions? <Link href="/contact" className="text-[#0ea5e9] hover:underline">Contact support</Link>.
          </p>
        </div>
      </div>
    </div>
  )
}
