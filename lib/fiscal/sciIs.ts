// ─────────────────────────────────────────────────────────────────────────────
// GIMMO — Régime SCI à l'IS (Impôt sur les Sociétés)
// Éligibilité : location nue OU meublée (mais meublée = BIC → IS automatique)
//
// Fonctionnement :
//   1. SCI paie l'IS sur son bénéfice fiscal (amortissements déductibles)
//   2. Distribution des dividendes → PFU 30% (12,8% IR + 17,2% → 18,6% PS post-LFSS 2026)
//   3. Double imposition : IS + PFU sur dividendes
//
// Avantage :
//   - Amortissements déductibles → réduction de l'IS en phase de détention
//   - Utile si on ne distribue pas les dividendes (capitalisation)
//
// Inconvénient :
//   - Double imposition IS + PFU à la sortie
//   - Plus-value de cession taxée à l'IS (pas d'abattement durée de détention)
//   - Comptabilité commerciale obligatoire (~1 500€/an)
//
// En V1 : on suppose 100% de distribution des dividendes chaque année
// pour comparer le cash-flow réel avec les autres régimes.
// ─────────────────────────────────────────────────────────────────────────────

import { PFU, PS_2026 } from './parameters'
import { calcIs } from './tmi'
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
import { calcPlusValueSciIs } from './plusValue'
import type { SimulationInputs, RegimeResult, YearlyProjection } from './types'

export function calcSciIs(inputs: SimulationInputs): RegimeResult {
  // SCI IS éligible pour location nue ET meublée
  // (tous les types de location sont acceptés en SCI IS)

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

  // Report d'amortissements (si résultat fiscal négatif en SCI IS → report de déficit)
  let amortCarryForward = 0
  let amortCumulDeduit = 0
  // Report de déficit IS (en SCI IS, les déficits se reportent 5 ans sans limitation)
  let deficitIsCarry = 0

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

    // En SCI IS, les amortissements sont déductibles sans limite
    // (pas de règle anti-déficit BIC — règles IS différentes)
    const amortDisponible = round2(amortAnnuelTotal + amortCarryForward)
    const amortUsed = amortDisponible
    const resultatApresAmort = round2(resultatAvantAmort - amortUsed)

    amortCarryForward = 0 // En SCI IS, on déduit tout l'amortissement disponible
    amortCumulDeduit += amortUsed

    // Résultat fiscal après report de déficit IS
    let resultatFiscal = resultatApresAmort
    if (deficitIsCarry > 0 && resultatFiscal > 0) {
      const utilise = Math.min(deficitIsCarry, resultatFiscal)
      deficitIsCarry -= utilise
      resultatFiscal -= utilise
    } else if (resultatFiscal < 0) {
      deficitIsCarry = round2(deficitIsCarry + Math.abs(resultatFiscal))
      resultatFiscal = 0
    }

    // IS sur le bénéfice fiscal
    const yearIs = calcIs(resultatFiscal)

    // Résultat net après IS = dividende distribuable
    const resultatNetApresIs = round2(Math.max(0, resultatFiscal - yearIs))

    // PFU sur dividendes distribués (hypothèse V1 : 100% distribué)
    const pfuIr = round2(resultatNetApresIs * PFU.ir)
    const pfuPs = round2(resultatNetApresIs * PS_2026.dividendesSciIs) // 18,6% LFSS 2026
    const yearPfu = round2(pfuIr + pfuPs)

    const yearTax = round2(yearIs + yearPfu)

    // Cash-flow réel = loyers - charges - remboursement - IS - PFU (si distribution)
    const yearCf = round2(rentNet - charges - yearLoanPayment - yearIs - yearPfu)

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
      deficitCarryForward: deficitIsCarry,
      revenuImposable: resultatFiscal,
      ir: pfuIr,
      ps: pfuPs,
      is: yearIs,
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

  // ── Plus-value SCI IS (IS uniquement, pas d'abattement, réintégration amorts) ─
  const salePrice = estimateSalePrice(
    inputs.purchasePrice,
    inputs.holdingPeriodYears,
    inputs.propertyAppreciationPct
  )
  const plusValue = calcPlusValueSciIs(inputs, salePrice, amortCumulDeduit)

  const remainingDebt =
    inputs.financingMode === 'loan'
      ? remainingBalance(
          inputs.loanAmount,
          inputs.interestRatePct / 100,
          inputs.loanDurationYears,
          inputs.holdingPeriodYears
        )
      : 0

  // Net de cession = prix - PV IS - dette résiduelle
  // Puis distribution du solde → PFU sur le résultat de cession net d'IS
  const pvNetApresIs = round2(plusValue.grossGain - plusValue.totalTaxOnGain) // IS seulement
  const pfuCession = round2(pvNetApresIs * PFU.total)
  const netSaleProceeds = round2(salePrice - plusValue.totalTaxOnGain - pfuCession - remainingDebt)

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

  return {
    id: 'sciIs',
    label: "SCI à l'IS",
    labelShort: 'SCI IS',
    isEligible: true,

    annualRentBrut: round2(inputs.monthlyRent * 12),
    annualRentNet: rentNetY1,
    chargesDeductibles: round2(chargesY1 + interetsY1 + y1.amortissementUsed),
    amortissement: amortAnnuelTotal,
    amortissementReporte: 0,
    revenuImposable: y1.revenuImposable,
    deficitImputableRevenuGlobal: 0,
    deficitFoncierReporte: 0,

    ir: y1.ir, // = PFU IR sur dividendes
    ps: y1.ps, // = PFU PS sur dividendes
    is: y1.is,
    pfuOnDividends: round2(y1.ir + y1.ps),
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
