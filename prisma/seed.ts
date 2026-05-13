import { PrismaClient, SyncStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Clean existing data in dependency order
  await prisma.metric.deleteMany()
  await prisma.session.deleteMany()
  await prisma.repository.deleteMany()
  await prisma.user.deleteMany()

  // Users
  const passwordHash = await bcrypt.hash('password123', 12)

  const alice = await prisma.user.create({
    data: {
      email: 'alice@devpulse.dev',
      passwordHash,
    },
  })

  const bob = await prisma.user.create({
    data: {
      email: 'bob@devpulse.dev',
      passwordHash,
    },
  })

  console.log(`Created users: ${alice.email}, ${bob.email}`)

  // Repositories
  const repoNextjs = await prisma.repository.create({
    data: {
      githubId: 160857093,
      owner: 'vercel',
      name: 'next.js',
      fullName: 'vercel/next.js',
      description: 'The React Framework for the Web',
      isPrivate: false,
      defaultBranch: 'canary',
      userId: alice.id,
      syncStatus: SyncStatus.SUCCESS,
      lastSyncedAt: new Date(),
    },
  })

  const repoReact = await prisma.repository.create({
    data: {
      githubId: 10270250,
      owner: 'facebook',
      name: 'react',
      fullName: 'facebook/react',
      description: 'The library for web and native user interfaces',
      isPrivate: false,
      defaultBranch: 'main',
      userId: alice.id,
      syncStatus: SyncStatus.SUCCESS,
      lastSyncedAt: new Date(),
    },
  })

  const repoPrisma = await prisma.repository.create({
    data: {
      githubId: 181127512,
      owner: 'prisma',
      name: 'prisma',
      fullName: 'prisma/prisma',
      description: 'Next-generation ORM for Node.js & TypeScript',
      isPrivate: false,
      defaultBranch: 'main',
      userId: bob.id,
      syncStatus: SyncStatus.PENDING,
      lastSyncedAt: null,
    },
  })

  console.log(`Created repos: ${repoNextjs.fullName}, ${repoReact.fullName}, ${repoPrisma.fullName}`)

  // Metrics — 30 days of realistic daily data for alice's repos
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const metricsData = []

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)

    // next.js: active repo, high volume
    metricsData.push({
      repoId: repoNextjs.id,
      date,
      commits: Math.floor(Math.random() * 12) + 3,
      prsOpened: Math.floor(Math.random() * 6) + 1,
      prsMerged: Math.floor(Math.random() * 4),
      prsClosed: Math.floor(Math.random() * 2),
      contributors: Math.floor(Math.random() * 8) + 2,
      additions: Math.floor(Math.random() * 800) + 100,
      deletions: Math.floor(Math.random() * 300) + 20,
    })

    // react: moderate activity
    metricsData.push({
      repoId: repoReact.id,
      date,
      commits: Math.floor(Math.random() * 6) + 1,
      prsOpened: Math.floor(Math.random() * 3),
      prsMerged: Math.floor(Math.random() * 3),
      prsClosed: Math.floor(Math.random() * 2),
      contributors: Math.floor(Math.random() * 5) + 1,
      additions: Math.floor(Math.random() * 400) + 50,
      deletions: Math.floor(Math.random() * 150) + 10,
    })
  }

  await prisma.metric.createMany({ data: metricsData })
  console.log(`Created ${metricsData.length} metric rows across 30 days`)

  // One active session for alice
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  await prisma.session.create({
    data: {
      userId: alice.id,
      token: 'seed-token-alice-do-not-use-in-production',
      expiresAt,
      ipAddress: '127.0.0.1',
      userAgent: 'Seed Script',
    },
  })

  console.log('Seed complete.')
  console.log('\nTest credentials:')
  console.log('  alice@devpulse.dev / password123')
  console.log('  bob@devpulse.dev   / password123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
