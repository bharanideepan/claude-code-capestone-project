import { LoginForm } from '@/components/auth/login-form'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">DevPulse</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to your account</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
