// Prisma 7 — Singleton avec adaptateur pg (PostgreSQL / Supabase)
// Initialisation lazy : le Pool pg n'est créé qu'au premier accès,
// jamais au chargement du module (évite les erreurs au build Next.js).

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  // Import dynamique pour éviter le chargement au build
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pool } = require('pg') as typeof import('pg')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaPg } = require('@prisma/adapter-pg') as typeof import('@prisma/adapter-pg')

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.warn('[prisma] DATABASE_URL non défini — les requêtes DB échoueront')
  }

  const pool = new Pool({
    connectionString: connectionString ?? '',
    ssl: connectionString ? { rejectUnauthorized: false } : undefined,
  })

  const adapter = new PrismaPg(pool)

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
