import { RegisterForm } from '@/components/auth/register-form'
import { Card, CardContent } from '@/components/ui/card'

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">DevPulse</h1>
          <p className="mt-1 text-sm text-slate-500">Create your account</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <RegisterForm />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
