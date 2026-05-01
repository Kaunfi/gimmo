// Templates HTML pour les emails Resend
// Pas de dépendance React Email — HTML inline classique, compatible tous clients

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })
}

function fmtEur(n: number): string {
  return `${fmt(n)} €`
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RegimeSummary {
  label: string
  labelShort: string
  totalTax: number
  monthlyCashflow: number
  totalReturn: number
  effectiveTaxRate: number
}

export interface SimulationEmailData {
  email: string
  purchasePrice: number
  monthlyRent: number
  holdingPeriod: number
  recommendedRegimeLabel: string
  recommendedCashflow: number
  recommendedTax: number
  recommendedTotalReturn: number
  top3: RegimeSummary[]
  simulationId: string
  appUrl: string
}

// ── Template principal ────────────────────────────────────────────────────────

export function buildSimulationEmail(data: SimulationEmailData): {
  subject: string
  html: string
  text: string
} {
  const grossYield =
    data.purchasePrice > 0 ? (((data.monthlyRent * 12) / data.purchasePrice) * 100).toFixed(2) : '—'

  const cfSign = data.recommendedCashflow >= 0 ? '+' : ''
  const cfColor = data.recommendedCashflow >= 0 ? '#0B7A56' : '#DC2626'

  const top3Rows = data.top3
    .map(
      (r) => `
      <tr>
        <td style="padding:10px 16px;border-bottom:1px solid #F3F4F6;font-size:13px;color:#374151;">${r.label}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #F3F4F6;font-size:13px;color:#374151;text-align:right;">${fmtEur(r.totalTax)}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #F3F4F6;font-size:13px;font-weight:600;text-align:right;color:${r.monthlyCashflow >= 0 ? '#0B7A56' : '#DC2626'};">
          ${r.monthlyCashflow >= 0 ? '+' : ''}${fmtEur(r.monthlyCashflow)}/m
        </td>
      </tr>`
    )
    .join('')

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Votre analyse GIMMO</title>
</head>
<body style="margin:0;padding:0;background-color:#F8F7F4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8F7F4;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <span style="font-size:22px;font-weight:800;color:#1E3A6E;letter-spacing:-0.5px;">
                GIMMO
              </span>
              <span style="font-size:13px;color:#6B7280;margin-left:6px;">Simulateur fiscal immobilier</span>
            </td>
          </tr>

          <!-- Card principale -->
          <tr>
            <td style="background:#ffffff;border-radius:16px;border:1px solid #E4E2DC;overflow:hidden;">

              <!-- Bandeau résultats -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:linear-gradient(135deg,#1E3A6E,#162d58);padding:24px 28px;">
                <tr>
                  <td>
                    <p style="margin:0;font-size:11px;font-weight:600;text-transform:uppercase;
                       letter-spacing:1.5px;color:rgba(255,255,255,0.6);">Votre simulation</p>
                    <p style="margin:8px 0 0;font-size:28px;font-weight:800;color:#ffffff;">
                      ${fmtEur(data.purchasePrice)}
                    </p>
                    <table cellpadding="0" cellspacing="0" style="margin-top:12px;">
                      <tr>
                        <td style="padding-right:20px;">
                          <span style="font-size:12px;color:rgba(255,255,255,0.6);">Loyer brut </span>
                          <span style="font-size:12px;font-weight:700;color:#ffffff;">${fmtEur(data.monthlyRent * 12)}/an</span>
                        </td>
                        <td>
                          <span style="font-size:12px;color:rgba(255,255,255,0.6);">Rendement brut </span>
                          <span style="font-size:12px;font-weight:700;color:#ffffff;">${grossYield}%</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Corps -->
              <table width="100%" cellpadding="0" cellspacing="0" style="padding:28px;">

                <!-- Titre -->
                <tr>
                  <td style="padding-bottom:6px;">
                    <h1 style="margin:0;font-size:20px;font-weight:800;color:#1A1F2E;">
                      Votre analyse fiscale est prête
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:24px;">
                    <p style="margin:0;font-size:14px;color:#6B7280;line-height:1.5;">
                      Comparaison des 7 régimes fiscaux sur ${data.holdingPeriod} ans —
                      voici les résultats clés de votre simulation.
                    </p>
                  </td>
                </tr>

                <!-- Régime recommandé -->
                <tr>
                  <td style="padding-bottom:24px;">
                    <table width="100%" cellpadding="0" cellspacing="0"
                      style="background:#F0F7FF;border:1px solid #BFDBFE;border-radius:12px;padding:16px 20px;">
                      <tr>
                        <td>
                          <p style="margin:0;font-size:11px;font-weight:600;text-transform:uppercase;
                             letter-spacing:1px;color:#1E3A6E;">Régime recommandé</p>
                          <p style="margin:6px 0 0;font-size:18px;font-weight:800;color:#1A1F2E;">
                            ${data.recommendedRegimeLabel}
                          </p>
                          <table cellpadding="0" cellspacing="0" style="margin-top:14px;width:100%;">
                            <tr>
                              <td style="width:33%;">
                                <p style="margin:0;font-size:11px;color:#6B7280;">Cash-flow mensuel</p>
                                <p style="margin:3px 0 0;font-size:16px;font-weight:700;color:${cfColor};">
                                  ${cfSign}${fmtEur(data.recommendedCashflow)}
                                </p>
                              </td>
                              <td style="width:33%;">
                                <p style="margin:0;font-size:11px;color:#6B7280;">Impôt annuel</p>
                                <p style="margin:3px 0 0;font-size:16px;font-weight:700;color:#1A1F2E;">
                                  ${fmtEur(data.recommendedTax)}
                                </p>
                              </td>
                              <td style="width:33%;">
                                <p style="margin:0;font-size:11px;color:#6B7280;">Retour total</p>
                                <p style="margin:3px 0 0;font-size:16px;font-weight:700;color:#0B7A56;">
                                  ${fmtEur(data.recommendedTotalReturn)}
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Top 3 comparaison -->
                ${
                  data.top3.length > 1
                    ? `
                <tr>
                  <td style="padding-bottom:24px;">
                    <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#374151;">
                      Comparaison des meilleurs régimes
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0"
                      style="border:1px solid #E4E2DC;border-radius:10px;overflow:hidden;">
                      <thead>
                        <tr style="background:#F9FAFB;">
                          <th style="padding:10px 16px;text-align:left;font-size:11px;
                             font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;">Régime</th>
                          <th style="padding:10px 16px;text-align:right;font-size:11px;
                             font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;">Impôt</th>
                          <th style="padding:10px 16px;text-align:right;font-size:11px;
                             font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;">Cash-flow</th>
                        </tr>
                      </thead>
                      <tbody>${top3Rows}</tbody>
                    </table>
                  </td>
                </tr>`
                    : ''
                }

                <!-- CTA -->
                <tr>
                  <td align="center" style="padding-bottom:8px;">
                    <a href="${data.appUrl}/simulateur?id=${data.simulationId}"
                      style="display:inline-block;background:#0B7A56;color:#ffffff;
                             text-decoration:none;font-size:15px;font-weight:700;
                             padding:14px 32px;border-radius:12px;letter-spacing:0.2px;">
                      Voir l'analyse complète →
                    </a>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Disclaimer -->
          <tr>
            <td style="padding:20px 4px 0;text-align:center;">
              <p style="margin:0;font-size:11px;color:#9CA3AF;line-height:1.6;">
                Ces simulations sont fournies à titre indicatif (législation 2026).
                Elles ne constituent pas un conseil fiscal ou juridique.
                <br />Consultez un expert-comptable pour une analyse personnalisée.
              </p>
              <p style="margin:12px 0 0;font-size:11px;color:#D1D5DB;">
                GIMMO · Vous recevez cet email car vous avez simulé votre investissement sur gimmo.fr
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = `
Votre analyse GIMMO — ${fmtEur(data.purchasePrice)}

Loyer brut : ${fmtEur(data.monthlyRent * 12)}/an | Rendement brut : ${grossYield}%

RÉGIME RECOMMANDÉ : ${data.recommendedRegimeLabel}
• Cash-flow mensuel : ${cfSign}${fmtEur(data.recommendedCashflow)}
• Impôt annuel : ${fmtEur(data.recommendedTax)}
• Retour total sur ${data.holdingPeriod} ans : ${fmtEur(data.recommendedTotalReturn)}

Voir l'analyse complète : ${data.appUrl}/simulateur?id=${data.simulationId}

---
Ces simulations sont fournies à titre indicatif (législation 2026).
Consultez un expert-comptable pour une analyse personnalisée.
`.trim()

  return {
    subject: `Votre analyse GIMMO — ${data.recommendedRegimeLabel} recommandé`,
    html,
    text,
  }
}
