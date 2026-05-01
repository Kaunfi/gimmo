// POST /api/leads — Upsert d'un lead (email gate)
// Crée ou met à jour le Lead en base. L'email de résultats est envoyé
// depuis /api/simulations une fois les résultats persistés.

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'

const schema = z.object({
  email: z.string().email(),
  gdprConsent: z.boolean(),
  newsletterConsent: z.boolean().optional().default(false),
})

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as unknown
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const { email, gdprConsent, newsletterConsent } = parsed.data

    // Upsert Lead — si l'email existe déjà on met à jour les consentements
    await prisma.lead.upsert({
      where: { email },
      update: {
        gdprConsent,
        newsletterOptIn: newsletterConsent,
      },
      create: {
        email,
        gdprConsent,
        newsletterOptIn: newsletterConsent,
      },
    })

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    console.error('[leads] Error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
