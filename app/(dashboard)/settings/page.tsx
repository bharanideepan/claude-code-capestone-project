import { getServerSession } from '@/lib/server-session'
import { prisma } from '@/lib/db'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { SettingsContent } from '@/components/settings/settings-content'

export default async function SettingsPage() {
  const { email, userId } = await getServerSession()

  const repos = await prisma.repository.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      fullName: true,
      description: true,
      isPrivate: true,
      syncStatus: true,
      lastSyncedAt: true,
    },
  })

  const repoList = repos.map((r) => ({
    ...r,
    syncStatus: r.syncStatus as string,
    lastSyncedAt: r.lastSyncedAt?.toISOString() ?? null,
  }))

  return (
    <PageWrapper userEmail={email}>
      <SettingsContent initialRepos={repoList} />
    </PageWrapper>
  )
}
