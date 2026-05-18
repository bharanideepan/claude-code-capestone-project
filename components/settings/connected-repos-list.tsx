'use client'

import { useState } from 'react'
import { RepoCard } from '@/components/settings/repo-card'

type Repository = {
  id: string
  fullName: string
  description: string | null
  isPrivate: boolean
  syncStatus: string
  lastSyncedAt: string | null
}

type ConnectedReposListProps = {
  initialRepos: Repository[]
}

export function ConnectedReposList({ initialRepos }: ConnectedReposListProps) {
  const [repos, setRepos] = useState(initialRepos)

  function handleDisconnect(id: string) {
    setRepos((prev) => prev.filter((r) => r.id !== id))
  }

  function handleSynced(id: string, syncStatus: string, lastSyncedAt: string) {
    setRepos((prev) =>
      prev.map((r) => (r.id === id ? { ...r, syncStatus, lastSyncedAt } : r)),
    )
  }

  if (repos.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No repositories connected yet. Add one above.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {repos.map((repo) => (
        <RepoCard
          key={repo.id}
          repo={repo}
          onDisconnect={handleDisconnect}
          onSynced={handleSynced}
        />
      ))}
    </div>
  )
}
