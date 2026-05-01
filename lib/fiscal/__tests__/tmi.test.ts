// Tests du calcul IR / IS
import { describe, it, expect } from 'vitest'
import { calcIr, calcTmi, calcIs } from '../tmi'

describe('calcIr()', () => {
  // ── Cas 1 : célibataire, 60 000€ + 9 600€ revenus fonciers ────────────────
  it('calcule le bon IR marginal pour un célibataire à 30%', () => {
    // Revenu global = 60 000 + 9 600 = 69 600 (tranche 30%)
    const result = calcIr(60_000, 9_600, 'celibataire', 0)
    expect(result.tmi).toBe(0.3)
    // IR marginal ≈ 9 600 × 30% = 2 880 (approx — barème progressif depuis 29 579)
    expect(result.irNet).toBeGreaterThan(0)
    expect(result.irNet).toBeCloseTo(2_880, -2) // tolérance 100€
  })

  // ── Cas 2 : couple, 2 enfants, revenu global 50 000 ──────────────────────
  it('couple 2 enfants → 3 parts → taux marginal réduit', () => {
    // Base/part = 50 000 / 3 = 16 666 → tranche 11%
    const result = calcIr(50_000, 0, 'couple', 2)
    expect(result.nbParts).toBe(3)
    expect(result.tmi).toBe(0.11)
  })

  // ── Cas 3 : revenu foncier négatif (déficit) réduit l'IR ─────────────────
  it("déficit foncier imputé réduit l'IR (économie)", () => {
    // Sans déficit : IR sur 60 000
    const sansDeficit = calcIr(60_000, 0, 'celibataire', 0)
    // Avec déficit -10 000 : IR sur 50 000
    const avecDeficit = calcIr(60_000, -10_000, 'celibataire', 0)
    // L'économie d'IR doit être positive
    expect(avecDeficit.irNet).toBeLessThan(sansDeficit.irNet)
  })

  // ── Cas 4 : décote pour faible revenu ─────────────────────────────────────
  it('applique la décote pour un faible revenu', () => {
    // Revenu très faible → décote attendue
    const result = calcIr(15_000, 0, 'celibataire', 0)
    expect(result.decote).toBeGreaterThan(0)
  })

  // ── Cas 5 : revenu nul → pas d'IR ────────────────────────────────────────
  it('revenu nul → IR nul', () => {
    const result = calcIr(0, 0, 'celibataire', 0)
    expect(result.irNet).toBe(0)
    expect(result.irBrut).toBe(0)
  })
})

describe('calcTmi()', () => {
  it('TMI 0% sous le seuil de la première tranche', () => {
    expect(calcTmi(10_000, 1)).toBe(0)
  })

  it('TMI 11% dans la 2e tranche', () => {
    expect(calcTmi(20_000, 1)).toBe(0.11)
  })

  it('TMI 30% dans la 3e tranche', () => {
    expect(calcTmi(50_000, 1)).toBe(0.3)
  })

  it('TMI 41% dans la 4e tranche', () => {
    expect(calcTmi(100_000, 1)).toBe(0.41)
  })

  it('TMI 45% dans la tranche maximale', () => {
    expect(calcTmi(200_000, 1)).toBe(0.45)
  })
})

describe('calcIs()', () => {
  it('IS 15% sur les 42 500 premiers euros', () => {
    const is = calcIs(42_500)
    expect(is).toBeCloseTo(42_500 * 0.15, 0)
  })

  it('IS mixte au-dessus de 42 500€', () => {
    // 42 500 × 15% + 7 500 × 25% = 6 375 + 1 875 = 8 250
    const is = calcIs(50_000)
    expect(is).toBeCloseTo(8_250, 0)
  })

  it('IS nul si bénéfice nul', () => {
    expect(calcIs(0)).toBe(0)
  })

  it('IS nul si bénéfice négatif (déficit)', () => {
    expect(calcIs(-5_000)).toBe(0)
  })
})
