// Layout du simulateur — wraps toutes les étapes 1→5
// Le header sticky est ici, pas dans chaque page

export default function SimulateurLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#F8F7F4]">{children}</div>
}
