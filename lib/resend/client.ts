import { Resend } from 'resend'

// Singleton Resend — réutilisé dans toutes les routes API
export const resend = new Resend(process.env.RESEND_API_KEY)

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'GIMMO <bonjour@gimmo.fr>'
