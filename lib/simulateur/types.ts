// Types du state du simulateur — synchronisés avec le schéma Prisma et les inputs fiscaux

// ── Étape 1 ──────────────────────────────────────────────────────────────────

export type ProjectStage = 'thinking' | 'identified' | 'owner' | 'restructure'
export type MainGoal = 'cashflow' | 'patrimoine' | 'transmission' | 'retraite' | 'impots'
export type LocationType =
  | 'nue'
  | 'meublee_ld'
  | 'meublee_tourisme_classe'
  | 'meublee_tourisme_nc'
  | 'saisonniere'

// ── Étape 2 ──────────────────────────────────────────────────────────────────

export type FamilySituation = 'single' | 'married' | 'pacsed'

// ── Étape 3 ──────────────────────────────────────────────────────────────────

export type PropertyType = 'ancien' | 'neuf' | 'vefa'

// ── Étape 4 ──────────────────────────────────────────────────────────────────

export type FinancingMode = 'loan' | 'cash'

// ── State complet du simulateur ───────────────────────────────────────────────

export interface SimulateurState {
  // Meta
  currentStep: number

  // Étape 1 — Projet
  projectStage: ProjectStage | null
  mainGoal: MainGoal | null
  locationType: LocationType | null
  isTourismeClasse: boolean | null // null = non demandé encore (seulement pour saisonniere)

  // Étape 2 — Situation personnelle
  familySituation: FamilySituation
  childrenCount: number
  householdIncome: number // €/an — revenu net imposable hors immo
  existingRentals: number // 0 | 1 | 2 | 3+ — biens déjà en location (pour seuil LMP)

  // Étape 3 — Le bien
  purchasePrice: number
  propertyType: PropertyType
  notaryFees: number
  renovationWork: number
  furnitureBudget: number // Uniquement si meublé
  postalCode: string

  // Étape 4 — Financement
  financingMode: FinancingMode
  downPayment: number
  loanDuration: number // années
  interestRate: number // % nominal
  insuranceRate: number // % du capital initial/an

  // Étape 5 — Exploitation
  monthlyRent: number
  vacancyRate: number // 0-1 (ex: 0.04 = 4%)
  condoFees: number // €/an
  propertyTax: number // €/an
  pnoInsurance: number // €/an
  managementFees: number // €/an
  maintenancePct: number // % du loyer brut (ex: 0.05 = 5%)
  holdingPeriod: number // années

  // Gate email
  email: string
  phone: string
  gdprConsent: boolean
  newsletterConsent: boolean
}

// ── Valeurs initiales par défaut (cohérentes avec l'Excel 02_Inputs) ──────────

export const SIMULATEUR_INITIAL_STATE: SimulateurState = {
  currentStep: 1,

  projectStage: null,
  mainGoal: null,
  locationType: null,
  isTourismeClasse: null,

  familySituation: 'single',
  childrenCount: 0,
  householdIncome: 60000,
  existingRentals: 0,

  purchasePrice: 200000,
  propertyType: 'ancien',
  notaryFees: 14000, // ~7% de 200k
  renovationWork: 0,
  furnitureBudget: 5000,
  postalCode: '',

  financingMode: 'loan',
  downPayment: 40000,
  loanDuration: 20,
  interestRate: 4.0,
  insuranceRate: 0.36,

  monthlyRent: 800,
  vacancyRate: 0.04,
  condoFees: 600,
  propertyTax: 1400,
  pnoInsurance: 180,
  managementFees: 0,
  maintenancePct: 0.05,
  holdingPeriod: 20,

  email: '',
  phone: '',
  gdprConsent: false,
  newsletterConsent: true,
}

export const SESSION_STORAGE_KEY = 'gimmo_simulateur_state'
