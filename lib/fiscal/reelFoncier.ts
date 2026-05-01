// ─────────────────────────────────────────────────────────────────────────────
// GIMMO — Régime Réel foncier
// Éligibilité : location nue uniquement
// Déductibilité des charges réelles (intérêts INCLUS), PAS d'amortissements
//
// Règle déficit art. 156 I-3° CGI :
//   - Déficit "hors intérêts" = max(0, charges hors intérêts − recettes)
//     → Imputable sur revenu global dans la limite de 10 700 € (ou 21 400€ énergie)
//   - Déficit dû aux intérêts = part restante
//     → Reportable sur revenus fonciers uniquement (10 ans)
//
// ⚠️  Seules les charges hors intérêts (copro, TF, gestion, travaux, etc.)
//     peuvent créer un déficit imputable sur le revenu global.
//     Les intérêts d'emprunt ne peuvent pas créer ce déficit.
// ─────────────────────────────────────────────────────────────────────────────

import { PS_2026, DEFICIT_FONCIER, FORFAIT_GESTION_FONCIER } from './parameters'
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

export function calcReelFoncier(inputs: SimulationInputs): RegimeResult {
  // ── Éligibilité ──────────────────────────────────────────────────────────
  if (inputs.locationType !== 'nue') {
    return buildIneligibleResult(inputs, 'Réservé à la location nue (bail nu 3 ans)')
  }

  // ── Table d'amortissement du prêt ─────────────────────────────────────────
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

  // Déficit foncier reporté des années précédentes
  // (report sur revenus fonciers uniquement, 10 ans glissants)
  // On suit un tableau FIFO de (montant, annéeExpiry)
  type DeficitEntry = { amount: number; expiresAfterYear: number }
  const deficitPool: DeficitEntry[] = []

  for (let i = 0; i < inputs.holdingPeriodYears; i++) {
    const yearIdx = i
    const yearNum = i + 1

    // Revenus locatifs nets
    const rentNet = annualRentNet(
      inputs.monthlyRent,
      inputs.vacancyRate,
      inputs.rentIndexationPct,
      yearIdx
    )
    const rentBrut = round2(
      inputs.monthlyRent * 12 * Math.pow(1 + inputs.rentIndexationPct / 100, yearIdx)
    )

    // Charges courantes (hors intérêts)
    const chargesHorsInterets = annualChargesCourantes(inputs, inputs.chargesIndexationPct, yearIdx)
    // + forfait de gestion réglementaire (art. 31 CGI) intégré dans managementFees

    // Intérêts + assurance déductibles
    const loanRow = loanTable[yearIdx]
    const interets = loanRow ? round2(loanRow.interets + loanRow.assurance) : 0
    const totalVersements = loanRow ? round2(loanRow.totalVersements + loanRow.assurance) : 0

    const totalChargesDeductibles = round2(chargesHorsInterets + interets)

    // ── Calcul du déficit selon art. 156 I-3° CGI ─────────────────────────
    //
    // Étape 1 : résultat "hors intérêts"
    //   Si recettes > charges hors intérêts → pas de déficit hors intérêts
    //   Si recettes < charges hors intérêts → déficit hors intérêts
    //
    // Étape 2 : appliquer intérêts sur le solde restant
    //   Si (recettes − charges hors intérêts) > 0 → on déduit les intérêts
    //   Le résultat peut alors être positif ou négatif
    //   La partie négative due aux intérêts = déficit intérêts (report 10 ans foncier seulement)

    let soldeAvantInterets = round2(rentNet - chargesHorsInterets)
    let deficitHorsInterets = 0

    if (soldeAvantInterets < 0) {
      // Déficit "hors intérêts" pur = imputable sur revenu global
      deficitHorsInterets = Math.abs(soldeAvantInterets)
      soldeAvantInterets = 0
    }

    // On applique les intérêts sur le solde après charges hors intérêts
    const soldeApresInterets = round2(soldeAvantInterets - interets)

    // Déficit dû aux intérêts (ne peut impacter que revenus fonciers)
    const deficitInterets = soldeApresInterets < 0 ? Math.abs(soldeApresInterets) : 0

    // ── Purge des déficits fonciers reportés expirés ──────────────────────
    // Retirer les entrées expirées
    while (deficitPool.length > 0 && deficitPool[0]!.expiresAfterYear < yearNum) {
      deficitPool.shift()
    }

    // ── Revenu foncier brut avant reports ────────────────────────────────
    let revenuFoncierBrut = soldeApresInterets // positif ou 0 (le déficit est géré séparément)

    // Si le résultat après toutes charges est positif, on peut utiliser le report foncier
    let deficitFoncierUsed = 0
    if (revenuFoncierBrut > 0 && deficitPool.length > 0) {
      for (const entry of deficitPool) {
        if (revenuFoncierBrut <= 0) break
        const use = Math.min(entry.amount, revenuFoncierBrut)
        entry.amount -= use
        deficitFoncierUsed += use
        revenuFoncierBrut -= use
      }
      // Nettoyer les entrées épuisées
      while (deficitPool.length > 0 && deficitPool[0]!.amount <= 0) {
        deficitPool.shift()
      }
    }

    // ── Imputation déficit hors-intérêts sur revenu global ────────────────
    const plafondImputationGlobal = DEFICIT_FONCIER.plafondRevenuGlobal
    const deficitImputableGlobal = Math.min(deficitHorsInterets, plafondImputationGlobal)

    // Excédent du déficit hors intérêts (au-delà du plafond) → report foncier
    const deficitHorsInteretsExcedent = round2(deficitHorsInterets - deficitImputableGlobal)

    // Le déficit intérêts + excédent hors intérêts → pool de report foncier
    const newDeficitFoncier = round2(deficitInterets + deficitHorsInteretsExcedent)
    if (newDeficitFoncier > 0) {
      deficitPool.push({
        amount: newDeficitFoncier,
        expiresAfterYear: yearNum + DEFICIT_FONCIER.dureeReport - 1,
      })
    }

    // ── Revenu imposable net ──────────────────────────────────────────────
    // Si résultat > 0 (après utilisation reports), on paie IR+PS
    // Si déficit hors intérêts → revenu global réduit de deficitImputableGlobal
    const revenuImposable = Math.max(0, revenuFoncierBrut)
    const revenuGlobalAjustement = -deficitImputableGlobal // négatif = réduction du revenu global

    // IR sur le résultat foncier (si positif) ou économie IR (si déficit imputé)
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
      // Économie d'IR grâce à l'imputation du déficit sur le revenu global
      const irAvec = calcIr(inputs.householdIncome, 0, inputs.familySituation, inputs.childrenCount)
      const irSans = calcIr(
        inputs.householdIncome,
        -deficitImputableGlobal,
        inputs.familySituation,
        inputs.childrenCount
      )
      // Économie = IR sans déficit − IR avec déficit (négatif = économie)
      yearIrNet = round2(irSans.irNet - irAvec.irNet)
    }

    const yearPs = revenuImposable > 0 ? round2(revenuImposable * PS_2026.foncier) : 0
    const yearTax = round2(yearIrNet + yearPs)

    const yearChargesReelles = annualChargesCourantes(inputs, inputs.chargesIndexationPct, yearIdx)
    const yearCf = round2(rentNet - yearChargesReelles - yearTax - totalVersements)

    totalTaxAccum += yearTax
    totalCfAccum += yearCf

    // Cumul des déficits fonciers restants en fin d'année
    const deficitCumul = round2(deficitPool.reduce((s, e) => s + e.amount, 0))

    projection.push({
      year: yearNum,
      annualRentBrut: rentBrut,
      annualRentNet: rentNet,
      chargesCourantes: yearChargesReelles,
      interetsDeduits: interets,
      amortissementUsed: 0,
      amortissementCarryForward: 0,
      deficitCarryForward: deficitCumul,
      revenuImposable,
      ir: yearIrNet,
      ps: yearPs,
      is: 0,
      totalTax: yearTax,
      loanPayment: totalVersements,
      cashflow: yearCf,
    })
  }

  // ── Résultats Année 1 ─────────────────────────────────────────────────────
  const y1 = projection[0]!

  const chargesReellesY1 = annualChargesCourantes(inputs, inputs.chargesIndexationPct, 0)
  const loanRow0 = loanTable[0]
  const interetsY1 = loanRow0 ? round2(loanRow0.interets + loanRow0.assurance) : 0
  const chargesDeductiblesY1 = round2(chargesReellesY1 + interetsY1)

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
  const totalReturn = round2(totalCfAccum + netSaleProceeds)

  const effectiveTaxRate = y1.annualRentNet > 0 ? round2(y1.totalTax / y1.annualRentNet) : 0

  return {
    id: 'reelFoncier',
    label: 'Réel foncier',
    labelShort: 'Réel foncier',
    isEligible: true,

    annualRentBrut: round2(inputs.monthlyRent * 12),
    annualRentNet: y1.annualRentNet,
    chargesDeductibles: chargesDeductiblesY1,
    amortissement: 0,
    amortissementReporte: 0,
    revenuImposable: y1.revenuImposable,
    deficitImputableRevenuGlobal: floorZero(-y1.revenuImposable), // calculé dans projection
    deficitFoncierReporte: y1.deficitCarryForward,

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
    id: 'reelFoncier',
    label: 'Réel foncier',
    labelShort: 'Réel foncier',
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
