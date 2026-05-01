// ─────────────────────────────────────────────────────────────────────────────
// GIMMO — Module fiscal — Point d'entrée public
// ─────────────────────────────────────────────────────────────────────────────

// Types
export type {
  SimulationInputs,
  RegimeResult,
  RegimeKey,
  YearlyProjection,
  PlusValueResult,
  CompareResult,
  FamilySituation,
  PropertyType,
  FinancingMode,
  LocationType,
} from './types'

// Paramètres
export {
  IR_BRACKETS_2026,
  DECOTE_2026,
  PS_2026,
  MICRO_SEUILS_2026,
  LMP_SEUIL_RECETTES,
  IS_2026,
  PFU,
  AMORTISSEMENT,
  DEFICIT_FONCIER,
  PLUS_VALUE,
  PARTS_FISCALES,
  PROJECTION_DEFAULTS,
  LMNP_DEFAULTS,
  SCI_IS_DEFAULTS,
  FORFAIT_GESTION_FONCIER,
} from './parameters'

// Utilitaires
export {
  pmt,
  buildAmortizationTable,
  calcAmortissementAnnuel,
  annualRentNet,
  annualChargesCourantes,
  remainingBalance,
  estimateSalePrice,
  round2,
  clamp,
  floorZero,
} from './utils'
export type { YearlyLoanBreakdown, AmortissementAnnuel } from './utils'

// Calcul IR / IS
export { calcIr, calcTmi, calcIs } from './tmi'
export type { IrResult } from './tmi'

// Plus-values
export {
  calcPlusValueParticulier,
  calcPlusValueLmnp,
  calcPlusValueSciIs,
  calcAbattIr,
  calcAbattPs,
} from './plusValue'

// Régimes individuels
export { calcMicroFoncier } from './microFoncier'
export { calcReelFoncier } from './reelFoncier'
export { calcMicroBicLmnp } from './microBicLmnp'
export { calcReelBicLmnp } from './reelBicLmnp'
export { calcLmp } from './lmp'
export { calcSciIr } from './sciIr'
export { calcSciIs } from './sciIs'

// Comparateur (point d'entrée principal)
export { compareAllRegimes, checkLmpTrigger } from './compareRegimes'
export type { LmpCheck } from './compareRegimes'
