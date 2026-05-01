'use client'

// Boundary d'erreur global Next.js App Router
// Affiché pour les erreurs non capturées dans les Server Components

import { useEffect } from 'react'
import Link from 'next/link'
import { GimmoLogo } from '@/components/shared/GimmoLogo'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log dans la console (à remplacer par Sentry en production si besoin)
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8F7F4] px-6 text-center">
      <GimmoLogo size="lg" />

      <p className="mt-8 text-5xl font-extrabold text-red-500">⚠️</p>
      <h1 className="mt-3 text-xl font-bold text-[#1A1F2E]">Une erreur est survenue</h1>
      <p className="mt-2 max-w-sm text-sm text-[#6B7280]">
        Quelque chose s&rsquo;est mal passé. Vos données sont sauvegardées — réessayez ou revenez à
        l&rsquo;accueil.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-[#9CA3AF]">Code : {error.digest}</p>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={reset}
          className="rounded-xl bg-[#1E3A6E] px-6 py-3 text-sm font-semibold text-white hover:bg-[#162D57]"
        >
          Réessayer
        </button>
        <Link
          href="/"
          className="rounded-xl border border-[#E4E2DC] bg-white px-6 py-3 text-sm font-semibold text-[#1A1F2E] hover:border-[#1E3A6E]"
        >
          Retour à l&rsquo;accueil
        </Link>
      </div>
    </div>
  )
}
