import Link from 'next/link'

export function Footer() {
  return (
    <footer className="no-print border-t border-[#e3ddd1] bg-[#f0ece3]/60 py-6 text-xs text-[#575d68]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-center sm:text-left">
          <strong className="font-semibold text-[#13161b]">Legacy Vault</strong> — Non-custodial estate planning software. Not legal, tax, or financial advice.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/terms" className="hover:text-[#a87b24] transition-colors">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-[#a87b24] transition-colors">
            Privacy
          </Link>
          <Link href="/data" className="hover:text-[#a87b24] transition-colors">
            Data &amp; Security
          </Link>
          <Link href="/contact" className="hover:text-[#a87b24] transition-colors">
            Contact
          </Link>
        </div>
      </div>
    </footer>
  )
}
