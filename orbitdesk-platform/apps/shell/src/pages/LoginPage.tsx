import { useState, useId } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Orbit } from 'lucide-react'
import { useAuthStore } from '@orbitdesk/ui'

interface Fields {
  email: string
  password: string
  rememberMe: boolean
}

interface Errors {
  email?: string
  password?: string
}

function validate(fields: Fields): Errors {
  const errors: Errors = {}
  if (!fields.email.trim()) {
    errors.email = 'Email is required.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
    errors.email = 'Enter a valid email address.'
  }
  if (!fields.password) errors.password = 'Password is required.'
  return errors
}

const inputBase =
  'w-full rounded-lg border bg-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-all focus:ring-2'
const inputNormal = 'border-zinc-700 focus:border-violet-500 focus:ring-violet-500/25'
const inputError  = 'border-red-500/60 focus:border-red-500 focus:ring-red-500/20'

export function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const uid = useId()

  const [fields, setFields] = useState<Fields>({ email: '', password: '', rememberMe: false })
  const [touched, setTouched] = useState({ email: false, password: false })
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const errors = validate(fields)
  const isValid = Object.keys(errors).length === 0

  function touch(key: keyof typeof touched) {
    setTouched((t) => ({ ...t, [key]: true }))
  }

  function set<K extends keyof Fields>(key: K, value: Fields[K]) {
    setServerError(null)
    setFields((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTouched({ email: true, password: true })
    if (!isValid) return
    setSubmitting(true)
    setServerError(null)
    // Simulate API — replace with real login call
    await new Promise((r) => setTimeout(r, 800))
    setAuth(
      { id: `usr-${Date.now()}`, name: fields.email.split('@')[0], email: fields.email.trim() },
      'mock-token',
    )
    navigate('/app/dashboard', { replace: true })
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4 py-12">
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
        <div className="w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-[420px]">
        <div className="flex flex-col items-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center mb-3 shadow-lg shadow-violet-600/30">
            <Orbit className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">OrbitDesk</h1>
          <p className="text-sm text-zinc-400 mt-1">Your AI-powered workspace hub</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl shadow-black/40 px-8 py-8">
          <h2 className="text-lg font-semibold text-white mb-1">Welcome back</h2>
          <p className="text-sm text-zinc-400 mb-6">Log in to continue to your workspace.</p>

          {serverError && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-3">
              <p className="text-sm text-red-400">{serverError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor={`${uid}-email`} className="text-sm font-medium text-zinc-200">Email</label>
              <input
                id={`${uid}-email`}
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={fields.email}
                onChange={(e) => set('email', e.target.value)}
                onBlur={() => touch('email')}
                className={`${inputBase} ${touched.email && errors.email ? inputError : inputNormal}`}
              />
              {touched.email && errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label htmlFor={`${uid}-pw`} className="text-sm font-medium text-zinc-200">Password</label>
                <a href="#" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">Forgot password?</a>
              </div>
              <div className="relative">
                <input
                  id={`${uid}-pw`}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={fields.password}
                  onChange={(e) => set('password', e.target.value)}
                  onBlur={() => touch('password')}
                  className={`${inputBase} pr-10 ${touched.password && errors.password ? inputError : inputNormal}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {touched.password && errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer group w-fit">
              <input
                type="checkbox"
                checked={fields.rememberMe}
                onChange={(e) => set('rememberMe', e.target.checked)}
                className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 accent-violet-600 cursor-pointer"
              />
              <span className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors select-none">Remember me</span>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="mt-1 w-full flex items-center justify-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-700 active:bg-violet-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 transition-colors shadow-sm shadow-violet-600/30"
            >
              {submitting ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Logging in…</>
              ) : 'Log in'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-zinc-500 mt-5">
          Don't have an account?{' '}
          <Link to="/signup" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}
