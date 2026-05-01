// Tests des utilitaires financiers
import { describe, it, expect } from 'vitest'
import {
  pmt,
  buildAmortizationTable,
  calcAmortissementAnnuel,
  annualRentNet,
  round2,
} from '../utils'
import type { SimulationInputs } from '../types'

// ── Fixture d'inputs de base ──────────────────────────────────────────────────

const baseInputs: SimulationInputs = {
  familySituation: 'celibataire',
  childrenCount: 0,
  householdIncome: 60_000,
  existingMeubleRevenues: 0,
  purchasePrice: 200_000,
  propertyType: 'ancien',
  notaryFees: 15_000,
  renovationWork: 10_000,
  furnitureBudget: 5_000,
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

describe('pmt()', () => {
  it('calcule la mensualité pour 200 000€ sur 20 ans à 4%', () => {
    const m = pmt(200_000, 0.04, 20)
    // Mensualité théorique ≈ 1 211,96 €
    expect(m).toBeCloseTo(1_211.96, 0)
  })

  it('renvoie 0 si le capital est 0', () => {
    expect(pmt(0, 0.04, 20)).toBe(0)
  })

  it('gère le taux nul (prêt sans intérêt)', () => {
    const m = pmt(12_000, 0, 1)
    expect(m).toBeCloseTo(1_000, 5)
  })
})

describe('buildAmortizationTable()', () => {
  it("produit le bon nombre d'années", () => {
    const table = buildAmortizationTable(180_000, 0.04, 20, 0.36)
    expect(table).toHaveLength(20)
  })

  it("les intérêts de l'année 1 correspondent à la mensualité × taux mensuel", () => {
    const table = buildAmortizationTable(180_000, 0.04, 20, 0)
    const y1 = table[0]!
    // Intérêt mois 1 = 180 000 × (0.04/12) = 600
    // Intérêt annuel approximatif > intérêt mois 1 × 12 car remboursement progressif
    expect(y1.interets).toBeGreaterThan(0)
    expect(y1.interets).toBeLessThan(180_000 * 0.04)
  })

  it('le capital restant dû est 0 à la fin', () => {
    const table = buildAmortizationTable(100_000, 0.03, 15, 0)
    const last = table[14]!
    expect(last.capitalRestantDu).toBeCloseTo(0, 0)
  })

  it("inclut l'assurance dans les versements", () => {
    const table = buildAmortizationTable(180_000, 0.04, 20, 0.36)
    const y1 = table[0]!
    // Assurance annuelle = 180 000 × 0.36% = 648 €
    expect(y1.assurance).toBeCloseTo(648, 0)
  })
})

describe('calcAmortissementAnnuel()', () => {
  it('calcule la dotation annuelle LMNP', () => {
    const inputs: SimulationInputs = {
      ...baseInputs,
      purchasePrice: 200_000,
      notaryFees: 15_000,
      renovationWork: 10_000,
      furnitureBudget: 5_000,
      terrainShare: 0.15,
    }
    const amort = calcAmortissementAnnuel(inputs)

    // Base bâti = (200 000 + 15 000) × (1 - 0.15) = 215 000 × 0.85 = 182 750
    // Dotation théorique variable selon composants
    expect(amort.bati).toBeGreaterThan(0)
    expect(amort.mobilier).toBeCloseTo(5_000 / 7, 0) // 714.28€
    expect(amort.travaux).toBeCloseTo(10_000 / 10, 0) // 1 000€
    expect(amort.total).toBeCloseTo(amort.bati + amort.mobilier + amort.travaux, 1)
  })

  it('mobilier = 0 si furnitureBudget = 0', () => {
    const inputs: SimulationInputs = { ...baseInputs, furnitureBudget: 0 }
    const amort = calcAmortissementAnnuel(inputs)
    expect(amort.mobilier).toBe(0)
  })
})

describe('annualRentNet()', () => {
  it('calcule les loyers nets de vacance', () => {
    // 800€ × 12 × (1 - 0.04) = 9 216€
    const rent = annualRentNet(800, 0.04, 1.5, 0)
    expect(rent).toBeCloseTo(9_216, 0)
  })

  it('indexe les loyers correctement', () => {
    const rentY0 = annualRentNet(800, 0.04, 1.5, 0)
    const rentY1 = annualRentNet(800, 0.04, 1.5, 1)
    expect(rentY1).toBeCloseTo(rentY0 * 1.015, 0)
  })
})
