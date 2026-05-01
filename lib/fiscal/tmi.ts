// ─────────────────────────────────────────────────────────────────────────────
// GIMMO — Calcul de l'Impôt sur le Revenu (IR)
// Barème progressif 2026 + quotient familial + décote + CSG déductible
// Source légale : LF 2026 art. 4 — CGI art. 197
// ─────────────────────────────────────────────────────────────────────────────

import { IR_BRACKETS_2026, DECOTE_2026 } from './parameters'
import { calcNbParts, round2 } from './utils'
import type { FamilySituation } from './types'

// ── Calcul de l'IR brut sur une base imposable ───────────────────────────────

/**
 * Calcule l'IR brut selon le barème progressif 2026.
 * Applique le quotient familial : base / nbParts → IR sur 1 part × nbParts.
 *
 * @param revenuImposable Revenu net global imposable (€) — peut être 0 ou négatif
 * @param nbParts         Nombre de parts fiscales (ex: 2.5 pour couple + 1 enfant)
 * @returns IR brut avant décote (€) — toujours ≥ 0
 */
function calcIrBrut(revenuImposable: number, nbParts: number): number {
  if (revenuImposable <= 0) return 0

  const baseParPart = revenuImposable / nbParts
  let irParPart = 0

  for (const bracket of IR_BRACKETS_2026) {
    if (baseParPart <= bracket.min) break
    const tranche = Math.min(baseParPart, bracket.max) - bracket.min
    irParPart += tranche * bracket.rate
  }

  return round2(irParPart * nbParts)
}

// ── Décote ────────────────────────────────────────────────────────────────────

/**
 * Calcule la décote applicable sur l'IR brut.
 * Décote = max(0 ; forfait − taux × IR_brut) si IR_brut ≤ plafond
 *
 * Source : CGI art. 197 I-4
 *
 * @param irBrut   IR brut avant décote (€)
 * @param isCouple true si situation couple (mariage ou PACS)
 * @returns Montant de la décote (€) — 0 si non applicable
 */
function calcDecote(irBrut: number, isCouple: boolean): number {
  const plafond = isCouple ? DECOTE_2026.plafondCouple : DECOTE_2026.plafondCelibataire
  const forfait = isCouple ? DECOTE_2026.forfaitCouple : DECOTE_2026.forfaitCelibataire

  if (irBrut > plafond) return 0

  const decote = forfait - DECOTE_2026.taux * irBrut
  return round2(Math.max(0, decote))
}

// ── Calcul IR net (export principal) ─────────────────────────────────────────

export interface IrResult {
  /** IR brut avant décote (€) */
  irBrut: number
  /** Décote (€) */
  decote: number
  /** IR net dû (€) — toujours ≥ 0 */
  irNet: number
  /** Taux marginal d'imposition applicable sur le dernier euro de revenu immobilier */
  tmi: number
  /** Nombre de parts utilisées */
  nbParts: number
}

/**
 * Calcule l'IR net dû sur le revenu global, intégrant le revenu immobilier.
 *
 * Méthode différentielle :
 *   IR_total = IR(revenuBase + revenuImmo) - IR(revenuBase)
 *
 * Cette approche permet de calculer l'impôt MARGINAL dû sur le seul
 * revenu immobilier, en tenant compte du barème progressif et de la
 * position du contribuable dans le barème.
 *
 * @param householdIncome  Revenu net imposable hors immo (€)
 * @param revenuImmo       Revenu foncier/BIC imposable (€) — peut être négatif (déficit)
 * @param situation        Situation familiale
 * @param childrenCount    Nombre d'enfants à charge
 * @returns Détail du calcul IR
 */
export function calcIr(
  householdIncome: number,
  revenuImmo: number,
  situation: FamilySituation,
  childrenCount: number
): IrResult {
  const nbParts = calcNbParts(situation, childrenCount)
  const isCouple = situation !== 'celibataire'

  // Revenu global = revenu hors immo + revenu immo
  // Si le revenu immo est négatif (déficit imputé), il réduit le revenu global
  const revenuGlobal = Math.max(0, householdIncome + revenuImmo)

  // IR brut sur le revenu global total
  const irBrutTotal = calcIrBrut(revenuGlobal, nbParts)

  // IR brut sur le revenu hors immo seul
  const irBrutBase = calcIrBrut(Math.max(0, householdIncome), nbParts)

  // Décotes respectives
  const decoteTotal = calcDecote(irBrutTotal, isCouple)
  const decoteBase = calcDecote(irBrutBase, isCouple)

  // IR nets
  const irNetTotal = round2(Math.max(0, irBrutTotal - decoteTotal))
  const irNetBase = round2(Math.max(0, irBrutBase - decoteBase))

  // IR marginal dû sur le revenu immobilier
  const irMarginal = round2(irNetTotal - irNetBase)

  // TMI = taux de la tranche dans laquelle tombe le dernier euro de revenu immo
  const tmi = calcTmi(revenuGlobal, nbParts)

  return {
    irBrut: irBrutTotal,
    decote: decoteTotal,
    irNet: irMarginal, // On retourne l'IR DÛ sur la partie immo uniquement
    tmi,
    nbParts,
  }
}

// ── TMI ───────────────────────────────────────────────────────────────────────

/**
 * Taux Marginal d'Imposition applicable sur le dernier euro de revenu.
 *
 * @param revenuImposable Revenu net global (€)
 * @param nbParts         Nombre de parts
 */
export function calcTmi(revenuImposable: number, nbParts: number): number {
  if (revenuImposable <= 0) return 0

  const baseParPart = revenuImposable / nbParts
  let tmi = 0

  for (const bracket of IR_BRACKETS_2026) {
    if (baseParPart > bracket.min) {
      tmi = bracket.rate
    }
  }

  return tmi
}

// ── Calcul IS (Impôt sur les Sociétés) ───────────────────────────────────────

import { IS_2026 } from './parameters'

/**
 * Calcule l'IS dû sur un bénéfice fiscal.
 * Applique le taux réduit 15% jusqu'à 42 500€, puis 25%.
 *
 * @param beneficeFiscal Bénéfice imposable (€) — 0 si déficit
 * @returns IS dû (€)
 */
export function calcIs(beneficeFiscal: number): number {
  if (beneficeFiscal <= 0) return 0

  let is = 0
  for (const bracket of IS_2026) {
    if (beneficeFiscal <= bracket.min) break
    const tranche = Math.min(beneficeFiscal, bracket.max) - bracket.min
    is += tranche * bracket.rate
  }

  return round2(is)
}
