// POST /api/simulations — Persistance d'une simulation complète + envoi email résultats
//
// Appelé automatiquement depuis ResultatsPage au montage.
// Corps attendu : { state: SimulateurState, results: RegimeSummary[], recommendedRegime: string }

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { getResend, FROM_EMAIL } from '@/lib/resend/client'
import { buildSimulationEmail, type RegimeSummary } from '@/lib/resend/templates'

// ── Schéma de validation ──────────────────────────────────────────────────────

const regimeSummarySchema = z.object({
  label: z.string(),
  labelShort: z.string(),
  totalTax: z.number(),
  monthlyCashflow: z.number(),
  totalReturn: z.number(),
  effectiveTaxRate: z.number(),
})

const schema = z.object({
  // Champs clés du state (on ne revalide pas tout)
  email: z.string().email().optional(),
  gdprConsent: z.boolean().optional(),
  newsletterConsent: z.boolean().optional(),

  // Étape 1
  projectStage: z.string().nullable().optional(),
  mainGoal: z.string().nullable().optional(),
  locationType: z.string(),

  // Étape 2
  familySituation: z.string(),
  childrenCount: z.number().int().min(0),
  householdIncome: z.number().min(0),
  existingMeubleRevenues: z.number().min(0),

  // Étape 3
  purchasePrice: z.number().min(0),
  propertyType: z.string(),
  notaryFees: z.number().min(0),
  renovationWork: z.number().min(0),
  furnitureBudget: z.number().min(0).optional(),
  postalCode: z.string().optional(),

  // Étape 4
  financingMode: z.string(),
  downPayment: z.number().min(0),
  loanDuration: z.number().int().min(0),
  interestRate: z.number().min(0),
  insuranceRate: z.number().min(0),

  // Étape 5
  monthlyRent: z.number().min(0),
  vacancyRate: z.number().min(0),
  condoFees: z.number().min(0),
  propertyTax: z.number().min(0),
  pnoInsurance: z.number().min(0),
  managementFees: z.number().min(0),
  maintenancePct: z.number().min(0),
  holdingPeriod: z.number().int().min(1),

  // Résultats
  recommendedRegime: z.string().optional(),
  isLmpTriggered: z.boolean().optional(),
  results: z.array(regimeSummarySchema),
})

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as unknown
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      console.error('[simulations] Validation error:', parsed.error.issues)
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const d = parsed.data

    // Montant emprunté calculé à partir du coût total - apport
    const totalCost = d.purchasePrice + d.notaryFees + d.renovationWork
    const loanAmount = d.financingMode === 'loan' ? Math.max(0, totalCost - d.downPayment) : 0

    // ── Persistance Prisma ────────────────────────────────────────────────────
    const simulation = await prisma.simulation.create({
      data: {
        // Étape 1
        projectStage: d.projectStage ?? null,
        mainGoal: d.mainGoal ?? null,
        locationType: d.locationType,

        // Étape 2
        familySituation: d.familySituation,
        childrenCount: d.childrenCount,
        householdIncome: d.householdIncome,
        existingMeubleRevenues: d.existingMeubleRevenues,

        // Étape 3
        purchasePrice: d.purchasePrice,
        propertyType: d.propertyType,
        notaryFees: d.notaryFees,
        renovationWork: d.renovationWork,
        furnitureBudget: d.furnitureBudget ?? null,
        postalCode: d.postalCode ?? '',

        // Étape 4
        financingMode: d.financingMode,
        downPayment: d.downPayment,
        loanAmount,
        loanDuration: d.loanDuration,
        interestRate: d.interestRate,
        insuranceRate: d.insuranceRate,

        // Étape 5
        monthlyRent: d.monthlyRent,
        vacancyRate: d.vacancyRate,
        condoFees: d.condoFees,
        propertyTax: d.propertyTax,
        pnoInsurance: d.pnoInsurance,
        managementFees: d.managementFees,
        maintenancePct: d.maintenancePct,
        holdingPeriod: d.holdingPeriod,

        // Résultats
        results: d.results,
        recommendedRegime: d.recommendedRegime ?? null,
        isLmpTriggered: d.isLmpTriggered ?? false,

        // Lead (email FK direct — pas de nested write pour compatibilité exactOptionalPropertyTypes)
        email: d.email ?? null,
        gdprConsent: d.gdprConsent ?? false,
        newsletterOptIn: d.newsletterConsent ?? false,
        completedAt: d.email ? new Date() : null,
      },
    })

    // Upsert Lead + incrément simulationCount (séparé pour éviter conflit de types Prisma)
    if (d.email) {
      await prisma.lead.upsert({
        where: { email: d.email },
        update: {
          gdprConsent: d.gdprConsent ?? false,
          newsletterOptIn: d.newsletterConsent ?? false,
          simulationCount: { increment: 1 },
        },
        create: {
          email: d.email,
          gdprConsent: d.gdprConsent ?? false,
          newsletterOptIn: d.newsletterConsent ?? false,
          simulationCount: 1,
        },
      })
    }

    // ── Envoi email résultats (si email + RGPD + clé Resend) ─────────────────
    if (d.email && d.gdprConsent && process.env.RESEND_API_KEY) {
      const recommended =
        d.results.find(
          (r) => r.labelShort === d.recommendedRegime || r.label === d.recommendedRegime
        ) ?? d.results[0]

      const top3: RegimeSummary[] = d.results
        .slice()
        .sort((a, b) => b.monthlyCashflow - a.monthlyCashflow)
        .slice(0, 3)

      if (recommended) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://gimmo.fr'
        const emailData = buildSimulationEmail({
          email: d.email,
          purchasePrice: d.purchasePrice,
          monthlyRent: d.monthlyRent,
          holdingPeriod: d.holdingPeriod,
          recommendedRegimeLabel: recommended.label,
          recommendedCashflow: recommended.monthlyCashflow,
          recommendedTax: recommended.totalTax,
          recommendedTotalReturn: recommended.totalReturn,
          top3,
          simulationId: simulation.id,
          appUrl,
        })

        const { error } = await getResend().emails.send({
          from: FROM_EMAIL,
          to: [d.email],
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
        })

        if (error) {
          // Non bloquant — on log mais on répond 200 quand même
          console.error('[simulations] Resend error:', error)
        }
      }
    }

    return NextResponse.json({ simulationId: simulation.id }, { status: 201 })
  } catch (err) {
    console.error('[simulations] Error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
