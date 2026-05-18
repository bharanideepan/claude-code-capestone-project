'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import { Badge } from '@/components/ui/badge'

type Repository = {
  id: string
  fullName: string
  syncStatus: string
}

type SidebarProps = {
  repos: Repository[]
  selectedRepoId: string | null
  onSelectRepo: (id: string | null) => void
}

const syncVariant: Record<string, 'pending' | 'syncing' | 'success' | 'failed'> = {
  PENDING: 'pending',
  SYNCING: 'syncing',
  SUCCESS: 'success',
  FAILED: 'failed',
}

export function Sidebar({ repos, selectedRepoId, onSelectRepo }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
      <nav className="flex flex-col gap-1 p-4">
        <Link
          href="/dashboard"
          className={cn(
            'rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-100',
            pathname === '/dashboard' ? 'bg-slate-100 text-slate-900' : 'text-slate-600',
          )}
        >
          Dashboard
        </Link>
        <Link
          href="/settings"
          className={cn(
            'rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-100',
            pathname === '/settings' ? 'bg-slate-100 text-slate-900' : 'text-slate-600',
          )}
        >
          Settings
        </Link>
      </nav>

      {repos.length > 0 && (
        <div className="border-t border-slate-200 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Repositories
          </p>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => onSelectRepo(null)}
              className={cn(
                'flex w-full items-center rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-slate-100',
                !selectedRepoId ? 'bg-indigo-50 font-medium text-indigo-700' : 'text-slate-600',
              )}
            >
              All repos
            </button>
            {repos.map((repo) => (
              <button
                key={repo.id}
                onClick={() => onSelectRepo(repo.id)}
                className={cn(
                  'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-slate-100',
                  selectedRepoId === repo.id
                    ? 'bg-indigo-50 font-medium text-indigo-700'
                    : 'text-slate-600',
                )}
              >
                <span className="truncate">{repo.fullName}</span>
                <Badge variant={syncVariant[repo.syncStatus] ?? 'default'} className="ml-2 shrink-0">
                  {repo.syncStatus}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  )
}
