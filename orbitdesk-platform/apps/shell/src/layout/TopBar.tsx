import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, Search, ChevronDown, User, CreditCard, LogOut } from 'lucide-react'
import { useWorkspaceStore } from '@/workspace/workspaceStore'
import { useAuthStore } from '@/auth/authStore'
import { getRouteConfig } from '@/router/routes'

function UserMenuDropdown({ onClose }: { onClose: () => void }) {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  function logout() {
    clearAuth()
    navigate('/login')
  }

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-56 bg-white border border-zinc-200 rounded-xl shadow-xl z-50 overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-zinc-100">
        <p className="text-sm font-semibold text-zinc-900 truncate">{user?.name}</p>
        <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
      </div>
      <ul className="py-1.5">
        {[
          { icon: User, label: 'Profile', action: () => navigate('/app/settings/profile') },
          { icon: CreditCard, label: 'Billing', action: () => navigate('/app/settings/billing') },
        ].map(({ icon: Icon, label, action }) => (
          <li key={label}>
            <button
              onClick={() => { action(); onClose() }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              <Icon className="w-4 h-4 text-zinc-400" />
              {label}
            </button>
          </li>
        ))}
      </ul>
      <div className="border-t border-zinc-100 py-1.5">
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Log out
        </button>
      </div>
    </div>
  )
}

function UserAvatar({ name }: { name: string }) {
  const initials = name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  return (
    <span className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-xs font-semibold text-white">
      {initials}
    </span>
  )
}

export function TopBar() {
  const location = useLocation()
  const { sidebarCollapsed } = useWorkspaceStore()
  const { user } = useAuthStore()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)

  const route = getRouteConfig(location.pathname)
  const CtxIcon = route?.ctxButton?.icon

  const sidebarW = sidebarCollapsed ? 'left-16' : 'left-[240px]'

  return (
    <header
      className={`fixed top-0 right-0 ${sidebarW} h-14 z-30 flex items-center justify-between px-5 bg-white/80 backdrop-blur-md border-b border-zinc-200/70 transition-[left] duration-200 ease-in-out`}
    >
      {/* Left: page title */}
      <h1 className="text-[15px] font-semibold text-zinc-900 tracking-tight">
        {route?.label ?? 'OrbitDesk'}
      </h1>

      {/* Right: search + notifications + ctx button + user */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div
          className={`hidden sm:flex items-center gap-2 bg-zinc-100 rounded-lg px-3 py-1.5 transition-all ${
            searchFocused ? 'ring-2 ring-violet-500/30 bg-white' : 'hover:bg-zinc-200/60'
          }`}
        >
          <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <input
            placeholder="Search…"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="bg-transparent text-sm text-zinc-700 placeholder-zinc-400 outline-none w-40"
          />
          <kbd className="hidden lg:inline text-[10px] text-zinc-400 bg-zinc-200 rounded px-1 py-0.5 font-mono">
            ⌘K
          </kbd>
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors">
          <Bell className="w-4 h-4" />
          {/* Unread dot — wire to notification store when ready */}
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-violet-600" />
        </button>

        {/* Contextual "New …" button */}
        {route?.ctxButton && CtxIcon && (
          <button className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white text-sm font-medium px-3.5 py-1.5 rounded-lg transition-colors shadow-sm shadow-violet-600/20">
            <CtxIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{route.ctxButton.label}</span>
          </button>
        )}

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-lg p-1 hover:bg-zinc-100 transition-colors"
          >
            {user && <UserAvatar name={user.name} />}
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 hidden sm:block" />
          </button>
          {userMenuOpen && <UserMenuDropdown onClose={() => setUserMenuOpen(false)} />}
        </div>
      </div>
    </header>
  )
}
