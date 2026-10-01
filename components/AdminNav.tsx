'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  Users,
  UserCheck,
  CalendarRange,
  FileSpreadsheet,
  LogOut,
  Flame,
  ScanLine,
} from 'lucide-react'

const navItems = [
  { href: '/admin/dashboard', label: 'डैशबोर्ड', icon: LayoutDashboard },
  { href: '/admin/participants', label: 'प्रतिभागी', icon: Users },
  { href: '/admin/scans', label: 'दैनिक स्कैन', icon: ScanLine },
  { href: '/admin/staff', label: 'कार्यकर्ता', icon: UserCheck },
  { href: '/admin/config', label: 'कार्यक्रम तिथियां', icon: CalendarRange },
  { href: '/admin/reports', label: 'रिपोर्ट्स', icon: FileSpreadsheet },
]

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="bg-white border-b border-gray-200/80 sticky top-0 z-30 shadow-sm/50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-6">
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-2.5 text-gray-900 group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
                <Flame className="w-5 h-5 fill-white/20" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm leading-tight tracking-tight text-gray-900">
                  Navratri 2026
                </span>
                <span className="text-[11px] font-semibold text-orange-600 tracking-wider">
                  प्रशासक पोर्टल
                </span>
              </div>
            </Link>

            {/* Nav links */}
            <div className="hidden md:flex items-center space-x-1 ml-4">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/admin/dashboard' &&
                    pathname.startsWith(item.href))

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-orange-50 text-orange-700 font-semibold shadow-xs'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? 'text-orange-600' : 'text-gray-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Right Action */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-red-600 hover:bg-red-50/70 px-3 py-2 rounded-xl border border-gray-200 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>लॉग आउट</span>
            </button>
          </div>
        </div>

        {/* Mobile Nav row */}
        <div className="md:hidden flex items-center overflow-x-auto space-x-1 py-2 border-t border-gray-100 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              pathname === item.href ||
              (item.href !== '/admin/dashboard' &&
                pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-orange-100 text-orange-800 font-semibold'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
