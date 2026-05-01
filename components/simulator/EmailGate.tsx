'use client'

// Étape 6 — Email Gate
// Collecte l'email avant d'afficher les résultats + consent RGPD

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSimulateur } from '@/lib/simulateur/SimulateurContext'
import { trackEvent } from '@/components/analytics/PostHogProvider'
import { GimmoLogo } from '@/components/shared/GimmoLogo'

// ── Schéma Zod ────────────────────────────────────────────────────────────────

const schema = z.object({
  email: z.string().min(1, "L'email est requis").email('Adresse email invalide'),
  // Zod v4 : utiliser error (string) à la place de errorMap
  gdprConsent: z.literal(true, { error: 'Vous devez accepter pour continuer' }),
  newsletterConsent: z.boolean(),
})

type FormValues = z.infer<typeof schema>

// ── Composant ─────────────────────────────────────────────────────────────────

export function EmailGate() {
  const { state, update, goNext } = useSimulateur()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: state.email,
      // gdprConsent doit être true pour la validation — jamais false en defaultValues
      ...(state.gdprConsent ? { gdprConsent: true as const } : {}),
      newsletterConsent: state.newsletterConsent,
    },
  })

  async function onSubmit(values: FormValues) {
    setIsLoading(true)
    update({
      email: values.email,
      gdprConsent: values.gdprConsent,
      newsletterConsent: values.newsletterConsent,
    })

    // Enregistrement lead en arrière-plan (sans bloquer l'accès aux résultats)
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: values.email,
          gdprConsent: values.gdprConsent,
          newsletterConsent: values.newsletterConsent,
        }),
      })
    } catch {
      // Silencieux — on ne bloque pas l'utilisateur sur une erreur API
    }

    trackEvent('email_submitted', { newsletter: values.newsletterConsent })
    setIsLoading(false)
    goNext()
  }

  // Valeur calculée pour l'affichage d'aperçu
  const rentBrut = state.monthlyRent * 12
  const rendBrut =
    state.purchasePrice > 0 ? ((rentBrut / state.purchasePrice) * 100).toFixed(2) : '—'

  return (
    <div className="flex min-h-screen flex-col bg-[#F8F7F4]">
      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col items-center justify-center px-6 py-12">
        {/* Logo */}
        <div className="mb-8">
          <GimmoLogo size="lg" />
        </div>

        {/* Card principale */}
        <div className="w-full rounded-2xl border border-[#E4E2DC] bg-white p-8 shadow-sm">
          {/* Teaser résultats */}
          <div className="mb-6 rounded-xl bg-gradient-to-br from-[#1E3A6E] to-[#162d58] p-5 text-white">
            <p className="text-xs font-semibold tracking-widest text-white/60 uppercase">
              Votre simulation
            </p>
            <p className="mt-2 text-3xl font-bold">
              {state.purchasePrice > 0 ? state.purchasePrice.toLocaleString('fr-FR') + ' €' : '—'}
            </p>
            <div className="mt-3 flex items-center gap-4 text-sm">
              <span>
                <span className="text-white/60">Loyer brut </span>
                <strong>{rentBrut.toLocaleString('fr-FR')} €/an</strong>
              </span>
              <span>
                <span className="text-white/60">Rendement </span>
                <strong>{rendBrut}%</strong>
              </span>
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              <div className="h-1.5 flex-1 rounded-full bg-white/20">
                <div className="h-full w-5/6 rounded-full bg-[#0B7A56]" />
              </div>
              <span className="text-xs text-white/60">Calcul prêt</span>
            </div>
          </div>

          {/* Titre */}
          <h2 className="mb-1 text-xl font-bold text-[#1A1F2E]">Accédez à votre analyse fiscale</h2>
          <p className="mb-6 text-sm text-[#6B7280]">
            Comparaison des 7 régimes fiscaux, projection sur {state.holdingPeriod} ans et calcul de
            la plus-value.
          </p>

          {/* Formulaire */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Email */}
            <div className="mb-5">
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[#374151]">
                Votre adresse email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="prenom@exemple.com"
                className={`w-full rounded-xl border px-4 py-3 text-sm text-[#1A1F2E] transition-colors outline-none ${
                  errors.email
                    ? 'border-red-400 focus:ring-2 focus:ring-red-400/20'
                    : 'border-[#E4E2DC] focus:border-[#1E3A6E] focus:ring-2 focus:ring-[#1E3A6E]/10'
                }`}
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Newsletter */}
            <label className="mb-4 flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 flex-shrink-0 accent-[#1E3A6E]"
                {...register('newsletterConsent')}
              />
              <span className="text-[13px] text-[#6B7280]">
                Je souhaite recevoir des conseils sur l'investissement immobilier et la fiscalité
              </span>
            </label>

            {/* RGPD */}
            <div className="mb-6">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 flex-shrink-0 accent-[#1E3A6E]"
                  {...register('gdprConsent')}
                />
                <span className="text-[13px] text-[#6B7280]">
                  J'accepte que GIMMO utilise mon email pour m'envoyer mon analyse et me
                  recontacter.{' '}
                  <a href="/legal/confidentialite" className="text-[#1E3A6E] underline">
                    Politique de confidentialité
                  </a>
                </span>
              </label>
              {errors.gdprConsent && (
                <p className="mt-1.5 text-xs text-red-500">{errors.gdprConsent.message}</p>
              )}
            </div>

            {/* CTA */}
            <button
              type="submit"
              disabled={isLoading}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#0B7A56] text-base font-semibold text-white transition-all hover:bg-[#096845] active:scale-[0.99] disabled:opacity-60"
            >
              {isLoading ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <>
                  Voir mon analyse gratuite
                  <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M3 8h10M9 4l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Garanties */}
        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-[#9CA3AF]">
          <span className="flex items-center gap-1">🔒 Données sécurisées</span>
          <span className="flex items-center gap-1">🆓 100% gratuit</span>
          <span className="flex items-center gap-1">📊 Calcul immédiat</span>
        </div>
      </main>
    </div>
  )
}
