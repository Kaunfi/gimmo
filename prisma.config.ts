// Prisma 7 — Configuration pour les migrations
// Les URLs de connexion ont été déplacées ici depuis schema.prisma (breaking change Prisma 7)
// Voir : https://pris.ly/d/config-datasource
//
// Prisma CLI ne lit pas .env.local (spécifique à Next.js) — on le charge manuellement.

import { config } from 'dotenv'
import { resolve } from 'path'
import { defineConfig } from '@prisma/config'

// Charge .env.local en priorité, puis .env en fallback
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

export default defineConfig({
  schema: './prisma/schema.prisma',

  // URL pour les migrations Prisma (connexion directe, port 5432)
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
  },
})
