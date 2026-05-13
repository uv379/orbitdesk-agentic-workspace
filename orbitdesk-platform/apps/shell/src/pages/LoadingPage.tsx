export function LoadingPage() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-zinc-200" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-zinc-200" />
        ))}
      </div>
      <div className="h-48 rounded-xl bg-zinc-200" />
    </div>
  )
}
