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

// Repo schemas
export const connectRepoSchema = z.object({
  owner: z.string().min(1, 'Owner is required'),
  name: z.string().min(1, 'Repository name is required'),
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
