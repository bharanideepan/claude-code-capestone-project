'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getSessionToken } from '@/lib/session-cookie'

type Repository = {
  id: string
  fullName: string
  description: string | null
  isPrivate: boolean
  syncStatus: string
  lastSyncedAt: string | null
}

type RepoCardProps = {
  repo: Repository
  onDisconnect: (id: string) => void
  onSynced: (id: string, syncStatus: string, lastSyncedAt: string) => void
}

const syncVariant: Record<string, 'pending' | 'syncing' | 'success' | 'failed'> = {
  PENDING: 'pending',
  SYNCING: 'syncing',
  SUCCESS: 'success',
  FAILED: 'failed',
}

export function RepoCard({ repo, onDisconnect, onSynced }: RepoCardProps) {
  const [syncing, setSyncing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  async function handleSync() {
    setSyncing(true)
    setSyncError(null)
    try {
      const token = getSessionToken()
      const res = await fetch(`/api/repos/${repo.id}/sync`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = await res.json()
      if (!res.ok) {
        setSyncError(data.error ?? 'Sync failed')
        return
      }
      onSynced(repo.id, data.repository.syncStatus, data.repository.lastSyncedAt)
    } finally {
      setSyncing(false)
    }
  }

  async function handleDisconnect() {
    if (!confirm(`Disconnect ${repo.fullName}? All metric data will be deleted.`)) return
    setDisconnecting(true)
    try {
      const token = getSessionToken()
      const res = await fetch(`/api/repos/${repo.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) onDisconnect(repo.id)
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <Card>
      <CardContent className="flex items-center justify-between py-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-900">{repo.fullName}</span>
            {repo.isPrivate && (
              <Badge variant="default">private</Badge>
            )}
            <Badge variant={syncVariant[repo.syncStatus] ?? 'default'}>
              {repo.syncStatus}
            </Badge>
          </div>
          {repo.description && (
            <p className="text-sm text-slate-500">{repo.description}</p>
          )}
          {repo.lastSyncedAt && (
            <p className="text-xs text-slate-400">
              Last synced: {new Date(repo.lastSyncedAt).toLocaleString()}
            </p>
          )}
          {syncError && <p className="text-xs text-red-600">{syncError}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" loading={syncing} onClick={handleSync}>
            Sync now
          </Button>
          <Button variant="danger" size="sm" loading={disconnecting} onClick={handleDisconnect}>
            Disconnect
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
