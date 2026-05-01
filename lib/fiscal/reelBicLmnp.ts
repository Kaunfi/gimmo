// ─────────────────────────────────────────────────────────────────────────────
// GIMMO — Régime Réel BIC LMNP (non professionnel)
// Éligibilité : location meublée, recettes ≤ seuil LMP (23 000 €) OU
//               recettes meublées ≤ autres revenus professionnels (sinon LMP)
//
// Règle anti-déficit LMNP :
//   → Les amortissements ne peuvent PAS créer un résultat BIC négatif
//   → Résultat avant amortissements = max(0, recettes − charges − intérêts)
//   → Si résultat avant amort > 0 : on utilise les amortissements jusqu'à 0
//   → Excédent d'amortissements → report indefini (pas d'expiration)
//   → Déficit hors amortissements = report sur BIC meublé des 10 prochaines années
//     (art. 156 I CGI — déficit provenant des charges courantes et intérêts)
//
// Intérêts : déductibles en totalité (contrairement au foncier)
//
// Plus-value : réintégration des amortissements déduits (LF 2025 art. 84)
// PS : 18,6% (LFSS 2026)
// ─────────────────────────────────────────────────────────────────────────────

import { PS_2026 } from './parameters'
import { calcIr } from './tmi'
import { calcAmortissementAnnuel } from './utils'
import {
  round2,
  annualRentNet,
  annualChargesCourantes,
  buildAmortizationTable,
  totalMonthlyPayment,
  remainingBalance,
  estimateSalePrice,
} from './utils'
import { calcPlusValueLmnp } from './plusValue'
import type { SimulationInputs, RegimeResult, YearlyProjection } from './types'

export function calcReelBicLmnp(inputs: SimulationInputs): RegimeResult {
  // ── Éligibilité ──────────────────────────────────────────────────────────
  if (inputs.locationType === 'nue') {
    return buildIneligibleResult(inputs, 'Réservé à la location meublée')
  }

  // Note : la vérification LMP est gérée dans compareRegimes.
  // Ici on calcule le régime LMNP non professionnel.

  // ── Amortissement annuel ──────────────────────────────────────────────────
  const amortAnnuel = calcAmortissementAnnuel(inputs)
  const amortAnnuelTotal = amortAnnuel.total

  // ── Loan table ────────────────────────────────────────────────────────────
  const loanTable =
    inputs.financingMode === 'loan'
      ? buildAmortizationTable(
          inputs.loanAmount,
          inputs.interestRatePct / 100,
          inputs.loanDurationYears,
          inputs.insuranceRatePct
        )
      : []

  const monthlyPayment =
    inputs.financingMode === 'loan'
      ? totalMonthlyPayment(
          inputs.loanAmount,
          inputs.interestRatePct / 100,
          inputs.loanDurationYears,
          inputs.insuranceRatePct
        )
      : 0
  const annualLoanPayment = round2(monthlyPayment * 12)

  // ── Projection ────────────────────────────────────────────────────────────
  const projection: YearlyProjection[] = []
  let totalTaxAccum = 0
  let totalCfAccum = 0

  // Report d'amortissements (indéfini)
  let amortCarryForward = 0
  // Cumul des amortissements effectivement déduits (pour calcul PV LF 2025)
  let amortCumulDeduit = 0

  for (let i = 0; i < inputs.holdingPeriodYears; i++) {
    const rentNet = annualRentNet(
      inputs.monthlyRent,
      inputs.vacancyRate,
      inputs.rentIndexationPct,
      i
    )
    const rentBrut = round2(
      inputs.monthlyRent * 12 * Math.pow(1 + inputs.rentIndexationPct / 100, i)
    )

    const charges = annualChargesCourantes(inputs, inputs.chargesIndexationPct, i)

    const loanRow = loanTable[i]
    const interets = loanRow ? round2(loanRow.interets + loanRow.assurance) : 0
    const yearLoanPayment = loanRow ? round2(loanRow.totalVersements + loanRow.assurance) : 0

    // ── Résultat avant amortissements ──────────────────────────────────────
    const resultatAvantAmort = round2(rentNet - charges - interets)

    // ── Anti-déficit LMNP ──────────────────────────────────────────────────
    // Les amortissements ne peuvent pas créer de résultat négatif.
    // On utilise les amortissements disponibles (courants + reportés) jusqu'à 0.

    const amortDisponible = round2(amortAnnuelTotal + amortCarryForward)
    let amortUsed = 0
    let revenuImposable = 0

    if (resultatAvantAmort > 0) {
      // On peut utiliser les amortissements jusqu'à épuiser le résultat positif
      amortUsed = Math.min(amortDisponible, resultatAvantAmort)
      revenuImposable = round2(resultatAvantAmort - amortUsed)
    } else {
      // Résultat avant amort < 0 → pas d'amortissement utilisable
      // Le déficit est reportable sur BIC meublé (10 ans) — géré en dehors de la PV
      amortUsed = 0
      revenuImposable = 0 // LMNP ne peut pas déduire sur le revenu global
    }

    // Mise à jour du report d'amortissements
    const newAmortCarry = round2(amortDisponible - amortUsed)
    amortCarryForward = newAmortCarry
    amortCumulDeduit += amortUsed

    // ── Fiscal ────────────────────────────────────────────────────────────
    const irResult = calcIr(
      inputs.householdIncome,
      revenuImposable,
      inputs.familySituation,
      inputs.childrenCount
    )

    const yearPs = revenuImposable > 0 ? round2(revenuImposable * PS_2026.lmnp) : 0
    const yearTax = round2(irResult.irNet + yearPs)

    const yearCf = round2(rentNet - charges - yearTax - yearLoanPayment)

    totalTaxAccum += yearTax
    totalCfAccum += yearCf

    projection.push({
      year: i + 1,
      annualRentBrut: rentBrut,
      annualRentNet: rentNet,
      chargesCourantes: charges,
      interetsDeduits: interets,
      amortissementUsed: amortUsed,
      amortissementCarryForward: amortCarryForward,
      deficitCarryForward: 0, // LMNP : déficit hors amort non géré séparément en V1
      revenuImposable,
      ir: irResult.irNet,
      ps: yearPs,
      is: 0,
      totalTax: yearTax,
      loanPayment: yearLoanPayment,
      cashflow: yearCf,
    })
  }

  // ── Résultats Année 1 ─────────────────────────────────────────────────────
  const y1 = projection[0]!
  const rentNetY1 = annualRentNet(
    inputs.monthlyRent,
    inputs.vacancyRate,
    inputs.rentIndexationPct,
    0
  )
  const chargesY1 = annualChargesCourantes(inputs, inputs.chargesIndexationPct, 0)
  const loanRow0 = loanTable[0]
  const interetsY1 = loanRow0 ? round2(loanRow0.interets + loanRow0.assurance) : 0
  const chargesDeductiblesY1 = round2(chargesY1 + interetsY1 + y1.amortissementUsed)

  // ── Plus-value avec réintégration amortissements (LF 2025) ───────────────
  const salePrice = estimateSalePrice(
    inputs.purchasePrice,
    inputs.holdingPeriodYears,
    inputs.propertyAppreciationPct
  )
  const plusValue = calcPlusValueLmnp(
    inputs,
    salePrice,
    inputs.holdingPeriodYears,
    amortCumulDeduit
  )

  const remainingDebt =
    inputs.financingMode === 'loan'
      ? remainingBalance(
          inputs.loanAmount,
          inputs.interestRatePct / 100,
          inputs.loanDurationYears,
          inputs.holdingPeriodYears
        )
      : 0

  const netSaleProceeds = round2(salePrice - plusValue.totalTaxOnGain - remainingDebt)
  const totalReturn = round2(totalCfAccum + netSaleProceeds)

  const effectiveTaxRate = y1.annualRentNet > 0 ? round2(y1.totalTax / y1.annualRentNet) : 0

  return {
    id: 'reelBicLmnp',
    label: 'Réel BIC LMNP',
    labelShort: 'Réel LMNP',
    isEligible: true,

    annualRentBrut: round2(inputs.monthlyRent * 12),
    annualRentNet: rentNetY1,
    chargesDeductibles: chargesDeductiblesY1,
    amortissement: amortAnnuelTotal,
    amortissementReporte: projection[projection.length - 1]?.amortissementCarryForward ?? 0,
    revenuImposable: y1.revenuImposable,
    deficitImputableRevenuGlobal: 0,
    deficitFoncierReporte: 0,

    ir: y1.ir,
    ps: y1.ps,
    is: 0,
    pfuOnDividends: 0,
    cotisationsTns: 0,
    totalTax: y1.totalTax,
    effectiveTaxRate,

    annualLoanPayment,
    annualRealCharges: chargesY1,
    annualCashflow: y1.cashflow,
    monthlyCashflow: round2(y1.cashflow / 12),

    projection,
    totalTaxOverHolding: round2(totalTaxAccum),
    totalCashflowOverHolding: round2(totalCfAccum),

    plusValue,
    netSaleProceeds,
    totalReturn,
  }
}

// ── Helper résultat non éligible ──────────────────────────────────────────────

function buildIneligibleResult(inputs: SimulationInputs, reason: string): RegimeResult {
  const zeroPV = calcPlusValueLmnp(inputs, inputs.purchasePrice, inputs.holdingPeriodYears, 0)
  return {
    id: 'reelBicLmnp',
    label: 'Réel BIC LMNP',
    labelShort: 'Réel LMNP',
    isEligible: false,
    ineligibilityReason: reason,
    annualRentBrut: 0,
    annualRentNet: 0,
    chargesDeductibles: 0,
    amortissement: 0,
    amortissementReporte: 0,
    revenuImposable: 0,
    deficitImputableRevenuGlobal: 0,
    deficitFoncierReporte: 0,
    ir: 0,
    ps: 0,
    is: 0,
    pfuOnDividends: 0,
    cotisationsTns: 0,
    totalTax: 0,
    effectiveTaxRate: 0,
    annualLoanPayment: 0,
    annualRealCharges: 0,
    annualCashflow: 0,
    monthlyCashflow: 0,
    projection: [],
    totalTaxOverHolding: 0,
    totalCashflowOverHolding: 0,
    plusValue: zeroPV,
    netSaleProceeds: inputs.purchasePrice,
    totalReturn: 0,
  }
}
