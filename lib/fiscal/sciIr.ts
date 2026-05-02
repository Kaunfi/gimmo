// ─────────────────────────────────────────────────────────────────────────────
// GIMMO — Régime SCI à l'IR (Société Civile Immobilière translucide)
// Éligibilité : location nue uniquement
// (SCI meublée = requalification BIC → impossibilité IR, sauf LMP)
//
// Fonctionnement :
//   - Transparence fiscale : les revenus remontent aux associés (quote-part IR)
//   - Même règles que le réel foncier (déduction intérêts, charges, PAS d'amortissements)
//   - Même règles de déficit foncier art. 156 I-3° CGI
//   - En V1 : on considère que l'associé principal détient 100% des parts
//
// Différences vs réel foncier :
//   - Charges comptables SCI ajoutées (comptable + juridique ~1 500€/an)
//   - Transmission/succession facilitée (hors scope calcul fiscal)
// ─────────────────────────────────────────────────────────────────────────────

import { PS_2026, DEFICIT_FONCIER } from './parameters'
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

export function calcSciIr(inputs: SimulationInputs): RegimeResult {
  // ── Éligibilité ──────────────────────────────────────────────────────────
  if (inputs.locationType !== 'nue') {
    return buildIneligibleResult(
      inputs,
      'SCI IR réservée à la location nue (la location meublée en SCI entraîne requalification BIC)'
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

  type DeficitEntry = { amount: number; expiresAfterYear: number }
  const deficitPool: DeficitEntry[] = []

  for (let i = 0; i < inputs.holdingPeriodYears; i++) {
    const yearNum = i + 1

    const rentNet = annualRentNet(
      inputs.monthlyRent,
      inputs.vacancyRate,
      inputs.rentIndexationPct,
      i
    )
    const rentBrut = round2(
      inputs.monthlyRent * 12 * Math.pow(1 + inputs.rentIndexationPct / 100, i)
    )

    // Charges SCI : charges courantes + frais comptable/juridique SCI
    const chargesBase = annualChargesCourantes(inputs, inputs.chargesIndexationPct, i)
    // accountantFees inclut déjà les frais SCI si l'utilisateur les a saisis

    const loanRow = loanTable[i]
    const interets = loanRow ? round2(loanRow.interets + loanRow.assurance) : 0
    const yearLoanPayment = loanRow ? round2(loanRow.totalVersements + loanRow.assurance) : 0

    // ── Même logique déficit foncier que réel foncier ─────────────────────
    let soldeAvantInterets = round2(rentNet - chargesBase)
    let deficitHorsInterets = 0

    if (soldeAvantInterets < 0) {
      deficitHorsInterets = Math.abs(soldeAvantInterets)
      soldeAvantInterets = 0
    }

    const soldeApresInterets = round2(soldeAvantInterets - interets)
    const deficitInterets = soldeApresInterets < 0 ? Math.abs(soldeApresInterets) : 0

    // Purge des déficits expirés
    while (deficitPool.length > 0 && deficitPool[0]!.expiresAfterYear < yearNum) {
      deficitPool.shift()
    }

    // Utilisation des reports de déficit foncier
    let revenuFoncierBrut = soldeApresInterets
    if (revenuFoncierBrut > 0 && deficitPool.length > 0) {
      for (const entry of deficitPool) {
        if (revenuFoncierBrut <= 0) break
        const use = Math.min(entry.amount, revenuFoncierBrut)
        entry.amount -= use
        revenuFoncierBrut -= use
      }
      while (deficitPool.length > 0 && deficitPool[0]!.amount <= 0) {
        deficitPool.shift()
      }
    }

    // Imputation déficit hors intérêts sur revenu global
    const deficitImputableGlobal = Math.min(
      deficitHorsInterets,
      DEFICIT_FONCIER.plafondRevenuGlobal
    )
    const deficitHorsInteretsExcedent = round2(deficitHorsInterets - deficitImputableGlobal)

    const newDeficitFoncier = round2(deficitInterets + deficitHorsInteretsExcedent)
    if (newDeficitFoncier > 0) {
      deficitPool.push({
        amount: newDeficitFoncier,
        expiresAfterYear: yearNum + DEFICIT_FONCIER.dureeReport - 1,
      })
    }

    const revenuImposable = Math.max(0, revenuFoncierBrut)

    let yearIrNet = 0
    if (revenuImposable > 0) {
      const irResult = calcIr(
        inputs.householdIncome,
        revenuImposable,
        inputs.familySituation,
        inputs.childrenCount
      )
      yearIrNet = irResult.irNet
    } else if (deficitImputableGlobal > 0) {
      const irAvec = calcIr(inputs.householdIncome, 0, inputs.familySituation, inputs.childrenCount)
      const irSans = calcIr(
        inputs.householdIncome,
        -deficitImputableGlobal,
        inputs.familySituation,
        inputs.childrenCount
      )
      yearIrNet = round2(irSans.irNet - irAvec.irNet)
    }

    const yearPs = revenuImposable > 0 ? round2(revenuImposable * PS_2026.foncier) : 0
    const yearTax = round2(yearIrNet + yearPs)

    const yearCf = round2(rentNet - chargesBase - yearTax - yearLoanPayment)

    totalTaxAccum += yearTax
    totalCfAccum += yearCf

    const deficitCumul = round2(deficitPool.reduce((s, e) => s + e.amount, 0))

    projection.push({
      year: yearNum,
      annualRentBrut: rentBrut,
      annualRentNet: rentNet,
      chargesCourantes: chargesBase,
      interetsDeduits: interets,
      amortissementUsed: 0,
      amortissementCarryForward: 0,
      deficitCarryForward: deficitCumul,
      revenuImposable,
      ir: yearIrNet,
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
  const effectiveTaxRate = y1.annualRentNet > 0 ? round2(y1.totalTax / y1.annualRentNet) : 0

  return {
    id: 'sciIr',
    label: "SCI à l'IR",
    labelShort: 'SCI IR',
    isEligible: true,

    annualRentBrut: round2(inputs.monthlyRent * 12),
    annualRentNet: rentNetY1,
    chargesDeductibles: round2(chargesY1 + interetsY1),
    amortissement: 0,
    amortissementReporte: 0,
    revenuImposable: y1.revenuImposable,
    deficitImputableRevenuGlobal: 0,
    deficitFoncierReporte: y1.deficitCarryForward,

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
    initialCashInvested,
    totalReturn,
  }
}

// ── Helper résultat non éligible ──────────────────────────────────────────────

function buildIneligibleResult(inputs: SimulationInputs, reason: string): RegimeResult {
  const zeroPV = calcPlusValueParticulier(inputs, inputs.purchasePrice, inputs.holdingPeriodYears)
  return {
    id: 'sciIr',
    label: "SCI à l'IR",
    labelShort: 'SCI IR',
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
