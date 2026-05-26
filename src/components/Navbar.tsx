'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navLinks = [
  { href: '/', label: 'Home', emoji: '🏠' },
  { href: '/calendar', label: 'Calendar', emoji: '📅' },
  { href: '/stats', label: 'Stats', emoji: '📊' },
  { href: '/templates', label: 'Templates', emoji: '📋' },
]

export default function Navbar() {
  const pathname = usePathname()

  return (
    <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-white/60 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-extrabold text-violet-600 tracking-tight">
            annette
          </span>
          <span className="text-xl animate-bounce-soft">💜</span>
        </Link>

        <div className="flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-violet-100 text-violet-700 shadow-sm'
                    : 'text-gray-500 hover:bg-violet-50 hover:text-violet-600'
                }`}
              >
                <span>{link.emoji}</span>
                <span className="hidden sm:inline">{link.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
