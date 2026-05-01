// ─────────────────────────────────────────────────────────────────────────────
// GIMMO — Utilitaires financiers
// Fonctions pures : calcul d'emprunt, tableau d'amortissement, helpers fiscaux
// ─────────────────────────────────────────────────────────────────────────────

import type { SimulationInputs } from './types'
import { AMORTISSEMENT } from './parameters'

// ── Calcul de la mensualité (PMT) ─────────────────────────────────────────────

/**
 * Mensualité constante d'un emprunt amortissable.
 * PMT = P × [r(1+r)^n] / [(1+r)^n − 1]
 *
 * @param principal  Capital emprunté (€)
 * @param annualRate Taux d'intérêt nominal annuel (décimal, ex: 0.04)
 * @param years      Durée en années
 * @returns Mensualité (€) — 0 si taux nul
 */
export function pmt(principal: number, annualRate: number, years: number): number {
  if (principal <= 0) return 0
  const n = years * 12
  if (annualRate === 0) return principal / n
  const r = annualRate / 12
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

// ── Mensualité assurance ──────────────────────────────────────────────────────

/**
 * Mensualité d'assurance emprunteur (sur capital initial).
 *
 * @param principal       Capital emprunté (€)
 * @param annualRatePct   Taux assurance annuel en % (ex: 0.36)
 * @returns Mensualité assurance (€)
 */
export function monthlyInsurance(principal: number, annualRatePct: number): number {
  return (principal * annualRatePct) / 100 / 12
}

// ── Tableau d'amortissement annuel ────────────────────────────────────────────

export interface YearlyLoanBreakdown {
  year: number
  /** Intérêts payés dans l'année (€) */
  interets: number
  /** Capital remboursé dans l'année (€) */
  capitalRembourse: number
  /** Capital restant dû en fin d'année (€) */
  capitalRestantDu: number
  /** Assurance payée dans l'année (€) */
  assurance: number
  /** Total des versements dans l'année (hors assurance) */
  totalVersements: number
}

/**
 * Calcule le tableau d'amortissement annuel sur toute la durée du prêt.
 * Utilisé pour extraire, année par année, les intérêts déductibles.
 *
 * @param principal       Capital emprunté (€)
 * @param annualRate      Taux d'intérêt nominal annuel (décimal)
 * @param years           Durée du prêt (années)
 * @param insuranceRatePct Taux assurance annuel (% du capital initial)
 * @returns Tableau d'une entrée par année
 */
export function buildAmortizationTable(
  principal: number,
  annualRate: number,
  years: number,
  insuranceRatePct: number
): YearlyLoanBreakdown[] {
  if (principal <= 0) return []

  const monthly = pmt(principal, annualRate, years)
  const monthlyIns = monthlyInsurance(principal, insuranceRatePct)
  const r = annualRate / 12
  const result: YearlyLoanBreakdown[] = []

  let balance = principal

  for (let year = 1; year <= years; year++) {
    let yearlyInterest = 0
    let yearlyCapital = 0

    for (let m = 0; m < 12; m++) {
      const interestPart = balance * r
      const capitalPart = monthly - interestPart
      yearlyInterest += interestPart
      yearlyCapital += capitalPart
      balance = Math.max(0, balance - capitalPart)
    }

    result.push({
      year,
      interets: round2(yearlyInterest),
      capitalRembourse: round2(yearlyCapital),
      capitalRestantDu: round2(balance),
      assurance: round2(monthlyIns * 12),
      totalVersements: round2(monthly * 12),
    })
  }

  return result
}

// ── Calcul de la mensualité totale (intérêts + capital + assurance) ───────────

/**
 * Mensualité totale payée par l'investisseur (remboursement + assurance).
 */
export function totalMonthlyPayment(
  principal: number,
  annualRate: number,
  years: number,
  insuranceRatePct: number
): number {
  return pmt(principal, annualRate, years) + monthlyInsurance(principal, insuranceRatePct)
}

// ── Amortissement comptable LMNP / SCI IS ────────────────────────────────────

export interface AmortissementAnnuel {
  /** Dotation annuelle totale sur le bâti (€) */
  bati: number
  /** Dotation annuelle sur le mobilier (€) */
  mobilier: number
  /** Dotation annuelle sur les travaux (€) */
  travaux: number
  /** Total dotation annuelle (€) */
  total: number
}

/**
 * Calcule la dotation annuelle aux amortissements pour LMNP réel et SCI IS.
 * Décomposition par composants selon AMORTISSEMENT constant.
 *
 * Base bâti = (purchasePrice + notaryFees) × (1 − terrainShare)
 * Les travaux sont amortis séparément sur 10 ans.
 * Le mobilier est amorti sur 7 ans.
 *
 * @param inputs SimulationInputs complets
 * @returns Dotation annuelle détaillée
 */
export function calcAmortissementAnnuel(inputs: SimulationInputs): AmortissementAnnuel {
  const { purchasePrice, notaryFees, renovationWork, furnitureBudget, terrainShare } = inputs

  // Base amortissable bâti (hors terrain, hors travaux séparés, hors mobilier)
  const baseBati = (purchasePrice + notaryFees) * (1 - terrainShare)

  // Amortissement par composant (dotation annuelle)
  const { bati: batiComp } = AMORTISSEMENT
  const batiAnnuel =
    (baseBati * batiComp.grossOeuvre.quotePart) / batiComp.grossOeuvre.duree +
    (baseBati * batiComp.facade.quotePart) / batiComp.facade.duree +
    (baseBati * batiComp.installations.quotePart) / batiComp.installations.duree +
    (baseBati * batiComp.agencements.quotePart) / batiComp.agencements.duree +
    (baseBati * batiComp.residuel.quotePart) / batiComp.residuel.duree

  // Mobilier (7 ans)
  const mobilierAnnuel = furnitureBudget / AMORTISSEMENT.mobilier.duree

  // Travaux (10 ans)
  const travauxAnnuel = renovationWork / AMORTISSEMENT.travaux.duree

  return {
    bati: round2(batiAnnuel),
    mobilier: round2(mobilierAnnuel),
    travaux: round2(travauxAnnuel),
    total: round2(batiAnnuel + mobilierAnnuel + travauxAnnuel),
  }
}

// ── Indexation annuelle ───────────────────────────────────────────────────────

/**
 * Applique un taux d'indexation annuel à une valeur de base.
 *
 * @param base   Valeur initiale
 * @param ratePct Taux d'indexation annuel (%, ex: 1.5)
 * @param years  Nombre d'années écoulées (0 = année 1, donc pas d'indexation)
 * @returns Valeur indexée
 */
export function applyIndexation(base: number, ratePct: number, years: number): number {
  return base * Math.pow(1 + ratePct / 100, years)
}

// ── Revenus locatifs nets ─────────────────────────────────────────────────────

/**
 * Revenus locatifs nets de vacance pour une année donnée.
 *
 * @param monthlyRent   Loyer mensuel HC de base (€)
 * @param vacancyRate   Taux de vacance (0–1)
 * @param rentIndexPct  Indexation annuelle des loyers (%, ex: 1.5)
 * @param yearIndex     Index d'année (0 = première année, pas d'indexation)
 */
export function annualRentNet(
  monthlyRent: number,
  vacancyRate: number,
  rentIndexPct: number,
  yearIndex: number
): number {
  const indexedMonthly = applyIndexation(monthlyRent, rentIndexPct, yearIndex)
  return round2(indexedMonthly * 12 * (1 - vacancyRate))
}

// ── Charges courantes indexées ────────────────────────────────────────────────

/**
 * Total des charges courantes non-financières pour une année donnée.
 * Inclut : copro, TF, PNO, gestion, maintenance, comptable, CFE.
 * Hors : intérêts d'emprunt, amortissements.
 *
 * @param inputs        SimulationInputs
 * @param chargesIndex  Taux d'indexation annuel des charges (%)
 * @param yearIndex     Index d'année (0 = première année)
 */
export function annualChargesCourantes(
  inputs: SimulationInputs,
  chargesIndex: number,
  yearIndex: number
): number {
  const base =
    inputs.condoFees +
    inputs.propertyTax +
    inputs.pnoInsurance +
    inputs.managementFees +
    inputs.maintenanceProvision +
    inputs.accountantFees +
    inputs.cfeFee

  return round2(applyIndexation(base, chargesIndex, yearIndex))
}

// ── Capital restant dû à date ─────────────────────────────────────────────────

/**
 * Capital restant dû après N années de remboursement.
 * Utilisé pour le calcul du produit net de la revente.
 *
 * @param principal   Capital initial (€)
 * @param annualRate  Taux nominal annuel (décimal)
 * @param totalYears  Durée totale du prêt (années)
 * @param elapsedYears Années déjà remboursées
 */
export function remainingBalance(
  principal: number,
  annualRate: number,
  totalYears: number,
  elapsedYears: number
): number {
  if (principal <= 0) return 0
  if (elapsedYears >= totalYears) return 0

  const table = buildAmortizationTable(principal, annualRate, totalYears, 0)
  const row = table[elapsedYears - 1]
  return row ? row.capitalRestantDu : 0
}

// ── Nombre de parts fiscales ──────────────────────────────────────────────────

import { PARTS_FISCALES } from './parameters'
import type { FamilySituation } from './types'

/**
 * Calcule le nombre de parts fiscales selon la situation familiale et les enfants.
 * Source : art. 193 CGI
 */
export function calcNbParts(situation: FamilySituation, childrenCount: number): number {
  const base = situation === 'celibataire' ? PARTS_FISCALES.celibataire : PARTS_FISCALES.couple

  let parts = base
  const n = Math.max(0, childrenCount)

  if (n >= 1) parts += PARTS_FISCALES.enfant1
  if (n >= 2) parts += PARTS_FISCALES.enfant2
  if (n >= 3) parts += (n - 2) * PARTS_FISCALES.enfant3

  return parts
}

// ── Prix de cession estimé ────────────────────────────────────────────────────

/**
 * Prix de revente estimé après N années selon le taux de revalorisation.
 */
export function estimateSalePrice(
  purchasePrice: number,
  holdingYears: number,
  appreciationPct: number
): number {
  return round2(purchasePrice * Math.pow(1 + appreciationPct / 100, holdingYears))
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Arrondi à 2 décimales (centimes) */
export function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/** Clamp une valeur entre min et max */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/** Renvoie 0 si la valeur est négative */
export function floorZero(value: number): number {
  return Math.max(0, value)
}
