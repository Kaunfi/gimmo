// Composant logo GIMMO — identique à la maquette (icône maison + texte bold)
// Utilisé dans : header simulateur, header landing, emails

import Link from 'next/link'

interface GimmoLogoProps {
  size?: 'sm' | 'md' | 'lg'
  href?: string
  className?: string
}

const SIZES = {
  sm: { box: 28, icon: 15, text: '16px' },
  md: { box: 34, icon: 18, text: '19px' },
  lg: { box: 36, icon: 20, text: '20px' },
}

export function GimmoLogo({ size = 'md', href = '/', className }: GimmoLogoProps) {
  const s = SIZES[size]

  const content = (
    <div className={`flex items-center gap-[9px] ${className ?? ''}`}>
      {/* Icône maison */}
      <div
        className="flex shrink-0 items-center justify-center rounded-[10px] shadow-[0_2px_8px_rgba(30,58,110,0.25)]"
        style={{
          width: s.box,
          height: s.box,
          background: '#1E3A6E',
        }}
        aria-hidden
      >
        <svg width={s.icon} height={s.icon} viewBox="0 0 18 18" fill="none" aria-hidden>
          <path d="M2 10L9 3L16 10V16H12V12H6V16H2V10Z" fill="white" />
        </svg>
      </div>
      {/* Texte */}
      <span
        className="font-extrabold tracking-[-0.5px] text-[#1A1F2E]"
        style={{ fontSize: s.text }}
      >
        GIMMO
      </span>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="focus-visible:outline-none">
        {content}
      </Link>
    )
  }

  return content
}
