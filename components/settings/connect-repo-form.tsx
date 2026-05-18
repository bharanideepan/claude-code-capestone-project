'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { getSessionToken } from '@/lib/session-cookie'

type ConnectRepoFormProps = {
  onConnected: () => void
}

export function ConnectRepoForm({ onConnected }: ConnectRepoFormProps) {
  const [owner, setOwner] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const token = getSessionToken()
      const res = await fetch('/api/repos/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ owner: owner.trim(), name: name.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to connect repository')
        return
      }
      setOwner('')
      setName('')
      onConnected()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <Input
        id="owner"
        label="Owner"
        value={owner}
        onChange={(e) => setOwner(e.target.value)}
        placeholder="octocat"
        required
        className="w-40"
      />
      <Input
        id="repo-name"
        label="Repository"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="hello-world"
        required
        className="w-56"
      />
      <div className="flex flex-col gap-1">
        <Button type="submit" loading={loading}>
          Connect
        </Button>
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
      </div>
    </form>
  )
}
