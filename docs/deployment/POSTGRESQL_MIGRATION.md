# PostgreSQL Migration Guide

## Overview

This guide covers migrating from SQLite (development) to PostgreSQL (production) for MED DROP.

## Why PostgreSQL?

- **Production-ready:** Handles concurrent connections
- **Scalability:** Supports high traffic
- **Features:** Full-text search, JSON support, advanced indexing
- **Compliance:** Required for HIPAA (with proper configuration)
- **Backups:** Automated backup solutions available

## Provider Options

### Option 1: Supabase (Recommended for Startups)

**Pros:**
- Free tier (500MB database)
- PostgreSQL 15
- Built-in backups
- BAA available (paid plans)
- Easy setup

**Cons:**
- Limited free tier
- Vendor lock-in (Supabase-specific features)

**Setup:**
1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Copy connection string from Settings > Database

### Option 2: Neon (Serverless PostgreSQL)

**Pros:**
- Serverless (pay per use)
- PostgreSQL 15
- Branching (database branching for testing)
- Free tier available

**Cons:**
- Newer service (less proven)
- BAA availability unclear

**Setup:**
1. Create account at [neon.tech](https://neon.tech)
2. Create project
3. Copy connection string

### Option 3: AWS RDS PostgreSQL

**Pros:**
- Enterprise-grade
- HIPAA-eligible with BAA
- Full control
- Automated backups

**Cons:**
- More complex setup
- Higher cost
- Requires AWS knowledge

**Setup:**
1. Create RDS instance in AWS Console
2. Configure security groups
3. Get connection string

### Option 4: Railway

**Pros:**
- Simple setup
- Free tier
- Easy deployment

**Cons:**
- Limited documentation
- BAA availability unclear

## Migration Steps

### Step 1: Update Prisma Schema

**Current (`prisma/schema.prisma`):**
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

**Update to:**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Step 2: Set Environment Variable

**Development (`.env`):**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/meddrop?schema=public"
```

**Production (Vercel):**
```env
DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public&sslmode=require"
```

### Step 3: Generate Prisma Client

```bash
npx prisma generate
```

### Step 4: Create Migration

```bash
# This will create a new migration
npx prisma migrate dev --name init_postgresql
```

**Note:** This creates a migration based on your current schema. If you have existing SQLite data, you'll need to export and import it separately.

### Step 5: Run Migration (Production)

```bash
# For production, use migrate deploy (no prompts)
npx prisma migrate deploy
```

### Step 6: Verify Connection

```bash
# Open Prisma Studio
npx prisma studio

# Or test connection
npx prisma db pull
```

## Data Migration (If You Have Existing SQLite Data)

### Option 1: Prisma Migrate (Recommended)

If you're starting fresh, Prisma Migrate will handle everything.

### Option 2: Manual Export/Import

**Export from SQLite:**
```bash
# Export to SQL
sqlite3 prisma/dev.db .dump > export.sql
```

**Import to PostgreSQL:**
```bash
# Note: SQLite SQL may need manual adjustments
psql $DATABASE_URL < export.sql
```

**Better Approach: Use Prisma Seed:**
```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'

const prisma = new PrismaClient()

async function main() {
  // Read exported data
  const data = JSON.parse(readFileSync('export.json', 'utf-8'))
  
  // Import data
  for (const shipper of data.shippers) {
    await prisma.shipper.create({ data: shipper })
  }
  // ... etc
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

## PostgreSQL-Specific Optimizations

### 1. Connection Pooling

**For Serverless (Vercel):**
```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**For Traditional Servers:**
Use PgBouncer or connection pooler:
```typescript
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '?pgbouncer=true&connection_limit=1',
    },
  },
})
```

### 2. Indexes

Prisma will create indexes from `@@index` directives, but you may want additional indexes:

```prisma
model LoadRequest {
  // ... fields
  @@index([status, createdAt]) // Composite index
  @@index([shipperId, status]) // For shipper queries
}
```

### 3. Full-Text Search

```prisma
model LoadRequest {
  // ... fields
  @@index([publicTrackingCode], type: Gin) // For full-text search
}
```

### 4. JSON Fields

PostgreSQL supports JSON natively:
```prisma
model LoadRequest {
  metadata Json? // Use JSON type instead of String
}
```

## Testing Migration

### 1. Test Locally

```bash
# Set up local PostgreSQL
docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres

# Update DATABASE_URL
DATABASE_URL="postgresql://postgres:password@localhost:5432/meddrop"

# Run migrations
npx prisma migrate dev

# Test application
npm run dev
```

### 2. Test in Staging

1. Set up staging database
2. Deploy to staging environment
3. Run migrations
4. Test all functionality

### 3. Production Migration

1. **Backup SQLite database** (if applicable)
2. **Set up production PostgreSQL**
3. **Update DATABASE_URL in Vercel**
4. **Run migrations:** `npx prisma migrate deploy`
5. **Verify:** Test critical paths
6. **Monitor:** Watch for errors

## Rollback Plan

If migration fails:

1. **Revert DATABASE_URL** to SQLite (temporary)
2. **Fix issues** in staging
3. **Re-attempt migration**

For production, always test in staging first.

## Common Issues

### Issue 1: Connection String Format

**Wrong:**
```
postgres://user:pass@host/db
```

**Correct:**
```
postgresql://user:pass@host:5432/db?schema=public
```

### Issue 2: SSL Required

**Add to connection string:**
```
?sslmode=require
```

### Issue 3: Connection Limits

**Supabase/Neon:** Limited connections on free tier  
**Solution:** Use connection pooling

### Issue 4: Enum Types

SQLite doesn't support enums, but PostgreSQL does. Prisma will handle this automatically.

## Performance Tuning

### 1. Connection Pool Size

```typescript
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '?connection_limit=10',
    },
  },
})
```

### 2. Query Optimization

Use Prisma's `select` to limit fields:
```typescript
const loads = await prisma.loadRequest.findMany({
  select: {
    id: true,
    status: true,
    // Only select needed fields
  },
})
```

### 3. Batch Operations

```typescript
// Use transactions for batch operations
await prisma.$transaction([
  prisma.loadRequest.create({ data: load1 }),
  prisma.loadRequest.create({ data: load2 }),
])
```

## Monitoring

**Key Metrics:**
- Connection count
- Query performance
- Database size
- Backup status

**Tools:**
- Supabase Dashboard
- Neon Dashboard
- AWS CloudWatch (for RDS)
- Prisma Studio

## Backup Strategy

### Automated Backups

**Supabase:**
- Daily backups (paid plans)
- Point-in-time recovery (PITR)

**Neon:**
- Automated backups
- Branching for testing

**AWS RDS:**
- Automated daily backups
- Retention: 7-35 days

### Manual Backups

```bash
# Export database
pg_dump $DATABASE_URL > backup.sql

# Restore
psql $DATABASE_URL < backup.sql
```

## Security

1. **Use SSL:** Always require SSL in production
2. **Restrict Access:** Use IP whitelisting if possible
3. **Rotate Credentials:** Regularly rotate database passwords
4. **Monitor Access:** Enable audit logging

## Cost Estimates

**Supabase:**
- Free: 500MB, 2GB bandwidth
- Pro: $25/month (8GB, 50GB bandwidth)

**Neon:**
- Free: 0.5GB storage
- Paid: $0.10/GB storage, $0.10/GB compute

**AWS RDS:**
- db.t3.micro: ~$15/month
- db.t3.small: ~$30/month

## References

- [Prisma PostgreSQL Guide](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [Supabase Documentation](https://supabase.com/docs)
- [Neon Documentation](https://neon.tech/docs)
- [AWS RDS PostgreSQL](https://aws.amazon.com/rds/postgresql/)

