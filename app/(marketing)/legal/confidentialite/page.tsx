import type { Metadata } from 'next'
import Link from 'next/link'
import { GimmoLogo } from '@/components/shared/GimmoLogo'

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description: 'Politique de confidentialité et traitement des données personnelles de GIMMO.',
  robots: { index: false, follow: false },
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-bold text-[#1A1F2E]">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-[#374151]">{children}</div>
    </section>
  )
}

export default function ConfidentialitePage() {
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

      <main className="mx-auto max-w-[760px] px-6 py-12">
        <h1 className="mb-2 text-3xl font-extrabold text-[#1A1F2E]">
          Politique de confidentialité
        </h1>
        <p className="mb-10 text-sm text-[#6B7280]">Dernière mise à jour : avril 2026</p>

        <Section title="1. Responsable du traitement">
          <p>
            L&rsquo;Éditeur du site gimmo.fr est responsable du traitement de vos données
            personnelles au sens du RGPD (Règlement Général sur la Protection des Données —
            Règlement UE 2016/679).
          </p>
          <p>
            Contact DPO :{' '}
            <a href="mailto:bonjour@gimmo.fr" className="text-[#1E3A6E] underline">
              bonjour@gimmo.fr
            </a>
          </p>
        </Section>

        <Section title="2. Données collectées">
          <p>Nous collectons uniquement les données strictement nécessaires :</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <strong>Adresse email</strong> — fournie volontairement lors de la demande
              d&rsquo;analyse fiscale (étape 6 du simulateur).
            </li>
            <li>
              <strong>Données de simulation</strong> — informations saisies dans le simulateur (prix
              du bien, loyer, revenus du foyer, etc.). Ces données sont anonymisées et ne permettent
              pas de vous identifier seul.
            </li>
            <li>
              <strong>Données de navigation</strong> — logs techniques (adresse IP, navigateur)
              conservés 30 jours par l&rsquo;hébergeur (Vercel). Données analytiques anonymisées via
              PostHog (si consentement).
            </li>
          </ul>
        </Section>

        <Section title="3. Finalités du traitement">
          <ul className="ml-4 list-disc space-y-1">
            <li>Vous envoyer votre analyse fiscale personnalisée par email.</li>
            <li>
              Vous recontacter à des fins commerciales si vous avez donné votre consentement
              explicite (opt-in newsletter).
            </li>
            <li>Améliorer le produit via des analyses statistiques anonymisées.</li>
          </ul>
        </Section>

        <Section title="4. Base légale">
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <strong>Consentement</strong> (art. 6(1)(a) RGPD) — pour l&rsquo;envoi d&rsquo;emails
              commerciaux et l&rsquo;analyse comportementale.
            </li>
            <li>
              <strong>Intérêt légitime</strong> (art. 6(1)(f) RGPD) — pour l&rsquo;envoi de votre
              analyse et l&rsquo;amélioration du service.
            </li>
          </ul>
        </Section>

        <Section title="5. Durée de conservation">
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <strong>Email + données de simulation</strong> : 3 ans à compter de la dernière
              interaction, puis suppression automatique.
            </li>
            <li>
              <strong>Logs techniques</strong> : 30 jours (hébergeur Vercel).
            </li>
          </ul>
        </Section>

        <Section title="6. Destinataires des données">
          <p>
            Vos données sont traitées par les sous-traitants suivants, dans le cadre strict de la
            fourniture du service :
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <strong>Supabase</strong> (PostgreSQL, EU) — stockage des simulations et des leads.
            </li>
            <li>
              <strong>Resend</strong> — envoi d&rsquo;emails transactionnels.
            </li>
            <li>
              <strong>Vercel</strong> — hébergement du site.
            </li>
            <li>
              <strong>PostHog</strong> (EU) — analytics anonymisés (si consentement).
            </li>
          </ul>
          <p>
            Aucune donnée n&rsquo;est vendue ou partagée avec des tiers à des fins publicitaires.
          </p>
        </Section>

        <Section title="7. Vos droits">
          <p>
            Conformément au RGPD, vous disposez des droits suivants sur vos données personnelles :
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Droit d&rsquo;accès (art. 15)</li>
            <li>Droit de rectification (art. 16)</li>
            <li>Droit à l&rsquo;effacement — &ldquo;droit à l&rsquo;oubli&rdquo; (art. 17)</li>
            <li>Droit à la limitation du traitement (art. 18)</li>
            <li>Droit à la portabilité (art. 20)</li>
            <li>Droit d&rsquo;opposition (art. 21)</li>
          </ul>
          <p>
            Pour exercer vos droits, contactez-nous à{' '}
            <a href="mailto:bonjour@gimmo.fr" className="text-[#1E3A6E] underline">
              bonjour@gimmo.fr
            </a>
            . Nous répondrons dans un délai d&rsquo;un mois.
          </p>
          <p>
            Vous pouvez également introduire une réclamation auprès de la{' '}
            <a
              href="https://www.cnil.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#1E3A6E] underline"
            >
              CNIL
            </a>
            .
          </p>
        </Section>

        <Section title="8. Sécurité">
          <p>
            Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour
            protéger vos données : chiffrement TLS en transit, accès restreint en base de données,
            authentification sécurisée des accès administrateurs.
          </p>
        </Section>
      </main>

      <footer className="border-t border-[#E4E2DC] py-6 text-center text-sm text-[#9CA3AF]">
        <p>
          © 2026 GIMMO ·{' '}
          <Link href="/mentions-legales" className="underline hover:text-[#6B7280]">
            Mentions légales
          </Link>
        </p>
      </footer>
    </div>
  )
}
