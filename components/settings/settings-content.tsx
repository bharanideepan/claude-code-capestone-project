'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { ConnectRepoForm } from '@/components/settings/connect-repo-form'
import { ConnectedReposList } from '@/components/settings/connected-repos-list'
import { Card, CardHeader, CardContent } from '@/components/ui/card'

type Repository = {
  id: string
  fullName: string
  description: string | null
  isPrivate: boolean
  syncStatus: string
  lastSyncedAt: string | null
}

type SettingsContentProps = {
  initialRepos: Repository[]
}

export function SettingsContent({ initialRepos }: SettingsContentProps) {
  const [repos, setRepos] = useState(initialRepos)

  function handleConnected() {
    // Refresh by reloading — full page refresh to get updated list from server
    window.location.reload()
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <Sidebar repos={repos} selectedRepoId={null} onSelectRepo={() => {}} />

      <main className="flex-1 overflow-y-auto p-6">
        <h1 className="mb-6 text-xl font-semibold text-slate-900">Settings</h1>

        <div className="flex max-w-2xl flex-col gap-6">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-700">Connect a Repository</h2>
              <p className="mt-1 text-xs text-slate-500">
                Enter the owner and repository name from GitHub.
              </p>
            </CardHeader>
            <CardContent>
              <ConnectRepoForm onConnected={handleConnected} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-700">Connected Repositories</h2>
            </CardHeader>
            <CardContent>
              <ConnectedReposList initialRepos={repos} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
