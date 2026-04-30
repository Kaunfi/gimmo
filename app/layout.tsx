import type { Metadata, Viewport } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'

// Police DM Sans — identique à la maquette GIMMO
const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
})

export const metadata: Metadata = {
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
    siteName: 'GIMMO',
    title: 'GIMMO — Simulateur fiscal immobilier 2026',
    description:
      'Trouvez le régime fiscal optimal pour votre bien locatif. Simulation gratuite, résultats en 5 minutes.',
  },
  robots: { index: true, follow: true },
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
      <body className="min-h-screen bg-[#F8F7F4] font-sans antialiased">{children}</body>
    </html>
  )
}
