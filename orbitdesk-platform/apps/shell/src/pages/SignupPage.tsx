import { useState, useId } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Orbit } from 'lucide-react'
import { useAuthStore } from '@orbitdesk/ui'

const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone
const TIMEZONES = [
  'Pacific/Honolulu','America/Anchorage','America/Los_Angeles','America/Denver',
  'America/Chicago','America/New_York','America/Sao_Paulo','Europe/London',
  'Europe/Paris','Europe/Berlin','Europe/Moscow','Asia/Dubai','Asia/Kolkata',
  'Asia/Bangkok','Asia/Singapore','Asia/Tokyo','Australia/Sydney','Pacific/Auckland',
]
const TZ_OPTIONS = TIMEZONES.includes(detectedTz) ? TIMEZONES : [detectedTz, ...TIMEZONES]

interface Fields {
  fullName: string; email: string; password: string
  confirmPassword: string; workspaceName: string
  timezone: string; terms: boolean
}
interface Errors {
  fullName?: string; email?: string; password?: string
  confirmPassword?: string; workspaceName?: string; terms?: string
}

function validate(f: Fields): Errors {
  const e: Errors = {}
  if (!f.fullName.trim()) e.fullName = 'Full name is required.'
  if (!f.email.trim()) e.email = 'Email is required.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Enter a valid email address.'
  if (!f.password) e.password = 'Password is required.'
  else if (f.password.length < 8) e.password = 'Password must be at least 8 characters.'
  if (!f.confirmPassword) e.confirmPassword = 'Please confirm your password.'
  else if (f.confirmPassword !== f.password) e.confirmPassword = 'Passwords do not match.'
  if (!f.workspaceName.trim()) e.workspaceName = 'Workspace name is required.'
  if (!f.terms) e.terms = 'You must agree to the Terms to continue.'
  return e
}

const inputBase = 'w-full rounded-lg border bg-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-all focus:ring-2'
const inputNormal = 'border-zinc-700 focus:border-violet-500 focus:ring-violet-500/25'
const inputError  = 'border-red-500/60 focus:border-red-500 focus:ring-red-500/20'

export function SignupPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const uid = useId()

  const [fields, setFields] = useState<Fields>({
    fullName: '', email: '', password: '', confirmPassword: '',
    workspaceName: '', timezone: detectedTz || 'America/New_York', terms: false,
  })
  const [touched, setTouched] = useState<Record<keyof Fields, boolean>>({
    fullName: false, email: false, password: false, confirmPassword: false,
    workspaceName: false, timezone: false, terms: false,
  })
  const [showPw, setShowPw] = useState(false)
  const [showCpw, setShowCpw] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const errors = validate(fields)
  const isValid = Object.keys(errors).length === 0

  function touch(key: keyof Fields) {
    setTouched((t) => ({ ...t, [key]: true }))
  }

  function set<K extends keyof Fields>(key: K, value: Fields[K]) {
    setFields((f) => {
      const next = { ...f, [key]: value }
      if (key === 'fullName') {
        const first = (value as string).trim().split(' ')[0]
        if (!touched.workspaceName || f.workspaceName === `${f.fullName.trim().split(' ')[0]}'s Workspace`)
          next.workspaceName = first ? `${first}'s Workspace` : ''
      }
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTouched({ fullName: true, email: true, password: true, confirmPassword: true, workspaceName: true, timezone: true, terms: true })
    if (!isValid) return
    setSubmitting(true)
    await new Promise((r) => setTimeout(r, 800))
    setAuth(
      { id: `usr-${Date.now()}`, name: fields.fullName.trim(), email: fields.email.trim() },
      'mock-token',
    )
    navigate('/app/dashboard', { replace: true })
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4 py-12">
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
        <div className="w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-3xl" />
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
          <h2 className="text-lg font-semibold text-white mb-1">Create your account</h2>
          <p className="text-sm text-zinc-400 mb-6">Get started free — no credit card required.</p>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            {([
              { id: 'name', label: 'Full name', key: 'fullName', type: 'text', placeholder: 'Alex Rivera', autoComplete: 'name' },
              { id: 'email', label: 'Email', key: 'email', type: 'email', placeholder: 'you@company.com', autoComplete: 'email' },
            ] as const).map(({ id, label, key, type, placeholder, autoComplete }) => (
              <div key={id} className="flex flex-col gap-1">
                <label htmlFor={`${uid}-${id}`} className="text-sm font-medium text-zinc-200">{label}</label>
                <input
                  id={`${uid}-${id}`}
                  type={type}
                  autoComplete={autoComplete}
                  placeholder={placeholder}
                  value={fields[key]}
                  onChange={(e) => set(key, e.target.value)}
                  onBlur={() => touch(key)}
                  className={`${inputBase} ${touched[key] && errors[key] ? inputError : inputNormal}`}
                />
                {touched[key] && errors[key] && <p className="text-xs text-red-400">{errors[key]}</p>}
              </div>
            ))}

            {([
              { id: 'pw', label: 'Password', key: 'password', show: showPw, toggle: () => setShowPw(v => !v), placeholder: 'Min. 8 characters' },
              { id: 'cpw', label: 'Confirm password', key: 'confirmPassword', show: showCpw, toggle: () => setShowCpw(v => !v), placeholder: 'Repeat password' },
            ] as const).map(({ id, label, key, show, toggle, placeholder }) => (
              <div key={id} className="flex flex-col gap-1">
                <label htmlFor={`${uid}-${id}`} className="text-sm font-medium text-zinc-200">{label}</label>
                <div className="relative">
                  <input
                    id={`${uid}-${id}`}
                    type={show ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder={placeholder}
                    value={fields[key]}
                    onChange={(e) => set(key, e.target.value)}
                    onBlur={() => touch(key)}
                    className={`${inputBase} pr-10 ${touched[key] && errors[key] ? inputError : inputNormal}`}
                  />
                  <button type="button" onClick={toggle} tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors">
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {touched[key] && errors[key] && <p className="text-xs text-red-400">{errors[key]}</p>}
              </div>
            ))}

            <div className="border-t border-zinc-800 -mx-1" />

            <div className="flex flex-col gap-1">
              <label htmlFor={`${uid}-ws`} className="text-sm font-medium text-zinc-200">Workspace name</label>
              <input
                id={`${uid}-ws`}
                type="text"
                placeholder="Acme Corp"
                value={fields.workspaceName}
                onChange={(e) => { touch('workspaceName'); set('workspaceName', e.target.value) }}
                onBlur={() => touch('workspaceName')}
                className={`${inputBase} ${touched.workspaceName && errors.workspaceName ? inputError : inputNormal}`}
              />
              {touched.workspaceName && errors.workspaceName && <p className="text-xs text-red-400">{errors.workspaceName}</p>}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor={`${uid}-tz`} className="text-sm font-medium text-zinc-200">Timezone</label>
              <select
                id={`${uid}-tz`}
                value={fields.timezone}
                onChange={(e) => set('timezone', e.target.value)}
                className={`${inputBase} ${inputNormal} cursor-pointer appearance-none`}
              >
                {TZ_OPTIONS.map((tz) => (
                  <option key={tz} value={tz} className="bg-zinc-800">{tz.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="flex items-start gap-2.5 cursor-pointer group">
                <input type="checkbox" checked={fields.terms}
                  onChange={(e) => { set('terms', e.target.checked); touch('terms') }}
                  className="mt-0.5 w-4 h-4 rounded border-zinc-600 bg-zinc-800 accent-violet-600 cursor-pointer shrink-0"
                />
                <span className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors leading-snug">
                  I agree to the{' '}
                  <a href="#" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">Terms of Service</a>
                  {' '}and{' '}
                  <a href="#" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">Privacy Policy</a>
                </span>
              </label>
              {touched.terms && errors.terms && <p className="text-xs text-red-400 pl-6">{errors.terms}</p>}
            </div>

            <button
              type="submit"
              disabled={!isValid || submitting}
              className="mt-1 w-full flex items-center justify-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-700 active:bg-violet-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 transition-colors shadow-sm shadow-violet-600/30"
            >
              {submitting ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating account…</>
              ) : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-zinc-500 mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">Log in</Link>
        </p>
      </div>
    </div>
  )
}
