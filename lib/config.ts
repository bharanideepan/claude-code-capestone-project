const required = (key: string): string => {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required environment variable: ${key}`)
  return val
}

export const config = {
  databaseUrl: required('DATABASE_URL'),
  sessionSecret: required('SESSION_SECRET'),
  githubToken: process.env['GITHUB_TOKEN'] ?? '',
  appUrl: process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000',
} as const
