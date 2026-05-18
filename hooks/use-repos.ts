'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSessionToken } from '@/lib/session-cookie'

type Repository = {
  id: string
  githubId: number
  owner: string
  name: string
  fullName: string
  description: string | null
  isPrivate: boolean
  syncStatus: string
  lastSyncedAt: string | null
}

type UseReposResult = {
  repos: Repository[]
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useRepos(): UseReposResult {
  const [repos, setRepos] = useState<Repository[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick((n) => n + 1), [])

  useEffect(() => {
    let active = true

    async function fetchRepos() {
      setLoading(true)
      setError(null)
      try {
        const token = getSessionToken()
        const headers: Record<string, string> = {}
        if (token) headers['Authorization'] = `Bearer ${token}`
        const res = await fetch('/api/repos', { headers })
        if (!active) return
        if (!res.ok) {
          const d = await res.json()
          setError(d.error ?? 'Failed to load repositories')
          return
        }
        const data = await res.json()
        setRepos(data.repositories)
      } catch {
        if (active) setError('Network error')
      } finally {
        if (active) setLoading(false)
      }
    }

    void fetchRepos()
    return () => { active = false }
  }, [tick])

  return { repos, loading, error, refresh }
}
