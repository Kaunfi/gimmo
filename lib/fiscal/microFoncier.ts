// ─────────────────────────────────────────────────────────────────────────────
// GIMMO — Régime Micro-foncier
// Éligibilité : location nue, recettes ≤ 15 000 €/an
// Abattement forfaitaire 30% réputé couvrir TOUTES les charges
// Source : art. 32 CGI
// ─────────────────────────────────────────────────────────────────────────────

import { MICRO_SEUILS_2026, PS_2026 } from './parameters'
import { calcIr } from './tmi'
import {
  round2,
  floorZero,
  annualRentNet,
  annualChargesCourantes,
  buildAmortizationTable,
  totalMonthlyPayment,
  remainingBalance,
  estimateSalePrice,
} from './utils'
import { calcPlusValueParticulier } from './plusValue'
import type { SimulationInputs, RegimeResult, YearlyProjection } from './types'

export function calcMicroFoncier(inputs: SimulationInputs): RegimeResult {
  const seuil = MICRO_SEUILS_2026.microFoncier

  // ── Éligibilité ──────────────────────────────────────────────────────────
  const annualRentBrut = round2(inputs.monthlyRent * 12 * (1 - inputs.vacancyRate))

  const isEligible = inputs.locationType === 'nue' && annualRentBrut <= seuil.plafond

  if (!isEligible) {
    const reason =
      inputs.locationType !== 'nue'
        ? 'Réservé à la location nue'
        : `Recettes (${annualRentBrut.toLocaleString('fr-FR')} €) dépassent le plafond de ${seuil.plafond.toLocaleString('fr-FR')} €`

    return buildIneligibleResult('microFoncier', 'Micro-foncier', 'Micro-foncier', reason, inputs)
  }

  // ── Année 1 ───────────────────────────────────────────────────────────────
  const rentNet = annualRentNet(inputs.monthlyRent, inputs.vacancyRate, inputs.rentIndexationPct, 0)
  const rentBrut = round2(inputs.monthlyRent * 12)

  // Abattement 30%
  const abattement = round2(rentNet * seuil.abattement)
  const revenuImposable = round2(rentNet - abattement)

  // IR
  const irResult = calcIr(
    inputs.householdIncome,
    revenuImposable,
    inputs.familySituation,
    inputs.childrenCount
  )

  // PS sur revenus fonciers = 17,2%
  const ps = round2(revenuImposable * PS_2026.foncier)
  const totalTax = round2(irResult.irNet + ps)

  // Charges réelles (pour le cash-flow — non déductibles en micro)
  const chargesReelles = annualChargesCourantes(inputs, inputs.chargesIndexationPct, 0)

  // Remboursement emprunt
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

  const annualCashflow = round2(rentNet - chargesReelles - totalTax - annualLoanPayment)

  // ── Projection ────────────────────────────────────────────────────────────
  const loanTable =
    inputs.financingMode === 'loan'
      ? buildAmortizationTable(
          inputs.loanAmount,
          inputs.interestRatePct / 100,
          inputs.loanDurationYears,
          inputs.insuranceRatePct
        )
      : []

  const projection: YearlyProjection[] = []
  let totalTaxAccum = 0
  let totalCfAccum = 0

  for (let i = 0; i < inputs.holdingPeriodYears; i++) {
    const yearRentNet = annualRentNet(
      inputs.monthlyRent,
      inputs.vacancyRate,
      inputs.rentIndexationPct,
      i
    )
    const yearRentBrut = round2(
      inputs.monthlyRent * 12 * Math.pow(1 + inputs.rentIndexationPct / 100, i)
    )
    const yearAbatt = round2(yearRentNet * seuil.abattement)
    const yearRevenuImp = round2(yearRentNet - yearAbatt)

    const yearIr = calcIr(
      inputs.householdIncome,
      yearRevenuImp,
      inputs.familySituation,
      inputs.childrenCount
    )
    const yearPs = round2(yearRevenuImp * PS_2026.foncier)
    const yearTax = round2(yearIr.irNet + yearPs)

    const yearCharges = annualChargesCourantes(inputs, inputs.chargesIndexationPct, i)

    // Intérêts déductibles (non utilisés en micro mais affichés)
    const loanRow = loanTable[i]
    const interets = loanRow ? round2(loanRow.interets + loanRow.assurance) : 0
    const yearLoanPayment = loanRow ? round2(loanRow.totalVersements + loanRow.assurance) : 0

    const yearCf = round2(yearRentNet - yearCharges - yearTax - yearLoanPayment)

    totalTaxAccum += yearTax
    totalCfAccum += yearCf

    projection.push({
      year: i + 1,
      annualRentBrut: yearRentBrut,
      annualRentNet: yearRentNet,
      chargesCourantes: yearCharges,
      interetsDeduits: interets,
      amortissementUsed: 0,
      amortissementCarryForward: 0,
      deficitCarryForward: 0,
      revenuImposable: yearRevenuImp,
      ir: yearIr.irNet,
      ps: yearPs,
      is: 0,
      totalTax: yearTax,
      loanPayment: yearLoanPayment,
      cashflow: yearCf,
    })
  }

  // ── Plus-value ────────────────────────────────────────────────────────────
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

  // Retour net = flux cumulés + produit net de la vente − mise de fonds initiale
  const initialCashInvested = round2(
    inputs.purchasePrice +
      inputs.notaryFees +
      inputs.renovationWork +
      inputs.furnitureBudget -
      inputs.loanAmount
  )
  const totalReturn = round2(totalCfAccum + netSaleProceeds - initialCashInvested)

  const effectiveTaxRate = rentNet > 0 ? round2(totalTax / rentNet) : 0

  return {
    id: 'microFoncier',
    label: 'Micro-foncier',
    labelShort: 'Micro-foncier',
    isEligible: true,

    annualRentBrut: rentBrut,
    annualRentNet: rentNet,
    chargesDeductibles: abattement,
    abattementPct: seuil.abattement,
    amortissement: 0,
    amortissementReporte: 0,
    revenuImposable,
    deficitImputableRevenuGlobal: 0,
    deficitFoncierReporte: 0,

    ir: irResult.irNet,
    ps,
    is: 0,
    pfuOnDividends: 0,
    cotisationsTns: 0,
    totalTax,
    effectiveTaxRate,

    annualLoanPayment,
    annualRealCharges: chargesReelles,
    annualCashflow,
    monthlyCashflow: round2(annualCashflow / 12),

    projection,
    totalTaxOverHolding: round2(totalTaxAccum),
    totalCashflowOverHolding: round2(totalCfAccum),

    plusValue,
    netSaleProceeds,
    initialCashInvested,
    totalReturn,
  }
}

// ── Helper résultat non éligible ──────────────────────────────────────────────

function buildIneligibleResult(
  id: RegimeResult['id'],
  label: string,
  labelShort: string,
  reason: string,
  inputs: SimulationInputs
): RegimeResult {
  const zeroPV = calcPlusValueParticulier(inputs, inputs.purchasePrice, inputs.holdingPeriodYears)
  return {
    id,
    label,
    labelShort,
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
    initialCashInvested: 0,
    totalReturn: 0,
  }
}
