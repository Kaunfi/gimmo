// Layout partagé pour toutes les pages marketing (landing, légal, blog)
// Pas de header simulateur ici — chaque page gère son propre header si nécessaire

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
