import type { Metadata } from 'next'
import Link from 'next/link'
import { GimmoLogo } from '@/components/shared/GimmoLogo'

export const metadata: Metadata = {
  title: 'Mentions légales',
  description: 'Mentions légales du simulateur fiscal GIMMO.',
  robots: { index: false, follow: false },
}

// ── Composants utilitaires ─────────────────────────────────────────────────��──

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-bold text-[#1A1F2E]">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-[#374151]">{children}</div>
    </section>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MentionsLegalesPage() {
  return (
    <div className="min-h-screen bg-[#F8F7F4]">
      {/* Header */}
      <header className="border-b border-[#E4E2DC] bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[760px] items-center justify-between px-6 py-4">
          <Link href="/">
            <GimmoLogo size="md" />
          </Link>
          <Link href="/" className="text-sm text-[#6B7280] hover:text-[#1A1F2E]">
            ← Retour
          </Link>
        </div>
      </header>

      {/* Contenu */}
      <main className="mx-auto max-w-[760px] px-6 py-12">
        <h1 className="mb-2 text-3xl font-extrabold text-[#1A1F2E]">Mentions légales</h1>
        <p className="mb-10 text-sm text-[#6B7280]">Dernière mise à jour : avril 2026</p>

        <Section title="1. Éditeur du site">
          <p>
            Le site <strong>gimmo.fr</strong> est édité par une personne physique (ci-après
            &ldquo;l&rsquo;Éditeur&rdquo;).
          </p>
          <p>
            Contact :{' '}
            <a href="mailto:bonjour@gimmo.fr" className="text-[#1E3A6E] underline">
              bonjour@gimmo.fr
            </a>
          </p>
        </Section>

        <Section title="2. Hébergement">
          <p>
            Le site est hébergé par <strong>Vercel Inc.</strong>, 440 N Barranca Ave #4133, Covina,
            CA 91723, États-Unis.
          </p>
          <p>
            La base de données est hébergée par <strong>Supabase</strong> sur des serveurs situés en
            Europe (AWS eu-west-3, Paris).
          </p>
        </Section>

        <Section title="3. Propriété intellectuelle">
          <p>
            L&rsquo;ensemble des éléments constituant le site GIMMO (textes, visuels, code source,
            algorithmes de simulation) est protégé par le droit de la propriété intellectuelle et
            appartient à l&rsquo;Éditeur.
          </p>
          <p>
            Toute reproduction, diffusion ou utilisation sans autorisation préalable écrite est
            strictement interdite.
          </p>
        </Section>

        <Section title="4. Limitation de responsabilité">
          <p>
            Les simulations fiscales fournies par GIMMO sont calculées sur la base de la législation
            française en vigueur au 1er janvier 2026. Elles sont fournies à titre indicatif et
            pédagogique uniquement.
          </p>
          <p>
            <strong>GIMMO ne constitue pas un conseil fiscal, juridique ou financier.</strong>{' '}
            L&rsquo;Éditeur décline toute responsabilité en cas d&rsquo;erreur, d&rsquo;omission ou
            de résultats erronés. Consultez un expert-comptable ou un conseiller en gestion de
            patrimoine avant toute décision d&rsquo;investissement.
          </p>
        </Section>

        <Section title="5. Données personnelles">
          <p>
            La collecte et le traitement des données personnelles (adresse email) sont décrits dans
            la{' '}
            <Link href="/legal/confidentialite" className="text-[#1E3A6E] underline">
              Politique de confidentialité
            </Link>
            .
          </p>
        </Section>

        <Section title="6. Cookies">
          <p>
            Le site peut utiliser des cookies analytiques (PostHog) dans le but d&rsquo;améliorer
            l&rsquo;expérience utilisateur. Ces cookies ne sont activés qu&rsquo;avec votre
            consentement implicite à la navigation. Aucun cookie publicitaire tiers n&rsquo;est
            utilisé.
          </p>
        </Section>

        <Section title="7. Droit applicable">
          <p>
            Les présentes mentions légales sont soumises au droit français. En cas de litige, les
            tribunaux français seront seuls compétents.
          </p>
        </Section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E4E2DC] py-6 text-center text-sm text-[#9CA3AF]">
        <p>© 2026 GIMMO</p>
      </footer>
    </div>
  )
}
