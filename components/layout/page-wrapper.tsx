import { Navbar } from '@/components/layout/navbar'

type PageWrapperProps = {
  userEmail: string
  children: React.ReactNode
}

export function PageWrapper({ userEmail, children }: PageWrapperProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Navbar userEmail={userEmail} />
      <div className="flex flex-1 overflow-hidden">{children}</div>
    </div>
  )
}
