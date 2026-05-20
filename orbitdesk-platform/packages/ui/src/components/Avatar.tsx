type Size = 'xs' | 'sm' | 'md' | 'lg'

interface AvatarProps {
  name: string
  src?: string
  size?: Size
  className?: string
}

const sizeStyles: Record<Size, string> = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
}

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export function Avatar({ name, src, size = 'sm', className = '' }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizeStyles[size]} rounded-full object-cover shrink-0 ${className}`}
      />
    )
  }

  return (
    <span
      className={`${sizeStyles[size]} rounded-full bg-gradient-to-br from-violet-500 to-violet-700
        flex items-center justify-center font-semibold text-white shrink-0 ${className}`}
    >
      {getInitials(name)}
    </span>
  )
}
