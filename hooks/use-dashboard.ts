'use client'

import { useState, useEffect } from 'react'
import { getSessionToken } from '@/lib/session-cookie'

type MetricRow = {
  date: string
  commits: number
  prsOpened: number
  prsMerged: number
  prsClosed: number
  contributors: number
  additions: number
  deletions: number
}

type SummaryTotals = {
  commits: number
  prsOpened: number
  prsMerged: number
  contributors: number
  additions: number
  deletions: number
}

type DashboardData = {
  totals: SummaryTotals
  metrics: MetricRow[]
}

type UseDashboardResult = DashboardData & {
  loading: boolean
  error: string | null
}

const EMPTY_TOTALS: SummaryTotals = {
  commits: 0, prsOpened: 0, prsMerged: 0, contributors: 0, additions: 0, deletions: 0,
}

export function useDashboard(
  repoId: string | null,
  from: string,
  to: string,
): UseDashboardResult {
  const [totals, setTotals] = useState<SummaryTotals>(EMPTY_TOTALS)
  const [metrics, setMetrics] = useState<MetricRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const token = getSessionToken()
        const headers: Record<string, string> = {}
        if (token) headers['Authorization'] = `Bearer ${token}`
        const params = new URLSearchParams({ from, to })

        if (repoId) {
          const res = await fetch(`/api/metrics/${repoId}?${params}&granularity=day`, { headers })
          if (!active) return
          if (!res.ok) {
            const d = await res.json()
            setError(d.error ?? 'Failed to load metrics')
            return
          }
          const data = await res.json()
          const t = (data.data as MetricRow[]).reduce(
            (acc, m) => ({
              commits: acc.commits + m.commits,
              prsOpened: acc.prsOpened + m.prsOpened,
              prsMerged: acc.prsMerged + m.prsMerged,
              contributors: acc.contributors + m.contributors,
              additions: acc.additions + m.additions,
              deletions: acc.deletions + m.deletions,
            }),
            { ...EMPTY_TOTALS },
          )
          setMetrics(data.data)
          setTotals(t)
        } else {
          const res = await fetch(`/api/dashboard/summary?${params}`, { headers })
          if (!active) return
          if (!res.ok) {
            const d = await res.json()
            setError(d.error ?? 'Failed to load summary')
            return
          }
          const data = await res.json()
          setTotals(data.totals)
          setMetrics([])
        }
      } catch {
        if (active) setError('Network error')
      } finally {
        if (active) setLoading(false)
      }
    }

    void fetchData()
    return () => { active = false }
  }, [repoId, from, to])

  return { totals, metrics, loading, error }
}
