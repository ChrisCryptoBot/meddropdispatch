# MED DROP - Deployment & Operations Runbook

**Purpose:** Complete guide for deploying, operating, and troubleshooting MED DROP in production.

---

## 🚀 DEPLOYMENT

### Prerequisites

1. **Vercel Account** (recommended) or alternative hosting
2. **PostgreSQL Database** (Supabase, Neon, or AWS RDS)
3. **Email Provider** (Resend, SendGrid, or SMTP)
4. **Domain Name** (optional but recommended)
5. **Sentry Account** (optional - for error tracking)

### Initial Deployment

#### 1. Database Setup

```bash
# Create PostgreSQL database (Supabase example)
# 1. Go to https://supabase.com
# 2. Create new project
# 3. Get connection string from Settings > Database

# Update DATABASE_URL in environment variables:
DATABASE_URL="postgresql://user:password@host:port/database"
```

#### 2. Environment Variables Setup

Set the following in Vercel (or your hosting platform):

**Required:**
```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET=YOUR_NEXTAUTH_SECRET
NEXTAUTH_URL="https://yourdomain.com"
NODE_ENV="production"
```

**Email (choose one):**
```env
# Option 1: Resend (recommended)
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="noreply@yourdomain.com"
RESEND_FROM_NAME="MED DROP"

# Option 2: SendGrid
# SENDGRID_API_KEY="SG..."
# SENDGRID_FROM_EMAIL="noreply@yourdomain.com"

# Option 3: SMTP
# SMTP_HOST="smtp.example.com"
# SMTP_PORT="587"
# SMTP_USER="your-username"
# SMTP_PASS="your-password"
```

**Optional but Recommended:**
```env
SENTRY_DSN="https://..."
GOOGLE_MAPS_API_KEY="..."
BLOB_READ_WRITE_TOKEN="..."
```

#### 3. Deploy to Vercel

```bash
# 1. Push code to GitHub
git push origin main

# 2. Import project in Vercel
# - Go to vercel.com/dashboard
# - Click "Import Project"
# - Select your GitHub repo
# - Configure environment variables
# - Deploy

# 3. Run database migrations
vercel env pull .env.production
npx prisma migrate deploy
npx prisma generate
```

#### 4. Post-Deployment

```bash
# 1. Create admin user
npm run create:admin admin@yourdomain.com SecurePassword123 "Admin Name"

# 2. Verify deployment
curl https://yourdomain.com/api/health

# 3. Test email sending
curl -X POST https://yourdomain.com/api/debug/test-email
```

---

## 🔄 ROLLBACK PROCEDURES

### Vercel Rollback

1. **Via Dashboard:**
   - Go to Vercel Dashboard > Your Project > Deployments
   - Find previous working deployment
   - Click "..." menu > "Promote to Production"

2. **Via CLI:**
   ```bash
   vercel rollback <deployment-url>
   ```

3. **Database Rollback (if migration failed):**
   ```bash
   # List migrations
   npx prisma migrate status
   
   # Rollback last migration (manual)
   # ⚠️ WARNING: Only if necessary, as Prisma doesn't have built-in rollback
   # You may need to manually revert the migration SQL
   ```

### Quick Rollback Checklist

- [ ] Identify last working deployment
- [ ] Promote previous deployment in Vercel
- [ ] Verify database schema compatibility
- [ ] Test critical workflows
- [ ] Notify team of rollback

---

## 🐛 TROUBLESHOOTING

### Common Issues

#### 1. Database Connection Failed

**Symptoms:**
- 500 errors on all API routes
- Database connection timeout errors in logs

**Diagnosis:**
```bash
# Check database URL format
echo $DATABASE_URL

# Test connection
npx prisma db execute --stdin <<< "SELECT 1"
```

**Fix:**
- Verify DATABASE_URL is correct
- Check database firewall rules
- Verify database is running
- Check SSL requirements

#### 2. Email Not Sending

**Symptoms:**
- Emails appear in logs but never arrive
- No email provider errors

**Diagnosis:**
```bash
# Test email endpoint
curl -X POST https://yourdomain.com/api/debug/test-email
```

**Fix:**
- Verify email provider API key
- Check email provider dashboard for errors
- Verify FROM email is verified in provider
- Check spam folders

#### 3. Authentication Issues

**Symptoms:**
- Users can't login
- Sessions expire immediately
- httpOnly cookies not working

**Diagnosis:**
```bash
# Check cookie settings
curl -v https://yourdomain.com/api/auth/shipper/login
```

**Fix:**
- Verify NEXTAUTH_SECRET is set
- Check NEXTAUTH_URL matches domain
- Verify cookie settings in auth-session.ts
- Check HTTPS is enabled (required for secure cookies)

#### 4. Build Failures

**Symptoms:**
- Deployment fails at build step
- TypeScript errors
- Missing dependencies

**Fix:**
```bash
# Test build locally
npm run build

# Check for errors
npm run lint

# Verify all dependencies
npm install
```

#### 5. Performance Issues

**Symptoms:**
- Slow page loads
- API timeouts
- High database load

**Diagnosis:**
- Check Vercel analytics
- Review database query logs
- Check Sentry for errors
- Review server logs

**Fix:**
- Optimize slow database queries
- Add database indexes
- Enable caching where appropriate
- Scale database if needed

---

## 📊 MONITORING

### Health Checks

**Application Health:**
```bash
GET /api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected",
  "version": "1.0.0"
}
```

### Key Metrics to Monitor

1. **Response Times**
   - API endpoint latency
   - Database query times
   - Page load times

2. **Error Rates**
   - 5xx errors
   - 4xx errors
   - Sentry error count

3. **Database**
   - Connection pool usage
   - Query performance
   - Storage usage

4. **Email**
   - Delivery success rate
   - Bounce rate
   - Provider API errors

### Logs

**Vercel Logs:**
- Dashboard > Project > Logs
- Real-time logs available
- Filter by deployment

**Sentry:**
- Error tracking
- Performance monitoring
- User impact analysis

**Application Logs:**
- Structured logging via `lib/logger.ts`
- Logs include: timestamp, level, message, context

---

## 🔒 SECURITY

### Security Checklist

- [ ] NEXTAUTH_SECRET is strong and unique
- [ ] All environment variables are set
- [ ] Database has SSL enabled
- [ ] HTTPS is enforced
- [ ] CORS is configured correctly
- [ ] Rate limiting is enabled
- [ ] Input validation is active
- [ ] Audit logging is enabled

### Security Updates

**Regular Tasks:**
1. Update dependencies monthly
2. Review security advisories
3. Rotate API keys quarterly
4. Review audit logs weekly
5. Update NEXTAUTH_SECRET if compromised

---

## 🗄️ DATABASE MANAGEMENT

### Backup Strategy

**Recommended:**
- **Daily automated backups** (via Supabase/Neon)
- **Manual backup before migrations:**
  ```bash
  # Supabase
  supabase db dump -f backup-$(date +%Y%m%d).sql

  # Generic PostgreSQL
  pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
  ```

### Restore Procedure

```bash
# Restore from backup
psql $DATABASE_URL < backup-20240101.sql

# Or via Supabase CLI
supabase db reset --file backup-20240101.sql
```

### Migration Management

```bash
# Check migration status
npx prisma migrate status

# Create new migration
npx prisma migrate dev --name description

# Deploy migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

---

## 🚨 INCIDENT RESPONSE

### Critical Incident Checklist

1. **Assess Impact**
   - How many users affected?
   - What functionality is down?
   - Data integrity at risk?

2. **Immediate Actions**
   - Check Vercel dashboard for deployment issues
   - Review error logs
   - Check database status
   - Verify environment variables

3. **Communicate**
   - Notify team
   - Update status page (if applicable)
   - Prepare user communication

4. **Resolution**
   - Apply fix or rollback
   - Verify fix works
   - Monitor for recurrence

5. **Post-Mortem**
   - Document incident
   - Identify root cause
   - Implement preventive measures
   - Update runbook

---

## 📝 MAINTENANCE

### Regular Maintenance Tasks

**Daily:**
- Monitor error logs
- Check critical workflows

**Weekly:**
- Review audit logs
- Check database performance
- Review security alerts

**Monthly:**
- Update dependencies
- Review and optimize queries
- Backup verification
- Security audit

**Quarterly:**
- Rotate API keys
- Review and update documentation
- Performance optimization
- Capacity planning

---

## 🔗 USEFUL COMMANDS

```bash
# Health check
curl https://yourdomain.com/api/health

# Test email
curl -X POST https://yourdomain.com/api/debug/test-email

# Check database
npx prisma studio

# View logs
vercel logs [deployment-url]

# Deploy
git push origin main  # Auto-deploys on Vercel

# Rollback
vercel rollback [deployment-url]

# Database migrations
npx prisma migrate deploy
npx prisma generate

# Create admin user
npm run create:admin email@domain.com password "Name"
```

---

## 📞 SUPPORT

**Emergency Contacts:**
- Vercel Support: support@vercel.com
- Database Provider: (check your provider)
- Email Provider: (check your provider)

**Documentation:**
- README.md - Setup and overview
- Architecture docs - System design
- API docs - Endpoint documentation

---

**Last Updated:** Current  
**Maintained By:** Development Team


**Purpose:** Complete guide for deploying, operating, and troubleshooting MED DROP in production.

---

## 🚀 DEPLOYMENT

### Prerequisites

1. **Vercel Account** (recommended) or alternative hosting
2. **PostgreSQL Database** (Supabase, Neon, or AWS RDS)
3. **Email Provider** (Resend, SendGrid, or SMTP)
4. **Domain Name** (optional but recommended)
5. **Sentry Account** (optional - for error tracking)

### Initial Deployment

#### 1. Database Setup

```bash
# Create PostgreSQL database (Supabase example)
# 1. Go to https://supabase.com
# 2. Create new project
# 3. Get connection string from Settings > Database

# Update DATABASE_URL in environment variables:
DATABASE_URL="postgresql://user:password@host:port/database"
```

#### 2. Environment Variables Setup

Set the following in Vercel (or your hosting platform):

**Required:**
```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET=YOUR_NEXTAUTH_SECRET
NEXTAUTH_URL="https://yourdomain.com"
NODE_ENV="production"
```

**Email (choose one):**
```env
# Option 1: Resend (recommended)
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="noreply@yourdomain.com"
RESEND_FROM_NAME="MED DROP"

# Option 2: SendGrid
# SENDGRID_API_KEY="SG..."
# SENDGRID_FROM_EMAIL="noreply@yourdomain.com"

# Option 3: SMTP
# SMTP_HOST="smtp.example.com"
# SMTP_PORT="587"
# SMTP_USER="your-username"
# SMTP_PASS="your-password"
```

**Optional but Recommended:**
```env
SENTRY_DSN="https://..."
GOOGLE_MAPS_API_KEY="..."
BLOB_READ_WRITE_TOKEN="..."
```

#### 3. Deploy to Vercel

```bash
# 1. Push code to GitHub
git push origin main

# 2. Import project in Vercel
# - Go to vercel.com/dashboard
# - Click "Import Project"
# - Select your GitHub repo
# - Configure environment variables
# - Deploy

# 3. Run database migrations
vercel env pull .env.production
npx prisma migrate deploy
npx prisma generate
```

#### 4. Post-Deployment

```bash
# 1. Create admin user
npm run create:admin admin@yourdomain.com SecurePassword123 "Admin Name"

# 2. Verify deployment
curl https://yourdomain.com/api/health

# 3. Test email sending
curl -X POST https://yourdomain.com/api/debug/test-email
```

---

## 🔄 ROLLBACK PROCEDURES

### Vercel Rollback

1. **Via Dashboard:**
   - Go to Vercel Dashboard > Your Project > Deployments
   - Find previous working deployment
   - Click "..." menu > "Promote to Production"

2. **Via CLI:**
   ```bash
   vercel rollback <deployment-url>
   ```

3. **Database Rollback (if migration failed):**
   ```bash
   # List migrations
   npx prisma migrate status
   
   # Rollback last migration (manual)
   # ⚠️ WARNING: Only if necessary, as Prisma doesn't have built-in rollback
   # You may need to manually revert the migration SQL
   ```

### Quick Rollback Checklist

- [ ] Identify last working deployment
- [ ] Promote previous deployment in Vercel
- [ ] Verify database schema compatibility
- [ ] Test critical workflows
- [ ] Notify team of rollback

---

## 🐛 TROUBLESHOOTING

### Common Issues

#### 1. Database Connection Failed

**Symptoms:**
- 500 errors on all API routes
- Database connection timeout errors in logs

**Diagnosis:**
```bash
# Check database URL format
echo $DATABASE_URL

# Test connection
npx prisma db execute --stdin <<< "SELECT 1"
```

**Fix:**
- Verify DATABASE_URL is correct
- Check database firewall rules
- Verify database is running
- Check SSL requirements

#### 2. Email Not Sending

**Symptoms:**
- Emails appear in logs but never arrive
- No email provider errors

**Diagnosis:**
```bash
# Test email endpoint
curl -X POST https://yourdomain.com/api/debug/test-email
```

**Fix:**
- Verify email provider API key
- Check email provider dashboard for errors
- Verify FROM email is verified in provider
- Check spam folders

#### 3. Authentication Issues

**Symptoms:**
- Users can't login
- Sessions expire immediately
- httpOnly cookies not working

**Diagnosis:**
```bash
# Check cookie settings
curl -v https://yourdomain.com/api/auth/shipper/login
```

**Fix:**
- Verify NEXTAUTH_SECRET is set
- Check NEXTAUTH_URL matches domain
- Verify cookie settings in auth-session.ts
- Check HTTPS is enabled (required for secure cookies)

#### 4. Build Failures

**Symptoms:**
- Deployment fails at build step
- TypeScript errors
- Missing dependencies

**Fix:**
```bash
# Test build locally
npm run build

# Check for errors
npm run lint

# Verify all dependencies
npm install
```

#### 5. Performance Issues

**Symptoms:**
- Slow page loads
- API timeouts
- High database load

**Diagnosis:**
- Check Vercel analytics
- Review database query logs
- Check Sentry for errors
- Review server logs

**Fix:**
- Optimize slow database queries
- Add database indexes
- Enable caching where appropriate
- Scale database if needed

---

## 📊 MONITORING

### Health Checks

**Application Health:**
```bash
GET /api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected",
  "version": "1.0.0"
}
```

### Key Metrics to Monitor

1. **Response Times**
   - API endpoint latency
   - Database query times
   - Page load times

2. **Error Rates**
   - 5xx errors
   - 4xx errors
   - Sentry error count

3. **Database**
   - Connection pool usage
   - Query performance
   - Storage usage

4. **Email**
   - Delivery success rate
   - Bounce rate
   - Provider API errors

### Logs

**Vercel Logs:**
- Dashboard > Project > Logs
- Real-time logs available
- Filter by deployment

**Sentry:**
- Error tracking
- Performance monitoring
- User impact analysis

**Application Logs:**
- Structured logging via `lib/logger.ts`
- Logs include: timestamp, level, message, context

---

## 🔒 SECURITY

### Security Checklist

- [ ] NEXTAUTH_SECRET is strong and unique
- [ ] All environment variables are set
- [ ] Database has SSL enabled
- [ ] HTTPS is enforced
- [ ] CORS is configured correctly
- [ ] Rate limiting is enabled
- [ ] Input validation is active
- [ ] Audit logging is enabled

### Security Updates

**Regular Tasks:**
1. Update dependencies monthly
2. Review security advisories
3. Rotate API keys quarterly
4. Review audit logs weekly
5. Update NEXTAUTH_SECRET if compromised

---

## 🗄️ DATABASE MANAGEMENT

### Backup Strategy

**Recommended:**
- **Daily automated backups** (via Supabase/Neon)
- **Manual backup before migrations:**
  ```bash
  # Supabase
  supabase db dump -f backup-$(date +%Y%m%d).sql

  # Generic PostgreSQL
  pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
  ```

### Restore Procedure

```bash
# Restore from backup
psql $DATABASE_URL < backup-20240101.sql

# Or via Supabase CLI
supabase db reset --file backup-20240101.sql
```

### Migration Management

```bash
# Check migration status
npx prisma migrate status

# Create new migration
npx prisma migrate dev --name description

# Deploy migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

---

## 🚨 INCIDENT RESPONSE

### Critical Incident Checklist

1. **Assess Impact**
   - How many users affected?
   - What functionality is down?
   - Data integrity at risk?

2. **Immediate Actions**
   - Check Vercel dashboard for deployment issues
   - Review error logs
   - Check database status
   - Verify environment variables

3. **Communicate**
   - Notify team
   - Update status page (if applicable)
   - Prepare user communication

4. **Resolution**
   - Apply fix or rollback
   - Verify fix works
   - Monitor for recurrence

5. **Post-Mortem**
   - Document incident
   - Identify root cause
   - Implement preventive measures
   - Update runbook

---

## 📝 MAINTENANCE

### Regular Maintenance Tasks

**Daily:**
- Monitor error logs
- Check critical workflows

**Weekly:**
- Review audit logs
- Check database performance
- Review security alerts

**Monthly:**
- Update dependencies
- Review and optimize queries
- Backup verification
- Security audit

**Quarterly:**
- Rotate API keys
- Review and update documentation
- Performance optimization
- Capacity planning

---

## 🔗 USEFUL COMMANDS

```bash
# Health check
curl https://yourdomain.com/api/health

# Test email
curl -X POST https://yourdomain.com/api/debug/test-email

# Check database
npx prisma studio

# View logs
vercel logs [deployment-url]

# Deploy
git push origin main  # Auto-deploys on Vercel

# Rollback
vercel rollback [deployment-url]

# Database migrations
npx prisma migrate deploy
npx prisma generate

# Create admin user
npm run create:admin email@domain.com password "Name"
```

---

## 📞 SUPPORT

**Emergency Contacts:**
- Vercel Support: support@vercel.com
- Database Provider: (check your provider)
- Email Provider: (check your provider)

**Documentation:**
- README.md - Setup and overview
- Architecture docs - System design
- API docs - Endpoint documentation

---

**Last Updated:** Current  
**Maintained By:** Development Team


