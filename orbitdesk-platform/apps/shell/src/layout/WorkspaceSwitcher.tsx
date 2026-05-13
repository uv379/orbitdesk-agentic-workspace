import { useState, useRef, useEffect } from 'react'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { useWorkspaceStore, type Workspace } from '@/workspace/workspaceStore'

const PLAN_BADGE: Record<Workspace['plan'], string> = {
  free: 'bg-zinc-700 text-zinc-300',
  pro: 'bg-violet-900 text-violet-300',
  enterprise: 'bg-amber-900 text-amber-300',
}

function WorkspaceAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  const cls = size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs'
  return (
    <span
      className={`${cls} rounded-md bg-violet-600 flex items-center justify-center font-semibold text-white shrink-0`}
    >
      {initials}
    </span>
  )
}

interface Props {
  collapsed: boolean
}

export function WorkspaceSwitcher({ collapsed }: Props) {
  const { current, list, setCurrent } = useWorkspaceStore()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const filtered = list.filter((ws) => ws.name.toLowerCase().includes(query.toLowerCase()))

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function select(ws: Workspace) {
    setCurrent(ws)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={ref} className="relative px-3 py-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-sidebar-hover transition-colors group ${
          open ? 'bg-sidebar-hover' : ''
        }`}
        title={collapsed ? current.name : undefined}
      >
        <WorkspaceAvatar name={current.name} />
        {!collapsed && (
          <>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium text-white truncate leading-tight">{current.name}</p>
              <p className="text-[11px] text-sidebar-muted capitalize leading-tight">{current.plan}</p>
            </div>
            <ChevronsUpDown className="w-3.5 h-3.5 text-sidebar-muted shrink-0 group-hover:text-white transition-colors" />
          </>
        )}
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-full mt-1.5 z-50 bg-[#1C1C28] border border-sidebar-border rounded-xl shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-sidebar-border">
            <div className="flex items-center gap-2 bg-sidebar-hover rounded-lg px-2.5 py-1.5">
              <Search className="w-3.5 h-3.5 text-sidebar-muted shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search workspaces…"
                className="bg-transparent text-sm text-white placeholder-sidebar-muted outline-none w-full"
              />
            </div>
          </div>

          <ul className="py-1.5 max-h-52 overflow-y-auto">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-sidebar-muted">No workspaces found</li>
            )}
            {filtered.map((ws) => (
              <li key={ws.id}>
                <button
                  onClick={() => select(ws)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-sidebar-hover transition-colors"
                >
                  <WorkspaceAvatar name={ws.name} size="sm" />
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-white truncate">{ws.name}</p>
                  </div>
                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize ${PLAN_BADGE[ws.plan]}`}
                  >
                    {ws.plan}
                  </span>
                  {current.id === ws.id && (
                    <Check className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
