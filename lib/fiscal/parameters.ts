// ─────────────────────────────────────────────────────────────────────────────
// GIMMO — Paramètres fiscaux 2026
// Source unique de vérité extraite de : cartographie_fiscale_immobiliere_2026.xlsx
// Feuille : 01_Paramètres_2026
//
// À mettre à jour chaque année après publication de la Loi de Finances.
// Sources légales :
//   - Barème IR : LF 2026, art. 4 (revalorisation +0,9%)
//   - PS LMNP   : LFSS 2026, art. 12 (hausse CSG rétroactive rev. 2025)
//   - Micro-BIC tourisme NC : Loi Le Meur n° 2024-1039 du 19/11/2024
//   - PV LMNP   : LF 2025, art. 84 (réintégration amortissements)
// ─────────────────────────────────────────────────────────────────────────────

// ── Barème IR 2026 (par part de quotient familial) ────────────────────────────
// Référence : LF 2026 art. 4 — CGI art. 197

export const IR_BRACKETS_2026 = [
  { min: 0, max: 11_600, rate: 0 },
  { min: 11_600, max: 29_579, rate: 0.11 },
  { min: 29_579, max: 84_577, rate: 0.3 },
  { min: 84_577, max: 181_917, rate: 0.41 },
  { min: 181_917, max: Infinity, rate: 0.45 },
] as const

// ── Décote 2026 — CGI art. 197 I-4 ──────────────────────────────────────────
export const DECOTE_2026 = {
  /** Plafond IR brut permettant la décote (célibataire) */
  plafondCelibataire: 1_982,
  /** Plafond IR brut permettant la décote (couple) */
  plafondCouple: 3_277,
  /** Forfait décote (célibataire) */
  forfaitCelibataire: 897,
  /** Forfait décote (couple/pacsé) */
  forfaitCouple: 1_483,
  /** Taux de décote : décote = forfait - 45,25% × IR_brut */
  taux: 0.4525,
} as const

// ── Prélèvements sociaux 2026 ─────────────────────────────────────────────────
// Référence : LFSS 2026, art. 12
// ⚠️ ATTENTION : la hausse CSG est RÉTROACTIVE sur les revenus 2025 (déclarés en 2026)
export const PS_2026 = {
  /** Revenus fonciers (location NUE) — EXCLUS de la hausse LFSS 2026 → reste 17,2% */
  foncier: 0.172,
  /**
   * BIC LMNP non professionnel — HAUSSE LFSS 2026 → passe de 17,2% à 18,6%
   * Rétroactif sur revenus 2025 (déclarés en 2026)
   */
  lmnp: 0.186,
  /**
   * Plus-value immobilière (particuliers, SCI IR) — EXCLUS de la hausse → reste 17,2%
   * Source : art. 150-0 A CGI
   */
  plusValueImmobiliere: 0.172,
  /**
   * Dividendes SCI IS distribués — HAUSSE LFSS 2026 → 18,6%
   */
  dividendesSciIs: 0.186,
  /**
   * LMP — cotisations sociales TNS (Sécurité Sociale Indépendants)
   * En réalité 30-45% selon le revenu ; on utilise 30% comme approximation conservatrice
   * Source : Excel 13_Hypothèses_calcul
   */
  lmpTns: 0.3,
  /**
   * CSG déductible du revenu imposable l'année suivante
   * Même taux pour foncier et LMNP (6,8%)
   */
  csgDeductible: 0.068,
} as const

// ── Seuils régimes micro 2026 ─────────────────────────────────────────────────
// Source : art. 32 CGI (micro-foncier) / art. 50-0 CGI (micro-BIC)
export const MICRO_SEUILS_2026 = {
  microFoncier: {
    plafond: 15_000, // Recettes brutes max (€)
    abattement: 0.3, // 30% — réputé couvrir TOUTES les charges
    plancher: 0, // Pas de plancher
  },
  microBicLd: {
    plafond: 77_700, // Meublé longue durée
    abattement: 0.5, // 50%
    plancher: 305, // Plancher d'abattement (€)
  },
  microBicTourismeClasse: {
    plafond: 77_700, // Classé 1-5 étoiles (inchangé par Loi Le Meur)
    abattement: 0.5, // 50%
    plancher: 305,
  },
  /**
   * Meublé de tourisme NON classé — réforme majeure Loi Le Meur (19/11/2024)
   * Alignement sur le régime micro-foncier : 30%/15 000€
   * Source : Loi n° 2024-1039 du 19/11/2024
   */
  microBicTourismeNc: {
    plafond: 15_000, // Baissé de 77 700 → 15 000 €
    abattement: 0.3, // Baissé de 50% → 30%
    plancher: 305,
  },
} as const

// ── Seuil LMP (Loueur Meublé Professionnel) ────────────────────────────────────
// Source : art. 155 IV CGI
// ⚠️ Conditions CUMULATIVES au niveau du FOYER fiscal :
//   1. Recettes meublées annuelles > 23 000 € (tous biens confondus)
//   2. Recettes meublées > autres revenus professionnels du foyer (BIC/BNC/BA/salaires)
export const LMP_SEUIL_RECETTES = 23_000

// ── Impôt sur les Sociétés 2026 ───────────────────────────────────────────────
// Source : art. 219 I CGI
export const IS_2026 = [
  {
    min: 0,
    max: 42_500, // Taux réduit PME : CA < 10 M€, capital libéré, ≥75% personnes physiques
    rate: 0.15,
  },
  { min: 42_500, max: Infinity, rate: 0.25 },
] as const

// ── PFU (Flat Tax) sur dividendes ─────────────────────────────────────────────
// Source : art. 200 A CGI
export const PFU = {
  ir: 0.128, // 12,8% IR (prélèvement forfaitaire)
  ps: 0.186, // 18,6% PS (hausse LFSS 2026)
  total: 0.314, // 31,4% total
} as const

// ── Durées d'amortissement LMNP / SCI IS ──────────────────────────────────────
// Source : Excel 01_Paramètres_2026, lignes R57-R65
// Convention comptable — l'expert-comptable peut affiner selon DTU et nature des travaux
export const AMORTISSEMENT = {
  /**
   * Quote-part terrain — NON amortissable.
   * Conventionnel 10-20% selon localisation ; défaut 15%.
   * Configurable via SimulationInputs.terrainShare
   */
  terrainShare: 0.15,
  bati: {
    grossOeuvre: { quotePart: 0.4, duree: 80 }, // 40% du bâti / 80 ans = 0,5%/an
    facade: { quotePart: 0.1, duree: 30 }, // 10% / 30 ans = 0,33%/an
    installations: { quotePart: 0.2, duree: 25 }, // 20% / 25 ans = 0,4%/an
    agencements: { quotePart: 0.15, duree: 15 }, // 15% / 15 ans = 0,67%/an
    residuel: { quotePart: 0.15, duree: 40 }, // 15% / 40 ans (moy. pondérée résiduel)
  },
  /** Mobilier LMNP — sur valeur totale du mobilier, 7 ans */
  mobilier: { duree: 7 },
  /** Travaux d'amélioration — 10 ans (peut varier selon nature) */
  travaux: { duree: 10 },
} as const

// ── Déficit foncier — art. 156 I-3° CGI ──────────────────────────────────────
export const DEFICIT_FONCIER = {
  /** Plafond d'imputation sur le revenu global (€/an) */
  plafondRevenuGlobal: 10_700,
  /**
   * Plafond doublé pour travaux de rénovation énergétique (jusqu'au 31/12/2025)
   * Prorogation possible par LF 2026 — à vérifier
   */
  plafondRevenuGlobalEnergie: 21_400,
  /** Durée de report sur les revenus fonciers uniquement (années) */
  dureeReport: 10,
  /** Obligation de maintien en location après imputation (années) */
  obligationLocation: 3,
} as const

// ── Plus-values immobilières — art. 150 U et suivants CGI ─────────────────────
export const PLUS_VALUE = {
  // Taux d'imposition
  tauxIr: 0.19, // Forfaitaire — art. 200 B CGI
  tauxPs: 0.172, // Exclus de la hausse LFSS 2026

  // Abattements pour durée de détention — particuliers & SCI IR
  abattIr: {
    // 0% avant 6 ans, puis 6%/an de la 6e à la 21e, puis 4% la 22e → 100% à 22 ans
    seuilDebut: 6,
    tauxAnnuel6a21: 0.06, // 6% × 16 ans = 96%
    taux22eAnnee: 0.04, // 4% → 100%
    seuilExoneration: 22,
  },
  abattPs: {
    // 0% avant 6 ans
    seuilDebut: 6,
    tauxAnnuel6a21: 0.0165, // 1,65% × 16 ans = 26,4%
    taux22eAnnee: 0.016, // 1,6%
    tauxAnnuel23a30: 0.09, // 9% × 8 ans = 72% → 100% à 30 ans
    seuilExoneration: 30,
  },

  // Forfaits déductibles du prix d'acquisition
  fraisAcquisitionForfait: 0.075, // 7,5% du prix — à défaut de justificatifs
  travauxForfait: 0.15, // 15% du prix — si détention > 5 ans, à défaut de justificatifs

  // Surtaxe sur les plus-values élevées — art. 1609 nonies G CGI
  // En réalité barème progressif de 2% à 6%, on applique 2% (minimum) si PV > 50 000€
  surtaxeSeuilPv: 50_000,
  surtaxeTauxMin: 0.02, // 2% minimum
} as const

// ── Quotient familial ─────────────────────────────────────────────────────────
// Source : art. 193 CGI
export const PARTS_FISCALES = {
  celibataire: 1,
  couple: 2, // Mariage ou PACS
  enfant1: 0.5,
  enfant2: 0.5, // 0,5 pour le 2e (total +1 pour 2 enfants)
  enfant3: 1, // +1 par enfant à partir du 3e
} as const

// ── Paramètres de projection (défauts — modifiables par l'utilisateur) ────────
export const PROJECTION_DEFAULTS = {
  propertyAppreciationPct: 2.0, // Revalorisation annuelle du bien (%/an)
  rentIndexationPct: 1.5, // Indexation loyers IRL (%/an)
  chargesIndexationPct: 2.0, // Indexation charges (%/an)
} as const

// ── Charges forfaitaires LMNP ─────────────────────────────────────────────────
export const LMNP_DEFAULTS = {
  /** CFE (Cotisation Foncière des Entreprises) — variable selon commune, défaut 300€ */
  cfe: 300,
  /** Honoraires comptable — variable, ~600€ pour LMNP réel */
  comptable: 600,
} as const

// ── SCI IS — charges spécifiques ──────────────────────────────────────────────
export const SCI_IS_DEFAULTS = {
  /** Honoraires comptable + frais juridiques annuels (comptabilité commerciale obligatoire) */
  comptableJuridique: 1_500,
} as const

// ── Frais de gestion forfaitaire foncier ─────────────────────────────────────
// Source : art. 31-I-1°-c CGI — exact réglementaire
export const FORFAIT_GESTION_FONCIER = 20 // €/local
