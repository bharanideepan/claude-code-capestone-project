import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/cn'

type MetricCardProps = {
  label: string
  value: number
  delta?: number
}

function MetricCard({ label, value, delta }: MetricCardProps) {
  const positive = delta !== undefined && delta >= 0
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-1 text-3xl font-bold text-slate-900">{value.toLocaleString()}</p>
        {delta !== undefined ? (
          <p className={cn('mt-1 text-xs font-medium', positive ? 'text-green-600' : 'text-red-600')}>
            {positive ? '+' : ''}
            {delta.toFixed(1)}% vs prev period
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

type MetricsSummaryProps = {
  commits: number
  prsOpened: number
  prsMerged: number
  contributors: number
}

export function MetricsSummary({ commits, prsOpened, prsMerged, contributors }: MetricsSummaryProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <MetricCard label="Total Commits" value={commits} />
      <MetricCard label="PRs Opened" value={prsOpened} />
      <MetricCard label="PRs Merged" value={prsMerged} />
      <MetricCard label="Active Contributors" value={contributors} />
    </div>
  )
}
