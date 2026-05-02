'use client'

// ResultatsPage — Affichage des résultats de simulation
// Comparaison des 7 régimes fiscaux avec charts Recharts

import { useMemo, useState, useEffect, useRef } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts'
import { useSimulateur } from '@/lib/simulateur/SimulateurContext'
import { mapStateToInputs } from '@/lib/simulateur/mapStateToInputs'
import { compareAllRegimes } from '@/lib/fiscal/compareRegimes'
import type { RegimeResult, RegimeKey } from '@/lib/fiscal/types'
import { cn } from '@/lib/utils'

// ── Helpers d'affichage ───────────────────────────────────────────────────────

function fmt(n: number, decimals = 0): string {
  return n.toLocaleString('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function fmtEur(n: number): string {
  return `${fmt(n)} €`
}

const REGIME_COLORS: Record<RegimeKey, string> = {
  microFoncier: '#6B7280',
  reelFoncier: '#374151',
  microBicLmnp: '#0EA5E9',
  reelBicLmnp: '#1E3A6E',
  lmp: '#7C3AED',
  sciIr: '#D97B34',
  sciIs: '#0B7A56',
}

const BADGE_BG: Record<string, string> = {
  nue: 'bg-[#E5F0FF] text-[#1E3A6E]',
  meublee_ld: 'bg-[#E5FAF0] text-[#0B7A56]',
  meublee_tourisme_classe: 'bg-[#FFF3E5] text-[#D97B34]',
  meublee_tourisme_nc: 'bg-[#FFF3E5] text-[#D97B34]',
  saisonniere: 'bg-[#FFF3E5] text-[#D97B34]',
}

// ── Carte d'un régime ─────────────────────────────────────────────────────────

function RegimeCard({
  regime,
  isRecommended,
  isExpanded,
  onToggle,
}: {
  regime: RegimeResult
  isRecommended: boolean
  isExpanded: boolean
  onToggle: () => void
}) {
  const color = REGIME_COLORS[regime.id] ?? '#6B7280'

  const cfSign = regime.monthlyCashflow >= 0 ? '+' : ''
  const cfColor = regime.monthlyCashflow >= 0 ? 'text-[#0B7A56]' : 'text-red-500'

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border transition-all duration-200',
        isRecommended ? 'border-[#1E3A6E] shadow-md' : 'border-[#E4E2DC]'
      )}
    >
      {/* Header cliquable */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-4 bg-white px-5 py-4 text-left"
      >
        {/* Barre couleur */}
        <div className="h-10 w-1 flex-shrink-0 rounded-full" style={{ background: color }} />

        {/* Nom + badges */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-bold text-[#1A1F2E]">{regime.labelShort}</span>
            {isRecommended && (
              <span className="rounded-full bg-[#1E3A6E] px-2 py-0.5 text-[11px] font-semibold text-white">
                Recommandé
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-[#6B7280]">{regime.label}</p>
        </div>

        {/* KPIs résumés */}
        <div className="hidden shrink-0 items-center gap-6 sm:flex">
          <div className="text-right">
            <p className="text-xs text-[#9CA3AF]">Cash-flow</p>
            <p className={`text-sm font-bold ${cfColor}`}>
              {cfSign}
              {fmtEur(regime.monthlyCashflow)}/m
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#9CA3AF]">Impôt an 1</p>
            <p className="text-sm font-bold text-[#1A1F2E]">{fmtEur(regime.totalTax)}</p>
          </div>
        </div>

        {/* Chevron */}
        <svg
          className={cn(
            'h-5 w-5 flex-shrink-0 text-[#6B7280] transition-transform',
            isExpanded && 'rotate-180'
          )}
          viewBox="0 0 20 20"
          fill="none"
        >
          <path
            d="M5 8l5 5 5-5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Détail dépliable */}
      {isExpanded && (
        <div className="border-t border-[#F3F4F6] bg-[#FAFAFA] px-5 py-5">
          {/* KPIs mobiles */}
          <div className="mb-5 flex items-center gap-4 sm:hidden">
            <div>
              <p className="text-xs text-[#9CA3AF]">Cash-flow</p>
              <p className={`text-sm font-bold ${cfColor}`}>
                {cfSign}
                {fmtEur(regime.monthlyCashflow)}/mois
              </p>
            </div>
            <div>
              <p className="text-xs text-[#9CA3AF]">Impôt an 1</p>
              <p className="text-sm font-bold text-[#1A1F2E]">{fmtEur(regime.totalTax)}</p>
            </div>
          </div>

          {/* Tableau fiscal an 1 */}
          <h4 className="mb-3 text-sm font-semibold text-[#374151]">Détail fiscal — Année 1</h4>
          <div className="space-y-2 text-sm">
            <Row label="Loyers nets de vacance" value={fmtEur(regime.annualRentNet)} />
            <Row
              label="Charges déductibles"
              value={`− ${fmtEur(regime.chargesDeductibles)}`}
              className="text-red-500"
            />
            {regime.amortissement > 0 && (
              <Row
                label="Amortissement annuel"
                value={`− ${fmtEur(regime.amortissement)}`}
                className="text-red-500"
              />
            )}
            <div className="my-2 border-t border-dashed border-[#E4E2DC]" />
            <Row label="Revenu imposable" value={fmtEur(regime.revenuImposable)} bold />
            {regime.ir !== 0 && (
              <Row
                label="Impôt sur le revenu (IR)"
                value={fmtEur(regime.ir)}
                className="text-red-600"
              />
            )}
            {regime.ps !== 0 && (
              <Row
                label="Prélèvements sociaux"
                value={fmtEur(regime.ps)}
                className="text-red-600"
              />
            )}
            {regime.is !== 0 && (
              <Row
                label="Impôt sur les sociétés (IS)"
                value={fmtEur(regime.is)}
                className="text-red-600"
              />
            )}
            {regime.cotisationsTns !== 0 && (
              <Row
                label="Cotisations TNS (LMP)"
                value={fmtEur(regime.cotisationsTns)}
                className="text-red-600"
              />
            )}
            {regime.pfuOnDividends !== 0 && (
              <Row
                label="PFU dividendes"
                value={fmtEur(regime.pfuOnDividends)}
                className="text-red-600"
              />
            )}
            <div className="my-2 border-t border-dashed border-[#E4E2DC]" />
            <Row
              label="Taux d'imposition effectif"
              value={`${(regime.effectiveTaxRate * 100).toFixed(1)}%`}
              bold
            />
          </div>

          {/* Plus-value */}
          <h4 className="mt-5 mb-3 text-sm font-semibold text-[#374151]">
            Plus-value à la revente estimée
          </h4>
          <div className="space-y-2 text-sm">
            <Row label="Prix de cession estimé" value={fmtEur(regime.plusValue.salePrice)} />
            <Row
              label="Coût d'acquisition retenu"
              value={`− ${fmtEur(regime.plusValue.acquisitionCostRetenu)}`}
            />
            <Row label="Plus-value brute" value={fmtEur(regime.plusValue.grossGain)} bold />
            <Row
              label="Impôt total sur la PV"
              value={`− ${fmtEur(regime.plusValue.totalTaxOnGain)}`}
              className="text-red-600"
            />
            <Row
              label="Plus-value nette"
              value={fmtEur(regime.plusValue.netGain)}
              bold
              className="text-[#0B7A56]"
            />
          </div>

          {/* Retour total */}
          <div className="mt-5 rounded-xl bg-white px-4 py-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-[#6B7280]">
                Profit net sur la durée
                <span className="ml-1 text-xs text-[#9CA3AF]">(cashflows + revente − apport)</span>
              </span>
              <span
                className={`text-lg font-bold ${regime.totalReturn >= 0 ? 'text-[#0B7A56]' : 'text-red-600'}`}
              >
                {regime.totalReturn >= 0 ? '+' : ''}
                {fmtEur(regime.totalReturn)}
              </span>
            </div>
            <div className="space-y-1 border-t border-dashed border-[#E4E2DC] pt-2 text-xs text-[#9CA3AF]">
              <div className="flex justify-between">
                <span>Σ cashflows ({regime.projection.length} ans)</span>
                <span
                  className={
                    regime.totalCashflowOverHolding >= 0 ? 'text-[#0B7A56]' : 'text-red-400'
                  }
                >
                  {regime.totalCashflowOverHolding >= 0 ? '+' : ''}
                  {fmtEur(regime.totalCashflowOverHolding)}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span>
                  Produit net de revente
                  <span className="ml-1 opacity-60">
                    (dont PV nette {fmtEur(regime.plusValue.netGain)})
                  </span>
                </span>
                <span className="shrink-0 text-[#0B7A56]">+{fmtEur(regime.netSaleProceeds)}</span>
              </div>
              <div className="flex justify-between">
                <span>Apport + mobilier initial</span>
                <span className="text-red-400">−{fmtEur(regime.initialCashInvested)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({
  label,
  value,
  bold,
  className,
}: {
  label: string
  value: string
  bold?: boolean
  className?: string
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn('text-[#6B7280]', bold && 'font-semibold text-[#374151]')}>{label}</span>
      <span className={cn('font-medium text-[#1A1F2E]', bold && 'font-bold', className)}>
        {value}
      </span>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────

export function ResultatsPage() {
  const { state, reset } = useSimulateur()
  const [expandedRegime, setExpandedRegime] = useState<RegimeKey | null>(null)
  const [simulationId, setSimulationId] = useState<string | null>(null)
  const savedRef = useRef(false)

  // Calcul unique via useMemo
  const result = useMemo(() => {
    const inputs = mapStateToInputs(state)
    return compareAllRegimes(inputs)
  }, [state])

  // Auto-persistance en arrière-plan (une seule fois au montage)
  useEffect(() => {
    if (savedRef.current) return
    savedRef.current = true

    const { eligibleRegimes, recommendedRegime, isLmpTriggered } = result

    const resultsSummary = eligibleRegimes.map((r) => ({
      label: r.label,
      labelShort: r.labelShort,
      totalTax: r.totalTax,
      monthlyCashflow: r.monthlyCashflow,
      totalReturn: r.totalReturn,
      effectiveTaxRate: r.effectiveTaxRate,
    }))

    const payload = {
      // Lead
      email: state.email || undefined,
      gdprConsent: state.gdprConsent,
      newsletterConsent: state.newsletterConsent,

      // Étape 1
      projectStage: state.projectStage,
      mainGoal: state.mainGoal,
      locationType: state.locationType ?? 'nue',

      // Étape 2
      familySituation: state.familySituation,
      childrenCount: state.childrenCount,
      householdIncome: state.householdIncome,
      existingMeubleRevenues: state.existingMeubleRevenues,

      // Étape 3
      purchasePrice: state.purchasePrice,
      propertyType: state.propertyType,
      notaryFees: state.notaryFees,
      renovationWork: state.renovationWork,
      furnitureBudget: state.furnitureBudget,
      postalCode: state.postalCode,

      // Étape 4
      financingMode: state.financingMode,
      downPayment: state.downPayment,
      loanDuration: state.loanDuration,
      interestRate: state.interestRate,
      insuranceRate: state.insuranceRate,

      // Étape 5
      monthlyRent: state.monthlyRent,
      vacancyRate: state.vacancyRate,
      condoFees: state.condoFees,
      propertyTax: state.propertyTax,
      pnoInsurance: state.pnoInsurance,
      managementFees: state.managementFees,
      maintenancePct: state.maintenancePct,
      holdingPeriod: state.holdingPeriod,

      // Résultats
      recommendedRegime,
      isLmpTriggered,
      results: resultsSummary,
    }

    fetch('/api/simulations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        if (res.ok) {
          const data = (await res.json()) as { simulationId: string }
          setSimulationId(data.simulationId)
        }
      })
      .catch(() => {
        // Non bloquant — silencieux
      })
  }, [result, state])

  const { eligibleRegimes, recommendedRegime, isLmpTriggered, lmpTriggerReason } = result

  // Données graphique comparaison fiscale
  const chartData = eligibleRegimes
    .slice()
    .sort((a, b) => a.totalTax - b.totalTax)
    .map((r) => ({
      name: r.labelShort,
      impot: Math.max(0, r.totalTax),
      cashflow: r.annualCashflow,
    }))

  // Données projection cashflow (5 premières années pour lisibilité)
  const projectionData = useMemo(() => {
    const years = Array.from({ length: Math.min(state.holdingPeriod, 20) }, (_, i) => i + 1)
    return years.map((year) => {
      const point: Record<string, number> = { year }
      eligibleRegimes.slice(0, 4).forEach((r) => {
        const y = r.projection[year - 1]
        if (y) point[r.labelShort] = y.cashflow
      })
      return point
    })
  }, [eligibleRegimes, state.holdingPeriod])

  const recommended = eligibleRegimes.find((r) => r.id === recommendedRegime)

  if (eligibleRegimes.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-[#6B7280]">Aucun régime éligible avec ces paramètres.</p>
        <button onClick={reset} className="mt-4 text-sm text-[#1E3A6E] underline">
          Recommencer
        </button>
      </div>
    )
  }

  return (
    <div className="fade-in-up space-y-8 pb-16">
      {/* ── Bandeau LMP alert ─────────────────────────────────────────────── */}
      {isLmpTriggered && (
        <div className="rounded-2xl border border-[#7C3AED]/30 bg-[#7C3AED]/5 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-[#7C3AED]">Statut LMP déclenché</p>
              <p className="mt-1 text-[13px] text-[#6B7280]">{lmpTriggerReason}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Carte recommandation ──────────────────────────────────────────── */}
      {recommended && (
        <div className="rounded-2xl bg-gradient-to-br from-[#1E3A6E] to-[#162d58] p-6 text-white">
          <p className="text-xs font-semibold tracking-widest text-white/60 uppercase">
            Régime recommandé
          </p>
          <h2 className="mt-1 text-2xl font-bold">{recommended.label}</h2>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <Kpi
              label="Cash-flow mensuel"
              value={`${recommended.monthlyCashflow >= 0 ? '+' : ''}${fmtEur(recommended.monthlyCashflow)}`}
              highlight={recommended.monthlyCashflow >= 0}
            />
            <Kpi label="Impôt annuel" value={fmtEur(recommended.totalTax)} />
            <Kpi
              label="Profit net"
              value={`${recommended.totalReturn >= 0 ? '+' : ''}${fmtEur(recommended.totalReturn)}`}
              highlight
            />
          </div>
        </div>
      )}

      {/* ── Graphique comparaison fiscale ─────────────────────────────────── */}
      <div className="rounded-2xl border border-[#E4E2DC] bg-white p-5">
        <h3 className="mb-1 text-[15px] font-bold text-[#1A1F2E]">
          Comparaison des régimes — Année 1
        </h3>
        <p className="mb-4 text-sm text-[#6B7280]">Charge fiscale totale (IR + PS + IS)</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 20, bottom: 0, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
            <XAxis
              type="number"
              tickFormatter={(v) => `${fmt(v / 1000)}k€`}
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 12, fill: '#374151' }}
              axisLine={false}
              tickLine={false}
              width={80}
            />
            <Tooltip
              formatter={(value) => [fmtEur(typeof value === 'number' ? value : 0), 'Impôt an 1']}
              contentStyle={{ borderRadius: '10px', border: '1px solid #E4E2DC', fontSize: 13 }}
            />
            <Bar
              dataKey="impot"
              radius={[0, 6, 6, 0]}
              fill="#1E3A6E"
              maxBarSize={28}
              minPointSize={3}
              label={{
                position: 'right',
                formatter: (v: unknown) => (v === 0 ? '0 €' : ''),
                style: { fontSize: 11, fill: '#9CA3AF' },
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Graphique projection cash-flow ────────────────────────────────── */}
      {projectionData.length > 1 && eligibleRegimes.length > 0 && (
        <div className="rounded-2xl border border-[#E4E2DC] bg-white p-5">
          <h3 className="mb-1 text-[15px] font-bold text-[#1A1F2E]">Évolution du cash-flow</h3>
          <p className="mb-4 text-sm text-[#6B7280]">
            Projection sur {state.holdingPeriod} ans (€/an)
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={projectionData} margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `A${v}`}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${fmt(v / 1000)}k`}
              />
              <Tooltip
                formatter={(value, name) => [
                  fmtEur(typeof value === 'number' ? value : 0),
                  String(name),
                ]}
                contentStyle={{ borderRadius: '10px', border: '1px solid #E4E2DC', fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {eligibleRegimes.slice(0, 4).map((r) => (
                <Line
                  key={r.id}
                  type="monotone"
                  dataKey={r.labelShort}
                  stroke={REGIME_COLORS[r.id]}
                  strokeWidth={r.id === recommendedRegime ? 2.5 : 1.5}
                  dot={false}
                  {...(r.id !== recommendedRegime ? { strokeDasharray: '4 2' } : {})}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Cartes des régimes éligibles ──────────────────────────────────── */}
      <div>
        <h3 className="mb-4 text-[15px] font-bold text-[#1A1F2E]">
          Détail par régime ({eligibleRegimes.length} éligibles)
        </h3>
        <div className="space-y-3">
          {eligibleRegimes
            .slice()
            .sort((a, b) => b.totalReturn - a.totalReturn)
            .map((r) => (
              <RegimeCard
                key={r.id}
                regime={r}
                isRecommended={r.id === recommendedRegime}
                isExpanded={expandedRegime === r.id}
                onToggle={() => setExpandedRegime((prev) => (prev === r.id ? null : r.id))}
              />
            ))}
        </div>
      </div>

      {/* ── Régimes non éligibles ─────────────────────────────────────────── */}
      {result.regimes.filter((r) => !r.isEligible).length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-semibold text-[#9CA3AF]">Régimes non applicables</h4>
          <div className="space-y-2">
            {result.regimes
              .filter((r) => !r.isEligible)
              .map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-xl border border-[#E4E2DC] bg-white px-4 py-3 opacity-60"
                >
                  <span className="text-sm text-[#6B7280]">{r.label}</span>
                  <span className="text-xs text-[#9CA3AF]">{r.ineligibilityReason}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── Disclaimer légal ──────────────────────────────────────────────── */}
      <div className="rounded-xl bg-[#F8F7F4] px-4 py-4">
        <p className="text-[12px] leading-relaxed text-[#9CA3AF]">
          ⚠️ Ces simulations sont fournies à titre indicatif et ne constituent pas un conseil fiscal
          ou juridique. Les calculs sont basés sur la législation 2026. Consultez un
          expert-comptable ou un conseiller en gestion de patrimoine pour une analyse personnalisée.
        </p>
      </div>

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        {simulationId && state.email && (
          <p className="text-center text-xs text-[#9CA3AF]">
            📧 Analyse envoyée à <strong>{state.email}</strong>
            <span className="ml-2 opacity-60">#{simulationId.slice(-8)}</span>
          </p>
        )}
        <button
          type="button"
          onClick={reset}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#E4E2DC] bg-white text-sm font-semibold text-[#6B7280] transition-colors hover:border-[#1E3A6E] hover:text-[#1E3A6E]"
        >
          ↺ Nouvelle simulation
        </button>
      </div>
    </div>
  )
}

// ── Mini composant KPI ────────────────────────────────────────────────────────

function Kpi({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[11px] text-white/60">{label}</p>
      <p className={cn('mt-0.5 text-lg font-bold', highlight ? 'text-[#6EE7B7]' : 'text-white')}>
        {value}
      </p>
    </div>
  )
}
