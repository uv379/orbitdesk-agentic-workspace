// Merge class names — drop falsy values
// Usage: cn('base-class', isActive && 'active-class', className)
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
