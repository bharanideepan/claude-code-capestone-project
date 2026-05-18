import { z } from 'zod'

// Auth schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

// GitHub username/org: 1–39 alphanumeric chars or single hyphens, no leading/trailing hyphen
const githubOwnerRe = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/
// GitHub repo name: 1–100 chars, alphanumeric, hyphens, underscores, dots
const githubRepoRe = /^[a-zA-Z0-9_.-]{1,100}$/

// Repo schemas
export const connectRepoSchema = z.object({
  owner: z
    .string()
    .min(1, 'Owner is required')
    .max(39, 'Owner must be 39 characters or fewer')
    .regex(githubOwnerRe, 'Owner contains invalid characters'),
  name: z
    .string()
    .min(1, 'Repository name is required')
    .max(100, 'Repository name must be 100 characters or fewer')
    .regex(githubRepoRe, 'Repository name contains invalid characters'),
})

// Metrics schemas
export const metricsQuerySchema = z.object({
  from: z.string().date('Invalid from date (use YYYY-MM-DD)'),
  to: z.string().date('Invalid to date (use YYYY-MM-DD)'),
  granularity: z.enum(['day', 'week', 'month']).default('day'),
})

export const dashboardQuerySchema = z.object({
  from: z.string().date('Invalid from date (use YYYY-MM-DD)'),
  to: z.string().date('Invalid to date (use YYYY-MM-DD)'),
})

// Shared response helpers
export const errorResponse = (message: string, status: number): Response =>
  Response.json({ error: message }, { status })
