import type { Metadata } from 'next'
import Link from 'next/link'
import { GimmoLogo } from '@/components/shared/GimmoLogo'

export const metadata: Metadata = {
  title: 'Page introuvable',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8F7F4] px-6 text-center">
      <GimmoLogo size="lg" />

      <p className="mt-8 text-6xl font-extrabold text-[#1E3A6E]">404</p>
      <h1 className="mt-3 text-xl font-bold text-[#1A1F2E]">Page introuvable</h1>
      <p className="mt-2 max-w-sm text-sm text-[#6B7280]">
        La page que vous cherchez n&rsquo;existe pas ou a été déplacée.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="rounded-xl bg-[#1E3A6E] px-6 py-3 text-sm font-semibold text-white hover:bg-[#162D57]"
        >
          Accueil
        </Link>
        <Link
          href="/simulateur"
          className="rounded-xl border border-[#E4E2DC] bg-white px-6 py-3 text-sm font-semibold text-[#1A1F2E] hover:border-[#1E3A6E]"
        >
          Lancer le simulateur →
        </Link>
      </div>
    </div>
  )
}
