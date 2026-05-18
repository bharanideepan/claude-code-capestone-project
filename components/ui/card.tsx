import { cn } from '@/lib/cn'

type CardProps = {
  className?: string
  children: React.ReactNode
}

export function Card({ className, children }: CardProps) {
  return (
    <div className={cn('rounded-lg border border-slate-200 bg-white shadow-sm', className)}>
      {children}
    </div>
  )
}

export function CardHeader({ className, children }: CardProps) {
  return (
    <div className={cn('border-b border-slate-200 px-6 py-4', className)}>{children}</div>
  )
}

export function CardContent({ className, children }: CardProps) {
  return <div className={cn('px-6 py-4', className)}>{children}</div>
}
