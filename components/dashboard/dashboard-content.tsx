'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { MetricsSummary } from '@/components/dashboard/metrics-summary'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { CommitFrequencyChart } from '@/components/charts/commit-frequency-chart'
import { PRStatChart } from '@/components/charts/pr-stat-chart'
import { ContributorTrendChart } from '@/components/charts/contributor-trend-chart'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { useRepos } from '@/hooks/use-repos'
import { useDashboard } from '@/hooks/use-dashboard'

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]!
}

function defaultRange() {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 30)
  return { from: toDateStr(from), to: toDateStr(to) }
}

export function DashboardContent() {
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null)
  const [range, setRange] = useState(defaultRange)

  const { repos, loading: reposLoading } = useRepos()
  const { totals, metrics, loading: metricsLoading, error: metricsError } = useDashboard(
    selectedRepoId,
    range.from,
    range.to,
  )

  const loading = reposLoading || metricsLoading

  return (
    <div className="flex flex-1 overflow-hidden">
      <Sidebar repos={repos} selectedRepoId={selectedRepoId} onSelectRepo={setSelectedRepoId} />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-6">
          <ActivityFeed range={range} onRangeChange={setRange} />
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center text-sm text-slate-400">
            Loading…
          </div>
        ) : metricsError ? (
          <div className="flex h-64 items-center justify-center text-sm text-red-500">
            {metricsError}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <MetricsSummary
              commits={totals.commits}
              prsOpened={totals.prsOpened}
              prsMerged={totals.prsMerged}
              contributors={totals.contributors}
            />

            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <h2 className="text-sm font-semibold text-slate-700">Commit Frequency</h2>
                </CardHeader>
                <CardContent>
                  <CommitFrequencyChart
                    data={metrics.map((m) => ({ date: m.date.slice(0, 10), commits: m.commits }))}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <h2 className="text-sm font-semibold text-slate-700">Pull Requests</h2>
                </CardHeader>
                <CardContent>
                  <PRStatChart
                    data={metrics.map((m) => ({
                      date: m.date.slice(0, 10),
                      prsOpened: m.prsOpened,
                      prsMerged: m.prsMerged,
                      prsClosed: m.prsClosed,
                    }))}
                  />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-slate-700">Contributor Activity</h2>
              </CardHeader>
              <CardContent>
                <ContributorTrendChart
                  data={metrics.map((m) => ({
                    date: m.date.slice(0, 10),
                    contributors: m.contributors,
                  }))}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
