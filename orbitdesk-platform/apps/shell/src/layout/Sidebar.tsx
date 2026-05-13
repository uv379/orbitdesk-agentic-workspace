import { NavLink, useNavigate } from 'react-router-dom'
import { LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'
import { useWorkspaceStore } from '@/workspace/workspaceStore'
import { useAuthStore } from '@/auth/authStore'
import { APP_ROUTES } from '@/router/routes'

// Primary nav items (top section) vs bottom-pinned settings
const PRIMARY_ROUTES = APP_ROUTES.filter((r) => r.path !== '/app/settings')
const PINNED_ROUTES = APP_ROUTES.filter((r) => r.path === '/app/settings')

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
  return (
    <span className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-xs font-semibold text-white shrink-0">
      {initials}
    </span>
  )
}

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useWorkspaceStore()
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  const collapsed = sidebarCollapsed

  function handleLogout() {
    clearAuth()
    navigate('/login')
  }

  return (
    <aside
      className={`fixed left-0 top-0 h-screen z-40 flex flex-col bg-sidebar-bg border-r border-sidebar-border transition-[width] duration-200 ease-in-out ${
        collapsed ? 'w-16' : 'w-[240px]'
      }`}
    >
      {/* Logo + collapse toggle */}
      <div className="flex items-center justify-between px-3 pt-4 pb-2 shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2 px-2">
            <div className="w-6 h-6 rounded-md bg-violet-600 flex items-center justify-center shrink-0">
              <span className="text-white text-[10px] font-bold">O</span>
            </div>
            <span className="text-white font-semibold text-sm tracking-tight">OrbitDesk</span>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto w-6 h-6 rounded-md bg-violet-600 flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">O</span>
          </div>
        )}
        {!collapsed && (
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-md text-sidebar-muted hover:text-white hover:bg-sidebar-hover transition-colors"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Workspace switcher */}
      <WorkspaceSwitcher collapsed={collapsed} />

      {/* Divider */}
      <div className="mx-3 border-t border-sidebar-border mb-2" />

      {/* Primary nav */}
      <nav className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {PRIMARY_ROUTES.map((route) => {
          const Icon = route.icon
          return (
            <NavLink
              key={route.path}
              to={route.path}
              title={collapsed ? route.label : undefined}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-violet-600/20 text-white font-medium'
                    : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-violet-400' : 'group-hover:text-white'
                    }`}
                  />
                  {!collapsed && <span className="truncate">{route.label}</span>}
                  {/* Active indicator strip */}
                  {isActive && !collapsed && (
                    <span className="ml-auto w-1 h-4 rounded-full bg-violet-500" />
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Bottom pinned: settings + user card */}
      <div className="shrink-0 px-2 pb-3 space-y-1 border-t border-sidebar-border pt-2">
        {PINNED_ROUTES.map((route) => {
          const Icon = route.icon
          return (
            <NavLink
              key={route.path}
              to={route.path}
              title={collapsed ? route.label : undefined}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-violet-600/20 text-white font-medium'
                    : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="truncate">{route.label}</span>}
            </NavLink>
          )
        })}

        {/* User card */}
        <div
          className={`flex items-center gap-2.5 rounded-lg px-2 py-2 mt-1 ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          {user && <UserAvatar name={user.name} />}
          {!collapsed && user && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate leading-tight">{user.name}</p>
              <p className="text-[11px] text-sidebar-muted truncate leading-tight">{user.email}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 rounded-md text-sidebar-muted hover:text-red-400 hover:bg-red-400/10 transition-colors shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Collapsed: expand toggle at very bottom */}
        {collapsed && (
          <button
            onClick={toggleSidebar}
            className="w-full flex justify-center p-1.5 rounded-md text-sidebar-muted hover:text-white hover:bg-sidebar-hover transition-colors"
            title="Expand sidebar"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  )
}
