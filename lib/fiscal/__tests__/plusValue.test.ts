// Tests des calculs de plus-values immobilières
import { describe, it, expect } from 'vitest'
import { calcAbattIr, calcAbattPs, calcPlusValueParticulier, calcPlusValueLmnp } from '../plusValue'
import type { SimulationInputs } from '../types'

const baseInputs: SimulationInputs = {
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
  financingMode: 'cash',
  loanAmount: 0,
  loanDurationYears: 20,
  interestRatePct: 0,
  insuranceRatePct: 0,
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
  holdingPeriodYears: 15,
  propertyAppreciationPct: 2.0,
  rentIndexationPct: 1.5,
  chargesIndexationPct: 2.0,
}

// ── Abattements ───────────────────────────────────────────────────────────────

describe('calcAbattIr()', () => {
  it('0% si moins de 6 ans', () => {
    expect(calcAbattIr(5)).toBe(0)
    expect(calcAbattIr(0)).toBe(0)
  })

  it('6% à partir de la 6e année', () => {
    expect(calcAbattIr(6)).toBeCloseTo(0.06, 4)
  })

  it('96% à 22 ans (16 × 6%)', () => {
    // 16 années × 6% = 96%, puis 22e = +4% = 100%
    expect(calcAbattIr(21)).toBeCloseTo(0.96, 2) // 16 × 6% = 96% (inclusif)
    expect(calcAbattIr(22)).toBeCloseTo(1.0, 4) // exonération totale
  })

  it('100% à partir de 22 ans', () => {
    expect(calcAbattIr(22)).toBe(1)
    expect(calcAbattIr(30)).toBe(1)
  })
})

describe('calcAbattPs()', () => {
  it('0% si moins de 6 ans', () => {
    expect(calcAbattPs(5)).toBe(0)
  })

  it('1,65% × années à partir de 6 ans', () => {
    // 1 année (6e) × 1,65% = 1,65%
    expect(calcAbattPs(6)).toBeCloseTo(0.0165, 4)
  })

  it('100% exonération à 30 ans', () => {
    expect(calcAbattPs(30)).toBe(1)
  })
})

// ── Plus-value particulier ────────────────────────────────────────────────────

describe('calcPlusValueParticulier()', () => {
  it("PV nulle si prix de cession = coût d'acquisition retenu", () => {
    // Prix 200 000€ + frais 7,5% = 215 000€
    // Si on revend à 215 000€ → PV brute = 0
    const result = calcPlusValueParticulier(baseInputs, 215_000, 15)
    expect(result.grossGain).toBe(0)
    expect(result.totalTaxOnGain).toBe(0)
  })

  it('applique les abattements IR et PS pour une détention de 10 ans', () => {
    const result = calcPlusValueParticulier(baseInputs, 300_000, 10)
    expect(result.grossGain).toBeGreaterThan(0)
    // Abatt IR = 5 × 6% = 30% (années 6,7,8,9,10 — comptage inclusif à partir de la 6e)
    expect(result.abatIrPct).toBeCloseTo(0.3, 2)
    // PV taxable < PV brute
    expect(result.taxableGainIr).toBeLessThan(result.grossGain)
  })

  it('exonération totale IR après 22 ans', () => {
    const result = calcPlusValueParticulier(baseInputs, 400_000, 22)
    expect(result.irOnGain).toBe(0)
    expect(result.abatIrPct).toBe(1)
  })

  it('surtaxe appliquée si PV taxable > 50 000€', () => {
    // Vente à 400 000€ après 5 ans (pas d'abattement)
    const result = calcPlusValueParticulier(
      { ...baseInputs, notaryFees: 0, renovationWork: 0 },
      400_000,
      5
    )
    if (result.taxableGainIr > 50_000) {
      expect(result.surtaxe).toBeGreaterThan(0)
    }
  })
})

// ── Plus-value LMNP (LF 2025 réintégration amortissements) ───────────────────

describe('calcPlusValueLmnp()', () => {
  it('la réintégration des amortissements augmente la PV brute', () => {
    // Sans amortissements
    const pvSansAmort = calcPlusValueParticulier(baseInputs, 300_000, 15)

    // Avec 50 000€ d'amortissements cumulés réintégrés
    const pvAvecAmort = calcPlusValueLmnp(
      { ...baseInputs, locationType: 'meublee_ld' },
      300_000,
      15,
      50_000
    )

    // La PV brute avec réintégration doit être supérieure (amorts réduisent le coût d'achat retenu)
    expect(pvAvecAmort.grossGain).toBeGreaterThan(pvSansAmort.grossGain)
  })

  it("amortissements nuls = même résultat qu'un particulier", () => {
    const pvParticulier = calcPlusValueParticulier(baseInputs, 300_000, 15)
    const pvLmnp = calcPlusValueLmnp({ ...baseInputs, locationType: 'meublee_ld' }, 300_000, 15, 0)

    expect(pvLmnp.grossGain).toBeCloseTo(pvParticulier.grossGain, 0)
  })
})
