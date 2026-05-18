'use client'

import { Button } from '@/components/ui/button'

type DateRange = {
  from: string
  to: string
}

type ActivityFeedProps = {
  range: DateRange
  onRangeChange: (range: DateRange) => void
}

const PRESETS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
]

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]!
}

export function ActivityFeed({ range, onRangeChange }: ActivityFeedProps) {
  function applyPreset(days: number) {
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - days)
    onRangeChange({ from: toDateStr(from), to: toDateStr(to) })
  }

  function handleFromChange(e: React.ChangeEvent<HTMLInputElement>) {
    onRangeChange({ ...range, from: e.target.value })
  }

  function handleToChange(e: React.ChangeEvent<HTMLInputElement>) {
    onRangeChange({ ...range, to: e.target.value })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-slate-600">Date range:</span>
      {PRESETS.map((p) => (
        <Button key={p.days} variant="secondary" size="sm" onClick={() => applyPreset(p.days)}>
          {p.label}
        </Button>
      ))}
      <div className="flex items-center gap-1">
        <input
          type="date"
          value={range.from}
          onChange={handleFromChange}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          aria-label="From date"
        />
        <span className="text-slate-400">–</span>
        <input
          type="date"
          value={range.to}
          onChange={handleToChange}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          aria-label="To date"
        />
      </div>
    </div>
  )
}
