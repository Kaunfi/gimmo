// ─────────────────────────────────────────────────────────────────────────────
// GIMMO — Régime Micro-BIC LMNP
// Éligibilité : location meublée (LD, tourisme classé, tourisme NC)
// Abattements selon le type de location :
//   - meublee_ld : 50% / 77 700 €
//   - meublee_tourisme_classe : 50% / 77 700 € (inchangé Loi Le Meur)
//   - meublee_tourisme_nc : 30% / 15 000 € (Loi Le Meur nov. 2024)
//   - saisonniere : assimilée tourisme_nc si non classé
// PS LMNP : 18,6% (LFSS 2026, rétroactif revenus 2025)
// Source : art. 50-0 CGI + Loi n° 2024-1039 du 19/11/2024
// ─────────────────────────────────────────────────────────────────────────────

import { MICRO_SEUILS_2026, PS_2026 } from './parameters'
import { calcIr } from './tmi'
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
import type { SimulationInputs, RegimeResult, YearlyProjection, LocationType } from './types'

// ── Résolution du seuil micro-BIC selon le type de location ──────────────────

function getMicroSeuil(locationType: LocationType) {
  switch (locationType) {
    case 'meublee_ld':
      return MICRO_SEUILS_2026.microBicLd
    case 'meublee_tourisme_classe':
      return MICRO_SEUILS_2026.microBicTourismeClasse
    case 'meublee_tourisme_nc':
    case 'saisonniere':
      return MICRO_SEUILS_2026.microBicTourismeNc
    default:
      return null
  }
}

export function calcMicroBicLmnp(inputs: SimulationInputs): RegimeResult {
  // ── Éligibilité ──────────────────────────────────────────────────────────
  const seuil = getMicroSeuil(inputs.locationType)

  if (!seuil || inputs.locationType === 'nue') {
    return buildIneligibleResult(inputs, 'Réservé à la location meublée')
  }

  const annualRentBrut = round2(inputs.monthlyRent * 12 * (1 - inputs.vacancyRate))

  if (annualRentBrut > seuil.plafond) {
    const label = inputs.locationType === 'meublee_ld' ? 'Micro-BIC LD' : 'Micro-BIC Tourisme'
    return buildIneligibleResult(
      inputs,
      `Recettes (${annualRentBrut.toLocaleString('fr-FR')} €) dépassent le plafond micro-BIC (${seuil.plafond.toLocaleString('fr-FR')} €)`
    )
  }

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

    // Abattement micro-BIC
    const abattement = round2(Math.max(seuil.plancher, rentNet * seuil.abattement))
    const revenuImposable = round2(Math.max(0, rentNet - abattement))

    // IR marginal
    const irResult = calcIr(
      inputs.householdIncome,
      revenuImposable,
      inputs.familySituation,
      inputs.childrenCount
    )

    // PS LMNP 18,6%
    const yearPs = round2(revenuImposable * PS_2026.lmnp)
    const yearTax = round2(irResult.irNet + yearPs)

    const yearCharges = annualChargesCourantes(inputs, inputs.chargesIndexationPct, i)

    const loanRow = loanTable[i]
    const interets = loanRow ? round2(loanRow.interets + loanRow.assurance) : 0
    const yearLoanPayment = loanRow ? round2(loanRow.totalVersements + loanRow.assurance) : 0

    const yearCf = round2(rentNet - yearCharges - yearTax - yearLoanPayment)

    totalTaxAccum += yearTax
    totalCfAccum += yearCf

    projection.push({
      year: i + 1,
      annualRentBrut: rentBrut,
      annualRentNet: rentNet,
      chargesCourantes: yearCharges,
      interetsDeduits: interets,
      amortissementUsed: 0,
      amortissementCarryForward: 0,
      deficitCarryForward: 0,
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
  const chargesReellesY1 = annualChargesCourantes(inputs, inputs.chargesIndexationPct, 0)
  const abattY1 = round2(Math.max(seuil.plancher, rentNetY1 * seuil.abattement))

  // ── Plus-value ────────────────────────────────────────────────────────────
  // Micro-BIC : pas d'amortissements déduits → PV comme un particulier
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

  const effectiveTaxRate = y1.annualRentNet > 0 ? round2(y1.totalTax / y1.annualRentNet) : 0

  const labelByType =
    inputs.locationType === 'meublee_tourisme_nc' || inputs.locationType === 'saisonniere'
      ? 'Micro-BIC Tourisme NC'
      : inputs.locationType === 'meublee_tourisme_classe'
        ? 'Micro-BIC Tourisme Classé'
        : 'Micro-BIC LMNP'

  return {
    id: 'microBicLmnp',
    label: labelByType,
    labelShort: 'Micro-BIC',
    isEligible: true,

    annualRentBrut: round2(inputs.monthlyRent * 12),
    annualRentNet: rentNetY1,
    chargesDeductibles: abattY1,
    abattementPct: seuil.abattement,
    amortissement: 0,
    amortissementReporte: 0,
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
    annualRealCharges: chargesReellesY1,
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
    id: 'microBicLmnp',
    label: 'Micro-BIC LMNP',
    labelShort: 'Micro-BIC',
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
