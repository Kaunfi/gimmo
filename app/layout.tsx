import type { Metadata, Viewport } from 'next'
import { DM_Sans } from 'next/font/google'
import { Suspense } from 'react'
import { PostHogProvider } from '@/components/analytics/PostHogProvider'
import './globals.css'

// Police DM Sans — identique à la maquette GIMMO
const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
})

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://gimmo.fr'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'GIMMO — Simulateur fiscal immobilier 2026',
    template: '%s | GIMMO',
  },
  description:
    'Comparez tous les régimes fiscaux pour votre investissement immobilier locatif : Micro-foncier, Réel, LMNP, SCI IR/IS. Simulation personnalisée en 5 minutes.',
  keywords: [
    'simulateur fiscal immobilier',
    'LMNP',
    'SCI',
    'micro-foncier',
    'déficit foncier',
    'régime réel',
    'investissement locatif',
    'fiscalité immobilière 2026',
  ],
  authors: [{ name: 'GIMMO' }],
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: APP_URL,
    siteName: 'GIMMO',
    title: 'GIMMO — Simulateur fiscal immobilier 2026',
    description:
      'Trouvez le régime fiscal optimal pour votre bien locatif. Simulation gratuite, résultats en 5 minutes.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'GIMMO — Simulateur fiscal immobilier',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GIMMO — Simulateur fiscal immobilier 2026',
    description: 'Trouvez le régime fiscal optimal pour votre bien locatif.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-snippet': -1 },
  },
  alternates: {
    canonical: APP_URL,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1E3A6E',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" className={dmSans.variable}>
      <body className="min-h-screen bg-[#F8F7F4] font-sans antialiased">
        {/* Suspense requis par useSearchParams dans PostHogProvider */}
        <Suspense fallback={null}>
          <PostHogProvider>{children}</PostHogProvider>
        </Suspense>
      </body>
    </html>
  )
}
