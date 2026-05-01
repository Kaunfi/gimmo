'use client'

// PostHog — Provider client-side
// Initialise PostHog une seule fois, gracieux si NEXT_PUBLIC_POSTHOG_KEY absent.
//
// Pour activer : ajouter dans .env.local
//   NEXT_PUBLIC_POSTHOG_KEY=phc_XXXX
//   NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com   (EU data residency)

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'

let initialized = false

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Initialisation (une seule fois)
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!key || initialized) return
    initialized = true

    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
      capture_pageview: false, // géré manuellement ci-dessous
      capture_pageleave: true,
      persistence: 'localStorage+cookie',
      // Respect RGPD : pas de cookie tiers, données EU
      cross_subdomain_cookie: false,
      secure_cookie: process.env.NODE_ENV === 'production',
    })
  }, [])

  // Page view à chaque navigation
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return
    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')
    posthog.capture('$pageview', { $current_url: url })
  }, [pathname, searchParams])

  return <>{children}</>
}

// ── Helper d'événements ────────────────────────────────────────────────────────

export function trackEvent(event: string, properties?: Record<string, string | number | boolean>) {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return
  posthog.capture(event, properties)
}
