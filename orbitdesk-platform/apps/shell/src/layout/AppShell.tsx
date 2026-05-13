import { Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useWorkspaceStore } from '@/workspace/workspaceStore'

export function AppShell() {
  const { sidebarCollapsed, setSidebarCollapsed } = useWorkspaceStore()

  // Auto-collapse sidebar on small screens
  useEffect(() => {
    function onResize() {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true)
      }
    }
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [setSidebarCollapsed])

  const contentLeft = sidebarCollapsed ? 'ml-16' : 'ml-[240px]'

  return (
    <div className="min-h-screen bg-zinc-50">
      <Sidebar />

      {/* Mobile sidebar overlay */}
      {!sidebarCollapsed && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      {/* Main content column */}
      <div className={`${contentLeft} transition-[margin] duration-200 ease-in-out`}>
        <TopBar />
        <main className="pt-14 min-h-screen">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
