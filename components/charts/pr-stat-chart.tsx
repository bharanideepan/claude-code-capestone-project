'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

type DataPoint = {
  date: string
  prsOpened: number
  prsMerged: number
  prsClosed: number
}

type PRStatChartProps = {
  data: DataPoint[]
}

export function PRStatChart({ data }: PRStatChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
        No PR data for this period
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={256}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12, fill: '#64748b' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#64748b' }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}
        />
        <Legend iconType="square" wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="prsOpened" name="Opened" stackId="a" fill="#6366f1" />
        <Bar dataKey="prsMerged" name="Merged" stackId="a" fill="#10b981" />
        <Bar dataKey="prsClosed" name="Closed" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
