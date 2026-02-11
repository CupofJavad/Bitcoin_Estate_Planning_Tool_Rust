'use client'

import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/" className="text-[#0ea5e9] hover:underline text-sm mb-6 inline-block">
          ← Back to Legacy Vault
        </Link>
        <h1 className="text-3xl font-bold text-[#0f172a] mb-4">Privacy Policy</h1>
        <p className="text-sm text-[#334155] mb-8">
          Last updated: February 2026. This policy describes how we collect, use, retain, and protect your data when
          you use Legacy Vault.
        </p>

        <div className="prose prose-slate max-w-none text-[#334155] space-y-6">
          {/* Controller identity */}
          <section>
            <h2 className="text-xl font-semibold text-[#0f172a] mt-6 mb-2">1. Who Is Responsible for Your Data</h2>
            <p>
              <strong>Legacy Vault</strong> (the product and, where applicable, the entity operating it) is the data
              controller for the personal data we process in connection with the service. For questions or to exercise
              your rights, use our <Link href="/contact" className="text-[#0ea5e9] hover:underline">Contact &amp; support</Link> page (e.g. support email or contact form).
            </p>
          </section>

          {/* What we collect and why */}
          <section>
            <h2 className="text-xl font-semibold text-[#0f172a] mt-6 mb-2">2. What Data We Collect and Why</h2>
            <p>We collect and process the following for the purposes listed:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Account data</strong> (e.g. email, display name, password hash): to create and manage your
                account, authenticate you, and perform our contract with you.
              </li>
              <li>
                <strong>Estate plans and beneficiary information</strong> (e.g. plans, beneficiary details, addresses,
                timelock or inheritance instructions): to provide the estate planning and documentation features and
                to store the information you choose to record.
              </li>
              <li>
                <strong>Session and technical data</strong> (e.g. session tokens, IP address, request logs): to operate
                the service, enforce security, and troubleshoot issues (legitimate interest / contract performance).
              </li>
              <li>
                <strong>Audit logs</strong> (e.g. security-relevant events, access and changes): for security,
                compliance, and incident response (legitimate interest or legal obligation where applicable).
              </li>
            </ul>
            <p>We do not sell your personal data. We use your data only for the purposes described above.</p>
          </section>

          {/* Retention — aligned with GTM_PLAN §1.5.2 */}
          <section>
            <h2 className="text-xl font-semibold text-[#0f172a] mt-6 mb-2">3. How Long We Keep Your Data</h2>
            <p>We retain data only as long as necessary for the purposes set out below:</p>
            <table className="w-full border border-[#e2e8f0] text-sm mt-2">
              <thead>
                <tr className="bg-[#f8fafc]">
                  <th className="border border-[#e2e8f0] px-3 py-2 text-left font-medium text-[#0f172a]">Data category</th>
                  <th className="border border-[#e2e8f0] px-3 py-2 text-left font-medium text-[#0f172a]">Retention</th>
                  <th className="border border-[#e2e8f0] px-3 py-2 text-left font-medium text-[#0f172a]">Purpose / basis</th>
                </tr>
              </thead>
              <tbody className="text-[#334155]">
                <tr>
                  <td className="border border-[#e2e8f0] px-3 py-2">Account data</td>
                  <td className="border border-[#e2e8f0] px-3 py-2">While account is active, then up to 30 days after you request deletion</td>
                  <td className="border border-[#e2e8f0] px-3 py-2">Contract; then erasure</td>
                </tr>
                <tr>
                  <td className="border border-[#e2e8f0] px-3 py-2">Audit logs</td>
                  <td className="border border-[#e2e8f0] px-3 py-2">12 months (or as required by security/compliance)</td>
                  <td className="border border-[#e2e8f0] px-3 py-2">Legitimate interest / legal</td>
                </tr>
                <tr>
                  <td className="border border-[#e2e8f0] px-3 py-2">Sessions</td>
                  <td className="border border-[#e2e8f0] px-3 py-2">Until expiry or logout</td>
                  <td className="border border-[#e2e8f0] px-3 py-2">Contract performance</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-2">
              When you request account deletion, we will delete or anonymize your account and associated data (e.g.
              estate plans, beneficiaries) within the retention window above, except where we must keep data for legal
              or security reasons.
            </p>
          </section>

          {/* Data subject rights */}
          <section>
            <h2 className="text-xl font-semibold text-[#0f172a] mt-6 mb-2">4. Your Rights (Including Under GDPR)</h2>
            <p>Depending on where you live (including in the European Economic Area), you may have the right to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Access</strong> — request a copy of the personal data we hold about you. You can view much of
                this in the app (profile, estate plans, beneficiaries).
              </li>
              <li>
                <strong>Rectification</strong> — ask us to correct inaccurate or incomplete data (e.g. via account
                settings or support).
              </li>
              <li>
                <strong>Erasure</strong> — request deletion of your data (e.g. by closing your account; we process
                deletion as described in Section 3).
              </li>
              <li>
                <strong>Data portability</strong> — receive your data in a structured, machine-readable format (e.g.
                export of your estate plans and beneficiaries as JSON, where we provide this feature).
              </li>
              <li>
                <strong>Restriction and objection</strong> — in certain cases, request that we restrict processing or
                object to processing based on legitimate interests.
              </li>
              <li>
                <strong>Complaint</strong> — lodge a complaint with a supervisory authority in your country (e.g. your
                national data protection authority).
              </li>
            </ul>
            <p>
              To exercise these rights, use your account settings where available or contact us via the support channel.
              We will respond within the timeframes required by applicable law (e.g. one month under GDPR, subject to
              extensions where permitted).
            </p>
          </section>

          {/* Cookies and analytics */}
          <section>
            <h2 className="text-xl font-semibold text-[#0f172a] mt-6 mb-2">5. Cookies and Analytics</h2>
            <p>
              We may use cookies or similar technologies for essential operation of the service (e.g. session
              management). If we add non-essential cookies or analytics (e.g. usage analytics, marketing), we will list
              them here and obtain your consent where required (e.g. granular opt-in under GDPR, with consent logged
              and timestamped). We will not use pre-ticked boxes for non-essential cookies. Check this page and our
              cookie notice (if we add one) for the current list.
            </p>
          </section>

          {/* International transfers */}
          <section>
            <h2 className="text-xl font-semibold text-[#0f172a] mt-6 mb-2">6. International Transfers</h2>
            <p>
              Your data may be processed in the country where our servers or service providers are located. If that
              country is outside the European Economic Area or another jurisdiction that has been deemed to provide
              adequate protection, we will ensure appropriate safeguards are in place (e.g. standard contractual
              clauses approved by the European Commission or equivalent) and will describe them here or in a separate
              notice. If you have questions about transfers, contact us using the details in Section 1.
            </p>
          </section>

          <p className="text-sm mt-8 pt-4 border-t border-[#e2e8f0]">
            For terms of use, see our <Link href="/terms" className="text-[#0ea5e9] hover:underline">Terms of Service</Link>.
          </p>
        </div>
      </div>
    </div>
  )
}
