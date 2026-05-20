type Size = 'sm' | 'md' | 'lg'

interface SpinnerProps {
  size?: Size
  className?: string
}

const sizeStyles: Record<Size, string> = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-2',
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <span
      className={`${sizeStyles[size]} border-zinc-300 border-t-violet-600
        rounded-full animate-spin inline-block ${className}`}
    />
  )
}
