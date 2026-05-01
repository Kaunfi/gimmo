import { Resend } from 'resend'

// Initialisation lazy — jamais au chargement du module.
// Next.js importe les routes API au build pour l'analyse statique :
// instancier Resend ici planterait si RESEND_API_KEY est absent.

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'GIMMO <bonjour@gimmo.fr>'

let _resend: Resend | null = null

export function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY
    if (!key) throw new Error('[resend] RESEND_API_KEY non défini')
    _resend = new Resend(key)
  }
  return _resend
}
