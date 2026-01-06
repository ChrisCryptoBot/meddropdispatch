# Production Deployment Guide

## Infrastructure Requirements

### 1. Database Setup

#### Option A: AWS RDS (PostgreSQL) - Recommended for Production

```bash
# Create RDS PostgreSQL instance
# Minimum specs: db.t3.micro (1 vCPU, 1GB RAM) for small deployments
# Recommended: db.t3.small (2 vCPU, 2GB RAM) or higher

# Update DATABASE_URL in production environment:
DATABASE_URL="postgresql://username:password@your-rds-endpoint:5432/meddrop?schema=public&sslmode=require"
```

**Prisma Migration Steps:**
```bash
# Run migrations in production
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

#### Option B: Managed PostgreSQL (Vercel Postgres, Supabase, etc.)

```bash
# Vercel Postgres
DATABASE_URL="postgres://default:password@host:5432/verceldb?sslmode=require"

# Supabase
DATABASE_URL="postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"
```

### 2. Environment Variables

Create a `.env.production` file with all required variables:

```bash
# Database
DATABASE_URL="postgresql://..."

# Authentication
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="https://your-domain.com"

# Email (SendGrid or SMTP)
SENDGRID_API_KEY="SG.xxx"
EMAIL_FROM="noreply@your-domain.com"
EMAIL_FROM_NAME="Med Drop"

# Google Maps API
GOOGLE_MAPS_API_KEY="your-google-maps-api-key"

# Twilio (for SMS)
TWILIO_ACCOUNT_SID="ACxxx"
TWILIO_AUTH_TOKEN="xxx"
TWILIO_PHONE_NUMBER="+1234567890"

# Sentry (Error Monitoring)
NEXT_PUBLIC_SENTRY_DSN="https://xxx@sentry.io/xxx"
SENTRY_DSN="https://xxx@sentry.io/xxx"
SENTRY_ORG="your-org"
SENTRY_PROJECT="med-drop"
SENTRY_AUTH_TOKEN="xxx"

# Vercel Blob Storage (for document uploads)
BLOB_READ_WRITE_TOKEN="vercel_blob_xxx"

# Application
NODE_ENV="production"
```

### 3. Deployment Options

#### Option A: Vercel (Recommended for Next.js)

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Set build command: `npm run build`
4. Set output directory: `.next`
5. Deploy!

**Vercel-specific settings:**
- Framework Preset: Next.js
- Node.js Version: 20.x
- Install Command: `npm ci`

#### Option B: Docker Deployment

```bash
# Build Docker image
docker build -t med-drop:latest .

# Run container
docker run -d \
  --name med-drop \
  -p 3000:3000 \
  --env-file .env.production \
  med-drop:latest
```

**Docker Compose Example:**
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
    env_file:
      - .env.production
    restart: unless-stopped
```

#### Option C: AWS ECS/Fargate

1. Build and push Docker image to ECR
2. Create ECS task definition
3. Configure environment variables
4. Set up Application Load Balancer
5. Deploy service

### 4. Database Migrations

**First-time setup:**
```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed initial data (if needed)
npm run prisma:seed
```

**For subsequent deployments:**
```bash
# Always run migrations before deploying new code
npx prisma migrate deploy
```

### 5. Monitoring & Observability

#### Sentry Setup

1. Create account at https://sentry.io
2. Create new project (Next.js)
3. Copy DSN to environment variables
4. Configure release tracking:

```bash
# In your CI/CD pipeline
export SENTRY_RELEASE=$(git rev-parse HEAD)
```

#### Health Checks

The application exposes health check endpoints:
- `/api/health` - Basic health check
- `/api/health/db` - Database connectivity check

### 6. Security Checklist

- [ ] All environment variables are set
- [ ] Database uses SSL/TLS connection
- [ ] HTTPS is enabled (automatic on Vercel)
- [ ] CSP headers are configured (see `next.config.js`)
- [ ] Rate limiting is enabled (configured in `lib/rate-limit.ts`)
- [ ] Authentication secrets are strong and unique
- [ ] API keys are rotated regularly
- [ ] Database backups are configured
- [ ] Error monitoring (Sentry) is active

### 7. Performance Optimization

- [ ] Enable CDN for static assets
- [ ] Configure caching headers (already in `next.config.js`)
- [ ] Database connection pooling is configured
- [ ] Image optimization is enabled (Next.js Image component)
- [ ] Enable compression (gzip/brotli)

### 8. Backup & Recovery

#### Database Backups

**PostgreSQL (AWS RDS):**
- Automated backups enabled (7-day retention minimum)
- Point-in-time recovery configured

**Manual Backup:**
```bash
# Export database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore
psql $DATABASE_URL < backup_20240101.sql
```

#### Application State

- Document uploads stored in Vercel Blob (automatically backed up)
- User sessions stored in cookies (stateless)
- No file system dependencies

### 9. Scaling Considerations

**Horizontal Scaling:**
- Application is stateless (can run multiple instances)
- Use load balancer for multiple containers
- Database connection pooling handles concurrent connections

**Vertical Scaling:**
- Increase database instance size for more load
- Increase container resources (CPU/memory)

**Database Scaling:**
- Read replicas for read-heavy workloads
- Connection pooling (PgBouncer recommended)
- Index optimization (already configured in Prisma schema)

### 10. Post-Deployment Verification

```bash
# 1. Check application health
curl https://your-domain.com/api/health

# 2. Verify database connectivity
curl https://your-domain.com/api/health/db

# 3. Test authentication flow
# - Driver login
# - Shipper login
# - Admin login

# 4. Test critical workflows
# - Load request creation
# - Driver assignment
# - Status updates
# - Document uploads

# 5. Monitor Sentry for errors
# - Check for any immediate errors
# - Verify error tracking is working
```

### 11. Rollback Procedure

**If deployment fails:**

1. **Vercel:**
   - Go to Deployments tab
   - Click "..." on previous successful deployment
   - Select "Promote to Production"

2. **Docker:**
   ```bash
   # Stop current container
   docker stop med-drop
   
   # Start previous version
   docker run -d --name med-drop -p 3000:3000 med-drop:previous-tag
   ```

3. **Database Rollback:**
   ```bash
   # Revert last migration (if needed)
   npx prisma migrate resolve --rolled-back <migration-name>
   ```

### 12. Maintenance Windows

- Schedule maintenance during low-traffic hours
- Notify users in advance
- Use feature flags for gradual rollouts
- Monitor error rates during deployment

## Support

For issues or questions:
- Check Sentry for error details
- Review application logs
- Consult documentation in `/docs` directory

