import { cn } from '@/lib/cn'

type BadgeVariant = 'pending' | 'syncing' | 'success' | 'failed' | 'default'

type BadgeProps = {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variants: Record<BadgeVariant, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  syncing: 'bg-blue-100 text-blue-800',
  success: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  default: 'bg-slate-100 text-slate-700',
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
