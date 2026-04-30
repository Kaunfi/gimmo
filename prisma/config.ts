// Configuration Prisma 7 — connexion Supabase
// Les URLs de connexion sont lues depuis les variables d'environnement
// Voir .env.local.example pour la documentation des variables

import { defineConfig } from 'prisma/config'

export default defineConfig({
  datasource: {
    // URL poolée (PgBouncer) pour les requêtes en production (port 6543)
    url: process.env['DATABASE_URL'] ?? '',
  },
})
