'use client'

import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/" className="text-[#0ea5e9] hover:underline text-sm mb-6 inline-block">
          ← Back to Legacy Vault
        </Link>
        <h1 className="text-3xl font-bold text-[#0f172a] mb-4">Terms of Service</h1>
        <p className="text-sm text-[#334155] mb-8">
          Last updated: February 2026. These terms apply to your use of Legacy Vault. We recommend you read them and
          have a legal professional review if you have questions.
        </p>

        <div className="prose prose-slate max-w-none text-[#334155] space-y-6">
          {/* RUFADAA / Digital estate disclaimer */}
          <section>
            <h2 className="text-xl font-semibold text-[#0f172a] mt-6 mb-2">1. What Legacy Vault Is (and Isn&apos;t)</h2>
            <p>
              <strong>Legacy Vault is a planning and documentation tool only; it does not provide legal or fiduciary advice.</strong>{' '}
              You can use it to document your digital estate plans (e.g. Bitcoin, Monero, Stacks addresses, beneficiaries, and
              timelock or inheritance instructions) and to share that information with people you choose. We do not hold,
              custody, or move your assets. Actual transfer of assets and legal authority (wills, trusts, executor
              appointment, access to accounts under laws such as RUFADAA where adopted) must be handled through
              qualified legal and financial professionals and in line with applicable law. You are responsible for
              ensuring your plans are legally sound and for consulting experts where needed.
            </p>
          </section>

          {/* Acceptable use */}
          <section>
            <h2 className="text-xl font-semibold text-[#0f172a] mt-6 mb-2">2. Acceptable Use</h2>
            <p>
              You agree to use Legacy Vault only for lawful purposes and in line with these terms. You must not:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Use the service for any illegal activity or to violate any applicable laws or regulations.</li>
              <li>Impersonate others, provide false information, or create accounts for anyone without their consent.</li>
              <li>Attempt to gain unauthorized access to our systems, other users&apos; accounts, or any data we hold.</li>
              <li>Interfere with or disrupt the service, servers, or networks (e.g. abuse, scraping, denial-of-service).</li>
              <li>Use the service to harass, threaten, or harm others, or to distribute malware or harmful code.</li>
            </ul>
            <p>
              We may suspend or terminate your access if we reasonably believe you have breached these terms or
              acceptable use.
            </p>
          </section>

          {/* Termination and account closure */}
          <section>
            <h2 className="text-xl font-semibold text-[#0f172a] mt-6 mb-2">3. Termination and Account Closure</h2>
            <p>
              <strong>By you:</strong> You may close your account at any time through your account settings or by
              contacting support. When you request account deletion, we will process it in line with our Privacy Policy
              (including retention of account data for up to 30 days after the deletion request for operational and
              security purposes, then erasure).
            </p>
            <p>
              <strong>By us:</strong> We may suspend or terminate your account or access to the service if you breach
              these terms, for security or legal reasons, or if we discontinue the service. We will give you notice where
              reasonably possible unless doing so would compromise security or we are required to act immediately by law.
            </p>
            <p>
              After termination, your right to use the service ends. Provisions that by their nature should survive
              (e.g. disclaimers, limitations of liability, dispute resolution) will continue to apply.
            </p>
          </section>

          {/* Contact and support */}
          <section>
            <h2 className="text-xl font-semibold text-[#0f172a] mt-6 mb-2">4. Contact and Support</h2>
            <p>
              For questions about these terms, your account, or the service, contact us via the support channel
              documented in the app or on our website (e.g. support email or contact form). We will document response
              expectations for customer support separately. For privacy requests (access, correction, deletion, export),
              see our <Link href="/privacy" className="text-[#0ea5e9] hover:underline">Privacy Policy</Link>.
            </p>
          </section>

          {/* Changes to terms */}
          <section>
            <h2 className="text-xl font-semibold text-[#0f172a] mt-6 mb-2">5. Changes to These Terms</h2>
            <p>
              We may update these terms from time to time. We will post the revised terms on this page and update the
              &quot;Last updated&quot; date. If changes are material, we may notify you by email or through the app where
              appropriate. Continued use of Legacy Vault after the changes take effect constitutes acceptance of the
              updated terms. If you do not agree, you should stop using the service and close your account.
            </p>
          </section>

          <p className="text-sm mt-8 pt-4 border-t border-[#e2e8f0]">
            For how we handle your data, see our <Link href="/privacy" className="text-[#0ea5e9] hover:underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  )
}
