import Link from 'next/link'
import { GimmoLogo } from '@/components/shared/GimmoLogo'
import { ArrowRight, Zap, BarChart2, Target, CheckCircle2 } from 'lucide-react'

// Données statiques — microcopies fidèles à la maquette GIMMO
const BENEFITS = [
  {
    emoji: '⚡',
    icon: Zap,
    title: '5 minutes chrono',
    description: 'Parcours guidé, sans jargon fiscal',
  },
  {
    emoji: '📊',
    icon: BarChart2,
    title: '6 régimes comparés',
    description: 'Micro, Réel, LMNP, SCI IR/IS',
  },
  {
    emoji: '🎯',
    icon: Target,
    title: 'Recommandation personnalisée',
    description: 'Basée sur votre TMI et votre projet',
  },
] as const

// Mock bars pour le comparateur visuel hero (données illustratives)
const MOCK_BARS = [
  { label: 'Réel LMNP', value: 85, color: '#1E3A6E', highlight: true },
  { label: 'SCI IS', value: 72, color: '#F59E0B', highlight: false },
  { label: 'Réel foncier', value: 60, color: '#60A5FA', highlight: false },
  { label: 'Micro-BIC', value: 48, color: '#A78BFA', highlight: false },
  { label: 'SCI IR', value: 38, color: '#34D399', highlight: false },
  { label: 'Micro-foncier', value: 22, color: '#94A3B8', highlight: false },
] as const

const SOCIAL_PROOF = ['Expert-comptable validé', 'Barèmes 2026 à jour', 'Données non partagées']

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F8F7F4]">
      {/* ── Navigation ──────────────────────────────────────────────────── */}
      <header className="mx-auto flex w-full max-w-[1100px] items-center justify-between px-6 py-[18px]">
        <GimmoLogo size="lg" />
        <Link
          href="/simulateur"
          className="rounded-xl border-[1.5px] border-[#1E3A6E] px-5 py-[9px] text-sm font-semibold text-[#1E3A6E] transition-colors hover:bg-[#EEF2FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3A6E]"
        >
          Lancer la simulation →
        </Link>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col items-center justify-center px-6 py-10 text-center">
        {/* Badge */}
        <div className="fade-in mb-7 inline-flex items-center gap-2 rounded-full border-[1.5px] border-[#0B7A56]/20 bg-[#ECFDF5] px-4 py-[6px] text-sm font-semibold text-[#0B7A56]">
          <span className="h-[7px] w-[7px] rounded-full bg-[#0B7A56]" aria-hidden />
          Simulateur fiscal 2026 — 100 % gratuit
        </div>

        {/* Headline */}
        <h1 className="fade-in mb-5 text-[clamp(36px,7vw,64px)] leading-[1.1] font-extrabold tracking-[-2px] text-[#1A1F2E]">
          Trouvez le régime fiscal
          <br />
          <span className="text-[#1E3A6E]">optimal pour votre bien.</span>
        </h1>

        {/* Sous-titre */}
        <p className="fade-in mb-10 max-w-[520px] text-lg leading-[1.65] text-[#6B7280]">
          Micro-foncier, LMNP, SCI IR/IS… En 5 minutes, comparez 6 régimes fiscaux et découvrez
          combien vous pouvez économiser sur vos impôts locatifs.
        </p>

        {/* Comparateur visuel mock */}
        <div
          className="fade-in mb-10 w-full max-w-[480px] rounded-2xl border border-[#E4E2DC] bg-white p-6 shadow-sm"
          aria-hidden="true"
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-[#1A1F2E]">
              Exemple — Appartement 200 k€ / 800 €/mois
            </span>
            <span className="rounded-full bg-[#ECFDF5] px-2 py-1 text-xs font-semibold text-[#0B7A56]">
              Économie jusqu'à 4 200 €/an
            </span>
          </div>
          <div className="flex flex-col gap-[10px]">
            {MOCK_BARS.map((bar) => (
              <div key={bar.label} className="flex items-center gap-3">
                <span
                  className="w-[110px] shrink-0 text-right text-xs text-[#6B7280]"
                  style={{ fontWeight: bar.highlight ? 700 : 400 }}
                >
                  {bar.label}
                </span>
                <div className="flex h-[28px] flex-1 overflow-hidden rounded-lg bg-[#F3F4F6]">
                  <div
                    className="flex h-full items-center rounded-lg transition-all duration-700"
                    style={{
                      width: `${bar.value}%`,
                      background: bar.color,
                      opacity: bar.highlight ? 1 : 0.6,
                    }}
                  />
                </div>
                {bar.highlight && (
                  <span className="text-xs font-bold text-[#0B7A56]">⭐ Recommandé</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA principal */}
        <Link
          href="/simulateur"
          className="fade-in mb-6 inline-flex items-center gap-2 rounded-2xl bg-[#1E3A6E] px-9 py-4 text-[17px] font-semibold text-white shadow-md transition-all hover:bg-[#162D57] hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3A6E]"
        >
          Calculer mon économie d'impôts
          <ArrowRight size={18} strokeWidth={2.5} aria-hidden />
        </Link>

        {/* Preuves sociales */}
        <div className="fade-in mb-14 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {SOCIAL_PROOF.map((item) => (
            <span key={item} className="flex items-center gap-1.5 text-sm text-[#6B7280]">
              <CheckCircle2 size={14} className="text-[#0B7A56]" aria-hidden />
              {item}
            </span>
          ))}
        </div>

        {/* ── Bénéfices ────────────────────────────────────────────────── */}
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
          {BENEFITS.map((benefit) => (
            <div
              key={benefit.title}
              className="rounded-2xl border border-[#E4E2DC] bg-white p-5 text-left"
            >
              <span className="mb-3 block text-2xl" role="img" aria-label={benefit.title}>
                {benefit.emoji}
              </span>
              <h3 className="mb-1 text-[15px] font-bold text-[#1A1F2E]">{benefit.title}</h3>
              <p className="text-[13px] leading-snug text-[#6B7280]">{benefit.description}</p>
            </div>
          ))}
        </div>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#E4E2DC] py-6 text-center text-sm text-[#6B7280]">
        <p>
          © 2026 GIMMO — Outil d'aide à la décision, non substituable à un conseil fiscal
          professionnel.{' '}
          <Link
            href="/mentions-legales"
            className="underline underline-offset-2 hover:text-[#1A1F2E]"
          >
            Mentions légales
          </Link>
        </p>
      </footer>
    </div>
  )
}
