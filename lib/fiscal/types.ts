// ─────────────────────────────────────────────────────────────────────────────
// GIMMO — Types du module fiscal
// Ce fichier est la seule source de vérité pour les types I/O du moteur fiscal.
// Aucune dépendance UI — module pur TypeScript testable isolément.
// ─────────────────────────────────────────────────────────────────────────────

// ── Types de base ─────────────────────────────────────────────────────────────

export type FamilySituation = 'celibataire' | 'couple'
export type PropertyType = 'ancien' | 'neuf' | 'vefa'
export type FinancingMode = 'loan' | 'cash'

/**
 * Type de location — détermine les régimes éligibles et les taux PS applicables.
 * - nue : location nue (bail 3 ans) → régimes fonciers + SCI IR
 * - meublee_ld : meublé longue durée (bail 1 an) → Micro-BIC 50%, Réel LMNP
 * - meublee_tourisme_classe : classé 1-5★ → Micro-BIC 50% / 77 700€ (avant Loi Le Meur)
 * - meublee_tourisme_nc : non classé → Micro-BIC 30% / 15 000€ (Loi Le Meur nov. 2024)
 * - saisonniere : même règles que meublee_tourisme_nc si non classé
 */
export type LocationType =
  | 'nue'
  | 'meublee_ld'
  | 'meublee_tourisme_classe'
  | 'meublee_tourisme_nc'
  | 'saisonniere'

export type RegimeKey =
  | 'microFoncier'
  | 'reelFoncier'
  | 'microBicLmnp'
  | 'reelBicLmnp'
  | 'lmp'
  | 'sciIr'
  | 'sciIs'

// ── Inputs de simulation ──────────────────────────────────────────────────────

/**
 * Toutes les entrées nécessaires au calcul fiscal.
 * Unités : montants en €, taux en décimal (ex: 0.04 = 4%), durées en années.
 */
export interface SimulationInputs {
  // ── Situation personnelle ───────────────────────────────────────────────────
  familySituation: FamilySituation
  childrenCount: number // 0, 1, 2, 3+
  householdIncome: number // Revenu net imposable hors immo (€/an)
  /** Recettes meublées annuelles des AUTRES biens du foyer (pour vérification seuil LMP 23 000 €) */
  existingMeubleRevenues: number // Default 0

  // ── Bien immobilier ─────────────────────────────────────────────────────────
  purchasePrice: number // Prix d'acquisition FAI (€)
  propertyType: PropertyType
  notaryFees: number // Frais de notaire (€)
  renovationWork: number // Travaux initiaux (€) — intégrés à la base amortissable LMNP
  furnitureBudget: number // Mobilier (€) — uniquement si meublé, amorti sur 7 ans
  terrainShare: number // Quote-part terrain NON amortissable (défaut 0.15)

  // ── Financement ─────────────────────────────────────────────────────────────
  financingMode: FinancingMode
  loanAmount: number // Capital emprunté (€) — 0 si cash
  loanDurationYears: number // Durée emprunt (années)
  interestRatePct: number // Taux d'intérêt nominal (%, ex: 4.0)
  insuranceRatePct: number // Taux assurance (% du capital initial/an, ex: 0.36)

  // ── Exploitation ─────────────────────────────────────────────────────────────
  locationType: LocationType
  monthlyRent: number // Loyer mensuel HC (€)
  vacancyRate: number // Taux de vacance (0–1, ex: 0.04 = 4%)
  condoFees: number // Charges copropriété non récupérables (€/an)
  propertyTax: number // Taxe foncière (€/an)
  pnoInsurance: number // Assurance PNO (€/an)
  managementFees: number // Frais de gestion (€/an)
  maintenanceProvision: number // Provision travaux (€/an)
  accountantFees: number // Honoraires comptable (€/an) — 0 si micro, ~600 LMNP réel, ~1500 SCI IS
  cfeFee: number // CFE (€/an) — uniquement LMNP réel, ~300 €

  // ── Horizon ─────────────────────────────────────────────────────────────────
  holdingPeriodYears: number // Durée de détention envisagée (années)

  // ── Hypothèses de projection ────────────────────────────────────────────────
  propertyAppreciationPct: number // Taux de revalorisation annuelle du bien (%, ex: 2.0)
  rentIndexationPct: number // Indexation annuelle des loyers (%, ex: 1.5)
  chargesIndexationPct: number // Indexation annuelle des charges (%, ex: 2.0)
}

// ── Résultats par régime ──────────────────────────────────────────────────────

/** Résultats d'une projection annuelle (cash-flow + fiscalité) */
export interface YearlyProjection {
  year: number
  // Revenus
  annualRentBrut: number
  annualRentNet: number // Après vacance
  // Charges
  chargesCourantes: number // Hors intérêts
  interetsDeduits: number // Intérêts + assurance déductibles cette année
  // Fiscal
  amortissementUsed: number // Amortissement utilisé (0 si résultat avant amort < 0)
  amortissementCarryForward: number // Cumul amortissement reporté à la fin de l'année
  deficitCarryForward: number // Cumul déficit foncier reporté (réel foncier / SCI IR)
  revenuImposable: number // Assiette fiscale nette
  ir: number // IR (négatif = économie)
  ps: number // Prélèvements sociaux
  is: number // IS (SCI IS uniquement)
  totalTax: number
  // Cash-flow
  loanPayment: number // Mensualité × 12
  cashflow: number // Revenus nets - charges réelles - impôts
}

/** Résultat plus-value à la revente selon le régime */
export interface PlusValueResult {
  salePrice: number // Prix de cession estimé
  acquisitionCostRetenu: number // Prix retenu pour le calcul PV
  grossGain: number // PV brute
  abatIrPct: number // % d'abattement IR cumulé
  abatPsPct: number // % d'abattement PS cumulé
  taxableGainIr: number // PV après abattement IR
  taxableGainPs: number // PV après abattement PS
  irOnGain: number // IR sur PV
  psOnGain: number // PS sur PV
  surtaxe: number // Surtaxe si PV > 50 000 €
  totalTaxOnGain: number // IR + PS + surtaxe
  netGain: number // PV nette après impôts
}

/** Résultat complet pour un régime fiscal donné */
export interface RegimeResult {
  // ── Identité ────────────────────────────────────────────────────────────────
  id: RegimeKey
  label: string // Ex: "Réel BIC LMNP"
  labelShort: string // Ex: "Réel LMNP"
  isEligible: boolean
  ineligibilityReason?: string // Raison si non éligible

  // ── Année 1 — détail fiscal ─────────────────────────────────────────────────
  annualRentBrut: number // Loyer brut annuel
  annualRentNet: number // Après vacance
  chargesDeductibles: number // Total charges déductibles (dont abattement ou amort)
  abattementPct?: number // % abattement (micro seulement)
  amortissement: number // Amortissement annuel (LMNP/SCI IS)
  amortissementReporte: number // Amortissement non utilisé reporté
  revenuImposable: number // Résultat fiscal net
  deficitImputableRevenuGlobal: number // > 0 = déficit imputé, < 0 = 0
  deficitFoncierReporte: number // Déficit reportable sur revenus fonciers (10 ans)

  ir: number // Impôt sur le revenu (négatif = économie)
  ps: number // Prélèvements sociaux
  is: number // IS (SCI IS) ou 0
  pfuOnDividends: number // PFU sur dividendes distribués (SCI IS) ou 0
  cotisationsTns: number // Cotisations sociales TNS (LMP) ou 0
  totalTax: number // Charge fiscale totale (peut être négatif)
  effectiveTaxRate: number // totalTax / annualRentNet

  // ── Cash-flow annuel ────────────────────────────────────────────────────────
  annualLoanPayment: number // Remboursement emprunt (capital + intérêts + assurance)
  annualRealCharges: number // Charges effectives payées (copro, TF, PNO, etc.)
  annualCashflow: number // Flux net : revenus - charges réelles - impôts - emprunt
  monthlyCashflow: number

  // ── Projection 20 ans ───────────────────────────────────────────────────────
  projection: YearlyProjection[]
  totalTaxOverHolding: number // Cumul impôts sur la période
  totalCashflowOverHolding: number // Cumul cash-flow sur la période

  // ── Plus-value à la revente ─────────────────────────────────────────────────
  plusValue: PlusValueResult
  netSaleProceeds: number // Net après remboursement crédit + PV

  // ── Retour total ────────────────────────────────────────────────────────────
  initialCashInvested: number // Mise de fonds initiale = prix + frais + travaux + mobilier − emprunt
  totalReturn: number // Profit net = Σcashflows + produit net de la vente − apport initial
}

/** Résultat de compareAllRegimes */
export interface CompareResult {
  inputs: SimulationInputs
  regimes: RegimeResult[]
  eligibleRegimes: RegimeResult[]
  recommendedRegime: RegimeKey | null
  isLmpTriggered: boolean
  lmpTriggerReason?: string
  // Résumé comparatif
  bestRegimeByTax: RegimeKey | null // Régime avec la plus faible charge fiscale an 1
  bestRegimeByReturn: RegimeKey | null // Régime avec le meilleur retour total
}
