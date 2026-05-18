import { getServerSession } from '@/lib/server-session'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { DashboardContent } from '@/components/dashboard/dashboard-content'

export default async function DashboardPage() {
  const { email } = await getServerSession()

  return (
    <PageWrapper userEmail={email}>
      <DashboardContent />
    </PageWrapper>
  )
}
