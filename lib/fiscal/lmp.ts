// ─────────────────────────────────────────────────────────────────────────────
// GIMMO — Régime LMP (Loueur Meublé Professionnel)
// Conditions cumulatives au niveau du FOYER fiscal (art. 155 IV CGI) :
//   1. Recettes meublées annuelles > 23 000 € (tous biens confondus)
//   2. Recettes meublées > autres revenus professionnels du foyer
//
// Avantages LMP :
//   - Déficit imputable sur le revenu global SANS PLAFOND
//   - Amortissements déductibles (même règle anti-déficit qu'en LMNP)
//   - Plus-value : régime professionnel (exonération si recettes < 90 000€ pendant 5 ans)
//
// Inconvénient LMP :
//   - Cotisations sociales TNS (≈30% du bénéfice) en remplacement des PS
//   - LOURDES OBLIGATIONS ADMINISTRATIVES
//
// En V1 : cotisations TNS calculées sur le bénéfice imposable à 30%
// (conservateur — taux réel 30-45% selon revenu)
// ─────────────────────────────────────────────────────────────────────────────

import { PS_2026, LMP_SEUIL_RECETTES } from './parameters'
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
import { calcPlusValueParticulier } from './plusValue'
import type { SimulationInputs, RegimeResult, YearlyProjection } from './types'

export function calcLmp(inputs: SimulationInputs): RegimeResult {
  // ── Éligibilité ──────────────────────────────────────────────────────────
  if (inputs.locationType === 'nue') {
    return buildIneligibleResult(inputs, 'LMP réservé à la location meublée')
  }

  const annualRentBrut = round2(inputs.monthlyRent * 12 * (1 - inputs.vacancyRate))
  // Recettes totales meublées du foyer = bien simulé + autres biens
  const totalMeubleRevenues = round2(annualRentBrut + (inputs.existingMeubleRevenues ?? 0))

  // Condition 1 : recettes > 23 000 €
  const cond1 = totalMeubleRevenues > LMP_SEUIL_RECETTES
  // Condition 2 : recettes meublées > revenus professionnels hors immo
  const cond2 = totalMeubleRevenues > inputs.householdIncome

  if (!cond1 || !cond2) {
    const reason = !cond1
      ? `Recettes meublées (${totalMeubleRevenues.toLocaleString('fr-FR')} €) ≤ seuil LMP (${LMP_SEUIL_RECETTES.toLocaleString('fr-FR')} €)`
      : `Recettes meublées (${totalMeubleRevenues.toLocaleString('fr-FR')} €) < revenus professionnels (${inputs.householdIncome.toLocaleString('fr-FR')} €)`
    return buildIneligibleResult(inputs, reason)
  }

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

  let amortCarryForward = 0
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

    // Résultat avant amortissements
    const resultatAvantAmort = round2(rentNet - charges - interets)

    // Anti-déficit amortissements (même règle qu'en LMNP)
    const amortDisponible = round2(amortAnnuelTotal + amortCarryForward)
    let amortUsed = 0
    let resultatAvantCotisations = resultatAvantAmort

    if (resultatAvantAmort > 0) {
      amortUsed = Math.min(amortDisponible, resultatAvantAmort)
      resultatAvantCotisations = round2(resultatAvantAmort - amortUsed)
    } else {
      // LMP : déficit imputable sur le revenu global sans plafond
      amortUsed = 0
      // Le déficit est la valeur absolue de resultatAvantAmort
    }

    amortCarryForward = round2(amortDisponible - amortUsed)
    amortCumulDeduit += amortUsed

    // ── Cotisations sociales TNS ──────────────────────────────────────────
    // Applicables sur le bénéfice BIC (après amortissements), si positif
    const beneficeBic = resultatAvantCotisations
    const cotisationsTns = beneficeBic > 0 ? round2(beneficeBic * PS_2026.lmpTns) : 0

    // Résultat imposable après cotisations TNS (déductibles)
    const revenuImposable = Math.max(0, round2(beneficeBic - cotisationsTns))

    // Déficit LMP imputable sur le revenu global (si résultat avant amort < 0)
    const deficitLmp = resultatAvantAmort < 0 ? Math.abs(resultatAvantAmort) : 0

    // IR sur le résultat BIC LMP
    let yearIrNet = 0
    if (revenuImposable > 0) {
      const irResult = calcIr(
        inputs.householdIncome,
        revenuImposable,
        inputs.familySituation,
        inputs.childrenCount
      )
      yearIrNet = irResult.irNet
    } else if (deficitLmp > 0) {
      // Économie IR grâce au déficit LMP imputable sans plafond
      const irAvec = calcIr(inputs.householdIncome, 0, inputs.familySituation, inputs.childrenCount)
      const irSans = calcIr(
        inputs.householdIncome,
        -deficitLmp,
        inputs.familySituation,
        inputs.childrenCount
      )
      yearIrNet = round2(irSans.irNet - irAvec.irNet) // négatif = économie
    }

    // En LMP : PAS de prélèvements sociaux (remplacés par cotisations TNS)
    const yearPs = 0
    const yearTax = round2(yearIrNet + cotisationsTns)

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
      deficitCarryForward: 0,
      revenuImposable,
      ir: yearIrNet,
      ps: cotisationsTns, // Affichage PS = cotisations TNS
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

  // ── Plus-value LMP ───────────────────────────────────────────────────────
  // LMP : régime professionnel — exonération si recettes < 90 000€ pendant 5 ans
  // En V1 simplifiée : on utilise la PV particulier (conservateur)
  const salePrice = estimateSalePrice(
    inputs.purchasePrice,
    inputs.holdingPeriodYears,
    inputs.propertyAppreciationPct
  )
  const plusValue = calcPlusValueParticulier(inputs, salePrice, inputs.holdingPeriodYears)

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
    id: 'lmp',
    label: 'LMP (Loueur Meublé Professionnel)',
    labelShort: 'LMP',
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
    ps: 0,
    is: 0,
    pfuOnDividends: 0,
    cotisationsTns: y1.ps, // y1.ps contient les cotisations TNS
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
  const zeroPV = calcPlusValueParticulier(inputs, inputs.purchasePrice, inputs.holdingPeriodYears)
  return {
    id: 'lmp',
    label: 'LMP (Loueur Meublé Professionnel)',
    labelShort: 'LMP',
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
