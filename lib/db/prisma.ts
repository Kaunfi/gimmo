// Prisma 7 — Singleton avec adaptateur pg (PostgreSQL / Supabase)
//
// Prisma 7 n'inclut plus de query engine intégré.
// La connexion passe par l'adaptateur @prisma/adapter-pg.
//
// Variables d'environnement requises (voir .env.local.example) :
//   DATABASE_URL — connexion pooler Supabase (port 6543)
//   DIRECT_URL   — connexion directe Supabase (port 5432, pour les migrations)

import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

// Évite les instances multiples en développement (hot-reload Next.js)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    // En développement sans .env.local : retourne un client sans connexion active
    // (les routes API échoueront proprement avec 500)
    console.warn('[prisma] DATABASE_URL non défini — Prisma non connecté')
  }

  const pool = new Pool({
    connectionString: connectionString ?? '',
    // SSL requis pour Supabase (pgBouncer ou connexion directe)
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
