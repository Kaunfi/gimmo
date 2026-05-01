// ─────────────────────────────────────────────────────────────────────────────
// GIMMO — Calcul des plus-values immobilières
// 3 régimes : Particuliers/SCI IR | LMNP post-LF2025 | SCI IS (cession société)
// Sources :
//   - Art. 150 U CGI (particuliers/SCI IR)
//   - LF 2025 art. 84 (réintégration amortissements LMNP)
//   - Art. 219 I CGI (SCI IS — PV = résultat ordinaire)
// ─────────────────────────────────────────────────────────────────────────────

import { PLUS_VALUE, PS_2026 } from './parameters'
import { round2, floorZero } from './utils'
import type { SimulationInputs, PlusValueResult } from './types'

// ── Abattements pour durée de détention ──────────────────────────────────────

/**
 * Calcule l'abattement IR pour durée de détention (particuliers / SCI IR).
 *
 * Barème :
 *  - < 6 ans : 0%
 *  - 6e → 21e année : 6%/an
 *  - 22e année : 4% (→ 100% d'exonération à 22 ans)
 *  - > 22 ans : 100%
 *
 * @param yearsHeld Durée de détention (années entières)
 * @returns Taux d'abattement IR (0–1)
 */
export function calcAbattIr(yearsHeld: number): number {
  const { abattIr } = PLUS_VALUE
  if (yearsHeld < abattIr.seuilDebut) return 0
  if (yearsHeld >= abattIr.seuilExoneration) return 1

  // CGI art. 150 VC : 6%/an "au-delà de la 5e et jusqu'à la 21e" →
  // la 6e année révolue donne déjà 6% (+1 pour comptage inclusif)
  const annees6a21 = Math.min(yearsHeld - abattIr.seuilDebut + 1, 16)
  let abatt = annees6a21 * abattIr.tauxAnnuel6a21

  // 22e année : +4% → total 100%
  if (yearsHeld >= 22) {
    abatt += abattIr.taux22eAnnee
  }

  return Math.min(1, round2(abatt * 100) / 100)
}

/**
 * Calcule l'abattement PS pour durée de détention (particuliers / SCI IR).
 *
 * Barème :
 *  - < 6 ans : 0%
 *  - 6e → 21e : 1,65%/an
 *  - 22e : 1,6%
 *  - 23e → 30e : 9%/an
 *  - ≥ 30 ans : 100%
 *
 * @param yearsHeld Durée de détention (années entières)
 * @returns Taux d'abattement PS (0–1)
 */
export function calcAbattPs(yearsHeld: number): number {
  const { abattPs } = PLUS_VALUE
  if (yearsHeld < abattPs.seuilDebut) return 0
  if (yearsHeld >= abattPs.seuilExoneration) return 1

  // Années 6→21 : 1,65%/an (max 16 ans → 26,4%) — comptage inclusif
  const annees6a21 = Math.min(yearsHeld - abattPs.seuilDebut + 1, 16)
  let abatt = annees6a21 * abattPs.tauxAnnuel6a21

  // 22e année : +1,6%
  if (yearsHeld >= 22) {
    abatt += abattPs.taux22eAnnee
  }

  // 23e→30e : 9%/an (max 8 ans → 72%)
  if (yearsHeld >= 23) {
    const annees23a30 = Math.min(yearsHeld - 22, 8)
    abatt += annees23a30 * abattPs.tauxAnnuel23a30
  }

  return Math.min(1, round2(abatt * 100) / 100)
}

// ── Surtaxe sur PV élevées ────────────────────────────────────────────────────

/**
 * Surtaxe sur les plus-values > 50 000 € (art. 1609 nonies G CGI).
 * Barème réel : 2% à 6% ; on applique 2% (minimum conservateur V1).
 *
 * @param pvTaxableIr PV nette taxable après abattement IR (€)
 * @returns Montant de la surtaxe (€)
 */
export function calcSurtaxe(pvTaxableIr: number): number {
  if (pvTaxableIr <= PLUS_VALUE.surtaxeSeuilPv) return 0
  return round2(pvTaxableIr * PLUS_VALUE.surtaxeTauxMin)
}

// ── Calcul PV — Particuliers / SCI IR ────────────────────────────────────────

/**
 * Plus-value pour un particulier ou une SCI à l'IR.
 * La base d'acquisition est majorée des frais d'acquisition (7,5% forfait)
 * et des travaux (15% forfait si détention > 5 ans, ou justifiés).
 *
 * Amortissements LMNP NON réintégrés (régime particuliers / SCI IR).
 *
 * @param inputs         SimulationInputs
 * @param salePrice      Prix de cession estimé (€)
 * @param yearsHeld      Durée de détention (années entières)
 */
export function calcPlusValueParticulier(
  inputs: SimulationInputs,
  salePrice: number,
  yearsHeld: number
): PlusValueResult {
  const { purchasePrice, notaryFees, renovationWork } = inputs

  // Prix d'acquisition retenu = prix FAI + frais de notaire
  // Frais : soit réels (notaryFees) soit forfait 7,5%
  const fraisReels = notaryFees
  const fraisForfait = purchasePrice * PLUS_VALUE.fraisAcquisitionForfait
  const fraisRetenus = Math.max(fraisReels, fraisForfait)

  // Travaux : soit réels, soit forfait 15% si détention > 5 ans
  const travauxForfait = yearsHeld > 5 ? purchasePrice * PLUS_VALUE.travauxForfait : 0
  const travauxRetenus = Math.max(renovationWork, travauxForfait)

  const acquisitionCostRetenu = round2(purchasePrice + fraisRetenus + travauxRetenus)
  const grossGain = round2(Math.max(0, salePrice - acquisitionCostRetenu))

  const abatIrPct = calcAbattIr(yearsHeld)
  const abatPsPct = calcAbattPs(yearsHeld)

  const taxableGainIr = round2(grossGain * (1 - abatIrPct))
  const taxableGainPs = round2(grossGain * (1 - abatPsPct))

  const irOnGain = round2(taxableGainIr * PLUS_VALUE.tauxIr)
  const psOnGain = round2(taxableGainPs * PLUS_VALUE.tauxPs)
  const surtaxe = calcSurtaxe(taxableGainIr)

  const totalTaxOnGain = round2(irOnGain + psOnGain + surtaxe)
  const netGain = round2(grossGain - totalTaxOnGain)

  return {
    salePrice,
    acquisitionCostRetenu,
    grossGain,
    abatIrPct,
    abatPsPct,
    taxableGainIr,
    taxableGainPs,
    irOnGain,
    psOnGain,
    surtaxe,
    totalTaxOnGain,
    netGain,
  }
}

// ── Calcul PV — LMNP post-LF 2025 (réintégration amortissements) ─────────────

/**
 * Plus-value LMNP après LF 2025 art. 84.
 * Les amortissements DÉDUITS pendant la période de détention sont réintégrés
 * dans le prix de cession (= viennent réduire le coût d'acquisition retenu).
 *
 * Mécanisme :
 *   PV brute = Cession − (Prix acquisition + travaux + frais) + amortissements cumulés réintégrés
 *
 * Les abattements pour durée de détention s'appliquent normalement sur la
 * fraction "classique" de la PV ; la fraction "réintégrée" est taxée à taux plein.
 *
 * En V1 simplifiée : on réintègre 100% des amortissements cumulés dans la PV
 * brute, et on applique les abattements sur toute la PV. C'est légèrement
 * défavorable (conservateur) mais évite la complexité du split.
 *
 * @param inputs              SimulationInputs
 * @param salePrice           Prix de cession estimé (€)
 * @param yearsHeld           Durée de détention (années entières)
 * @param amortCumulDeduit    Cumul des amortissements effectivement déduits (€)
 */
export function calcPlusValueLmnp(
  inputs: SimulationInputs,
  salePrice: number,
  yearsHeld: number,
  amortCumulDeduit: number
): PlusValueResult {
  const { purchasePrice, notaryFees, renovationWork } = inputs

  const fraisReels = notaryFees
  const fraisForfait = purchasePrice * PLUS_VALUE.fraisAcquisitionForfait
  const fraisRetenus = Math.max(fraisReels, fraisForfait)

  const travauxForfait = yearsHeld > 5 ? purchasePrice * PLUS_VALUE.travauxForfait : 0
  const travauxRetenus = Math.max(renovationWork, travauxForfait)

  // LF 2025 art. 84 : les amortissements déduits réduisent la base d'acquisition
  const acquisitionCostRetenu = round2(
    purchasePrice + fraisRetenus + travauxRetenus - amortCumulDeduit
  )

  const grossGain = round2(Math.max(0, salePrice - acquisitionCostRetenu))

  const abatIrPct = calcAbattIr(yearsHeld)
  const abatPsPct = calcAbattPs(yearsHeld)

  const taxableGainIr = round2(grossGain * (1 - abatIrPct))
  const taxableGainPs = round2(grossGain * (1 - abatPsPct))

  const irOnGain = round2(taxableGainIr * PLUS_VALUE.tauxIr)
  const psOnGain = round2(taxableGainPs * PS_2026.lmnp) // LMNP : PS 18,6%
  const surtaxe = calcSurtaxe(taxableGainIr)

  const totalTaxOnGain = round2(irOnGain + psOnGain + surtaxe)
  const netGain = round2(grossGain - totalTaxOnGain)

  return {
    salePrice,
    acquisitionCostRetenu,
    grossGain,
    abatIrPct,
    abatPsPct,
    taxableGainIr,
    taxableGainPs,
    irOnGain,
    psOnGain,
    surtaxe,
    totalTaxOnGain,
    netGain,
  }
}

// ── Calcul PV — SCI IS ────────────────────────────────────────────────────────

/**
 * Plus-value à la cession d'actif dans une SCI IS.
 * La PV est intégrée au résultat ordinaire et imposée à l'IS (15% / 25%).
 * PAS d'abattement pour durée de détention.
 * PAS de PS (l'IS est l'impôt unique au niveau société).
 *
 * La valeur nette comptable (VNC) = prix initial − amortissements cumulés.
 *
 * @param inputs              SimulationInputs
 * @param salePrice           Prix de cession (€)
 * @param amortCumulDeduit    Amortissements cumulés déduits (€)
 */
import { calcIs } from './tmi'

export function calcPlusValueSciIs(
  inputs: SimulationInputs,
  salePrice: number,
  amortCumulDeduit: number
): PlusValueResult {
  const { purchasePrice, notaryFees, renovationWork } = inputs

  // VNC = coût d'acquisition historique − amortissements cumulés
  const acquisitionHistorique = purchasePrice + notaryFees + renovationWork
  const vnc = round2(Math.max(0, acquisitionHistorique - amortCumulDeduit))

  const grossGain = round2(Math.max(0, salePrice - vnc))

  // Pas d'abattement, pas de PS — IS uniquement
  const isOnGain = calcIs(grossGain)

  const totalTaxOnGain = isOnGain
  const netGain = round2(grossGain - totalTaxOnGain)

  return {
    salePrice,
    acquisitionCostRetenu: vnc,
    grossGain,
    abatIrPct: 0,
    abatPsPct: 0,
    taxableGainIr: grossGain,
    taxableGainPs: 0,
    irOnGain: 0,
    psOnGain: 0,
    surtaxe: 0,
    totalTaxOnGain,
    netGain,
  }
}
