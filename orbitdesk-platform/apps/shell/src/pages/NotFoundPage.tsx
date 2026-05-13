import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
      <p className="text-6xl font-bold text-zinc-200">404</p>
      <h2 className="text-xl font-semibold text-zinc-800">Page not found</h2>
      <p className="text-zinc-500 max-w-xs">
        This page doesn't exist or you don't have access to it.
      </p>
      <button
        onClick={() => navigate('/app/dashboard')}
        className="flex items-center gap-2 text-sm text-violet-600 hover:text-violet-700 font-medium mt-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>
    </div>
  )
}
