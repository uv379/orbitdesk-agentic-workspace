import { Construction } from 'lucide-react'

interface Props {
  label: string
}

export function PlaceholderPage({ label }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center">
        <Construction className="w-7 h-7 text-violet-600" />
      </div>
      <h2 className="text-lg font-semibold text-zinc-800">{label}</h2>
      <p className="text-sm text-zinc-500 max-w-xs">
        This micro-frontend is not yet deployed. Start its dev server or deploy its remote bundle.
      </p>
    </div>
  )
}
