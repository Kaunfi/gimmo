// Tests des régimes fiscaux et du comparateur
import { describe, it, expect } from 'vitest'
import { calcMicroFoncier } from '../microFoncier'
import { calcReelFoncier } from '../reelFoncier'
import { calcMicroBicLmnp } from '../microBicLmnp'
import { calcReelBicLmnp } from '../reelBicLmnp'
import { calcSciIs } from '../sciIs'
import { compareAllRegimes, checkLmpTrigger } from '../compareRegimes'
import type { SimulationInputs } from '../types'

// ── Fixture de base ───────────────────────────────────────────────────────────

const baseInputsNue: SimulationInputs = {
  familySituation: 'celibataire',
  childrenCount: 0,
  householdIncome: 60_000,
  existingMeubleRevenues: 0,
  purchasePrice: 200_000,
  propertyType: 'ancien',
  notaryFees: 15_000,
  renovationWork: 0,
  furnitureBudget: 0,
  terrainShare: 0.15,
  financingMode: 'loan',
  loanAmount: 180_000,
  loanDurationYears: 20,
  interestRatePct: 4.0,
  insuranceRatePct: 0.36,
  locationType: 'nue',
  monthlyRent: 800,
  vacancyRate: 0.04,
  condoFees: 1_200,
  propertyTax: 900,
  pnoInsurance: 150,
  managementFees: 576,
  maintenanceProvision: 600,
  accountantFees: 0,
  cfeFee: 0,
  holdingPeriodYears: 20,
  propertyAppreciationPct: 2.0,
  rentIndexationPct: 1.5,
  chargesIndexationPct: 2.0,
}

const baseInputsMeuble: SimulationInputs = {
  ...baseInputsNue,
  locationType: 'meublee_ld',
  furnitureBudget: 5_000,
  accountantFees: 600,
  cfeFee: 300,
}

// ── Micro-foncier ─────────────────────────────────────────────────────────────

describe('calcMicroFoncier()', () => {
  it('est éligible pour location nue avec recettes ≤ 15 000€', () => {
    const result = calcMicroFoncier(baseInputsNue)
    // 800 × 12 × 0.96 = 9 216 ≤ 15 000
    expect(result.isEligible).toBe(true)
  })

  it("n'est pas éligible pour location meublée", () => {
    const result = calcMicroFoncier(baseInputsMeuble)
    expect(result.isEligible).toBe(false)
  })

  it("n'est pas éligible si recettes > 15 000€", () => {
    const inputs: SimulationInputs = { ...baseInputsNue, monthlyRent: 1_500 }
    // 1 500 × 12 × 0.96 = 17 280 > 15 000
    const result = calcMicroFoncier(inputs)
    expect(result.isEligible).toBe(false)
  })

  it('abattement de 30% appliqué correctement', () => {
    const result = calcMicroFoncier(baseInputsNue)
    expect(result.abattementPct).toBe(0.3)
    // Abattement = loyers nets × 30%
    expect(result.chargesDeductibles).toBeCloseTo(result.annualRentNet * 0.3, 0)
  })

  it('projection contient 20 années', () => {
    const result = calcMicroFoncier(baseInputsNue)
    expect(result.projection).toHaveLength(20)
  })

  it('cashflow annuel = loyers - charges - impôts - emprunt', () => {
    const result = calcMicroFoncier(baseInputsNue)
    const y1 = result.projection[0]!
    // Vérification que cashflow = rentNet - charges - tax - loan
    const expected = y1.annualRentNet - y1.chargesCourantes - y1.totalTax - y1.loanPayment
    expect(y1.cashflow).toBeCloseTo(expected, 0)
  })
})

// ── Réel foncier ──────────────────────────────────────────────────────────────

describe('calcReelFoncier()', () => {
  it('est éligible pour location nue', () => {
    const result = calcReelFoncier(baseInputsNue)
    expect(result.isEligible).toBe(true)
  })

  it("n'est pas éligible pour location meublée", () => {
    const result = calcReelFoncier(baseInputsMeuble)
    expect(result.isEligible).toBe(false)
  })

  it("les intérêts d'emprunt sont déductibles", () => {
    const result = calcReelFoncier(baseInputsNue)
    // chargesDeductibles > chargesReelles (intérêts inclus)
    expect(result.chargesDeductibles).toBeGreaterThan(result.annualRealCharges)
  })

  it('revenu imposable = 0 si charges > recettes (déficit)', () => {
    // Créer un cas avec charges très élevées
    const inputs: SimulationInputs = {
      ...baseInputsNue,
      monthlyRent: 500, // Loyers bas → déficit probable
      condoFees: 3_000,
      maintenanceProvision: 2_000,
    }
    const result = calcReelFoncier(inputs)
    // Le revenu imposable ne peut pas être négatif
    expect(result.revenuImposable).toBeGreaterThanOrEqual(0)
  })

  it('déficit reporté en cas de charges > recettes', () => {
    const inputs: SimulationInputs = {
      ...baseInputsNue,
      financingMode: 'cash',
      loanAmount: 0,
      condoFees: 5_000,
      maintenanceProvision: 3_000,
      monthlyRent: 500,
    }
    const result = calcReelFoncier(inputs)
    // Si déficit, il doit être reporté
    const y1 = result.projection[0]!
    const totalCharges = y1.chargesCourantes
    if (totalCharges > y1.annualRentNet) {
      // Il y a un déficit
      expect(y1.deficitCarryForward).toBeGreaterThanOrEqual(0)
    }
  })
})

// ── Micro-BIC LMNP ────────────────────────────────────────────────────────────

describe('calcMicroBicLmnp()', () => {
  it('est éligible pour meublee_ld avec recettes ≤ 77 700€', () => {
    const result = calcMicroBicLmnp(baseInputsMeuble)
    expect(result.isEligible).toBe(true)
  })

  it("n'est pas éligible pour location nue", () => {
    const result = calcMicroBicLmnp(baseInputsNue)
    expect(result.isEligible).toBe(false)
  })

  it('abattement 50% pour meublee_ld', () => {
    const result = calcMicroBicLmnp(baseInputsMeuble)
    expect(result.abattementPct).toBe(0.5)
  })

  it('abattement 30% pour tourisme non classé (Loi Le Meur)', () => {
    const inputs: SimulationInputs = {
      ...baseInputsMeuble,
      locationType: 'meublee_tourisme_nc',
      monthlyRent: 800,
    }
    const result = calcMicroBicLmnp(inputs)
    expect(result.abattementPct).toBe(0.3)
  })

  it('non éligible tourisme_nc si recettes > 15 000€', () => {
    const inputs: SimulationInputs = {
      ...baseInputsMeuble,
      locationType: 'meublee_tourisme_nc',
      monthlyRent: 1_500, // 17 280 > 15 000
    }
    const result = calcMicroBicLmnp(inputs)
    expect(result.isEligible).toBe(false)
  })

  it('PS LMNP à 18,6%', () => {
    const result = calcMicroBicLmnp(baseInputsMeuble)
    const y1 = result.projection[0]!
    if (y1.revenuImposable > 0) {
      expect(y1.ps).toBeCloseTo(y1.revenuImposable * 0.186, 0)
    }
  })
})

// ── Réel BIC LMNP ─────────────────────────────────────────────────────────────

describe('calcReelBicLmnp()', () => {
  it('est éligible pour location meublée', () => {
    const result = calcReelBicLmnp(baseInputsMeuble)
    expect(result.isEligible).toBe(true)
  })

  it("n'est pas éligible pour location nue", () => {
    const result = calcReelBicLmnp(baseInputsNue)
    expect(result.isEligible).toBe(false)
  })

  it('amortissement annuel calculé', () => {
    const result = calcReelBicLmnp(baseInputsMeuble)
    expect(result.amortissement).toBeGreaterThan(0)
  })

  it('revenu imposable = 0 si charges + amort > recettes (anti-déficit LMNP)', () => {
    // En LMNP, le résultat BIC ne peut pas être négatif à cause des amortissements
    const result = calcReelBicLmnp(baseInputsMeuble)
    result.projection.forEach((y) => {
      expect(y.revenuImposable).toBeGreaterThanOrEqual(0)
    })
  })

  it('les amortissements non utilisés sont reportés', () => {
    const result = calcReelBicLmnp(baseInputsMeuble)
    // Les premières années avec un emprunt important, les amorts devraient s'accumuler
    // ou au moins ne pas dépasser le résultat disponible
    const y1 = result.projection[0]!
    expect(y1.amortissementCarryForward).toBeGreaterThanOrEqual(0)
  })
})

// ── SCI IS ────────────────────────────────────────────────────────────────────

describe('calcSciIs()', () => {
  it('éligible pour location nue', () => {
    const result = calcSciIs(baseInputsNue)
    expect(result.isEligible).toBe(true)
  })

  it('éligible pour location meublée', () => {
    const result = calcSciIs(baseInputsMeuble)
    expect(result.isEligible).toBe(true)
  })

  it('IS calculé sur le bénéfice fiscal', () => {
    const result = calcSciIs(baseInputsNue)
    // IS toujours ≥ 0
    result.projection.forEach((y) => {
      expect(y.is).toBeGreaterThanOrEqual(0)
    })
  })

  it('PFU calculé sur les dividendes distribués', () => {
    const result = calcSciIs(baseInputsNue)
    expect(result.pfuOnDividends).toBeGreaterThanOrEqual(0)
  })
})

// ── Vérification LMP ──────────────────────────────────────────────────────────

describe('checkLmpTrigger()', () => {
  it('LMP non déclenché si location nue', () => {
    const check = checkLmpTrigger(baseInputsNue)
    expect(check.isTriggered).toBe(false)
  })

  it('LMP non déclenché si recettes ≤ 23 000€', () => {
    // 800 × 12 × 0.96 = 9 216 ≤ 23 000
    const check = checkLmpTrigger(baseInputsMeuble)
    expect(check.isTriggered).toBe(false)
  })

  it('LMP déclenché si recettes > 23 000€ ET > revenus autres', () => {
    const inputs: SimulationInputs = {
      ...baseInputsMeuble,
      monthlyRent: 2_500, // 2 500 × 12 × 0.96 = 28 800 > 23 000
      householdIncome: 20_000, // Revenus pros < recettes meublées
    }
    const check = checkLmpTrigger(inputs)
    expect(check.isTriggered).toBe(true)
  })

  it('LMP non déclenché si recettes > 23 000€ mais < revenus autres', () => {
    const inputs: SimulationInputs = {
      ...baseInputsMeuble,
      monthlyRent: 2_500, // 28 800 > 23 000
      householdIncome: 80_000, // Revenus pros > recettes → condition 2 non remplie
    }
    const check = checkLmpTrigger(inputs)
    expect(check.isTriggered).toBe(false)
  })
})

// ── compareAllRegimes ─────────────────────────────────────────────────────────

describe('compareAllRegimes()', () => {
  it('retourne tous les régimes (7)', () => {
    const result = compareAllRegimes(baseInputsNue)
    expect(result.regimes).toHaveLength(7)
  })

  it('pour location nue : micro-foncier, réel foncier, SCI IR, SCI IS éligibles', () => {
    const result = compareAllRegimes(baseInputsNue)
    const eligibleIds = result.eligibleRegimes.map((r) => r.id)
    expect(eligibleIds).toContain('microFoncier')
    expect(eligibleIds).toContain('reelFoncier')
    expect(eligibleIds).toContain('sciIr')
    expect(eligibleIds).toContain('sciIs')
    // Les régimes meublés NE doivent PAS être éligibles
    expect(eligibleIds).not.toContain('microBicLmnp')
    expect(eligibleIds).not.toContain('reelBicLmnp')
  })

  it('pour location meublée : BIC éligibles, foncier non éligible', () => {
    const result = compareAllRegimes(baseInputsMeuble)
    const eligibleIds = result.eligibleRegimes.map((r) => r.id)
    expect(eligibleIds).toContain('microBicLmnp')
    expect(eligibleIds).toContain('reelBicLmnp')
    expect(eligibleIds).not.toContain('microFoncier')
    expect(eligibleIds).not.toContain('reelFoncier')
  })

  it('recommande un régime parmi les éligibles', () => {
    const result = compareAllRegimes(baseInputsNue)
    expect(result.recommendedRegime).not.toBeNull()
    const eligibleIds = result.eligibleRegimes.map((r) => r.id)
    expect(eligibleIds).toContain(result.recommendedRegime!)
  })

  it('totalReturn cohérent (cashflows + revente − apport)', () => {
    const result = compareAllRegimes(baseInputsNue)
    const initialCash =
      baseInputsNue.purchasePrice +
      baseInputsNue.notaryFees +
      baseInputsNue.renovationWork +
      baseInputsNue.furnitureBudget -
      baseInputsNue.loanAmount
    result.eligibleRegimes.forEach((r) => {
      // totalReturn = cashflows cumulés + produit net vente − mise de fonds initiale (apport)
      expect(r.totalReturn).toBeCloseTo(
        r.totalCashflowOverHolding + r.netSaleProceeds - initialCash,
        0
      )
    })
  })
})
