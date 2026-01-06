# 🚀 Vercel Deployment Readiness Checklist

**Status:** ✅ **ALMOST READY** - Just need database configuration change

---

## ✅ **READY FOR VERCEL** (Already Complete)

### Code Structure
- ✅ Next.js 14 app structure (`app/` directory)
- ✅ TypeScript configuration
- ✅ `next.config.js` exists and configured correctly
- ✅ Build script: `"build": "prisma generate && next build"` ✅
- ✅ All dependencies in `package.json`
- ✅ `.gitignore` properly excludes `.env`, `.vercel`, `node_modules`

### Environment Variables
- ✅ All URLs use environment variables (`NEXTAUTH_URL`, `VERCEL_URL`)
- ✅ `getBaseUrl()` function checks `VERCEL_URL` (Vercel provides this automatically)
- ✅ No hardcoded localhost URLs in production code
- ✅ Email service (Resend) configured

### Build Configuration
- ✅ Prisma client generation in build script
- ✅ Server Actions body size limit configured (2mb)
- ✅ No absolute file paths that would break on serverless

---

## ⚠️ **REQUIRED BEFORE DEPLOYMENT** (2 Quick Fixes)

### 1. **Change Database Provider to PostgreSQL** ⚠️ **REQUIRED**

**Current:** SQLite (dev only - won't work on Vercel)  
**Needed:** PostgreSQL (production database)

**Action:** Update `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"  // Change from "sqlite"
  url      = env("DATABASE_URL")
}
```

**Why:** Vercel uses serverless functions which require PostgreSQL. SQLite files can't be persisted.

---

### 2. **Set Up PostgreSQL Database** ⚠️ **REQUIRED**

**Options (pick one):**

#### **Option A: Supabase (Recommended - Free)**
1. Create account at https://supabase.com
2. Create new project
3. Go to Settings → Database
4. Copy connection string (URI format)
5. Use in Vercel environment variables

**Free Tier:**
- 500MB database storage
- 2GB bandwidth
- Automatic daily backups
- Perfect for starting out

#### **Option B: Vercel Postgres**
1. In Vercel dashboard, go to Storage
2. Create Postgres database
3. Connection string auto-populated in environment variables

**Free Tier:**
- 256MB storage
- Good for small projects

#### **Option C: Neon (Free Tier)**
1. Create account at https://neon.tech
2. Create project
3. Copy connection string

**Free Tier:**
- 3GB storage
- Generous free tier

---

## 📋 **VERCEL DEPLOYMENT STEPS**

### Step 1: Update Database Schema
```bash
# Change provider in prisma/schema.prisma from "sqlite" to "postgresql"
# Then commit:
git add prisma/schema.prisma
git commit -m "Switch to PostgreSQL for production"
git push
```

### Step 2: Set Up Database
- [ ] Create Supabase/Vercel Postgres/Neon account
- [ ] Create new database project
- [ ] Copy PostgreSQL connection string
- [ ] Format: `postgresql://user:password@host:5432/dbname?sslmode=require`

### Step 3: Deploy to Vercel

**Option A: Via Vercel Dashboard (Recommended)**
1. Push code to GitHub
2. Go to https://vercel.com
3. Click "Add New Project"
4. Import your GitHub repository
5. Configure:

**Build Settings:**
- Framework Preset: Next.js
- Build Command: `prisma generate && next build` (should auto-detect)
- Output Directory: `.next`
- Install Command: `npm install`

**Environment Variables:**
```
DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require
NEXTAUTH_SECRET=YOUR_NEXTAUTH_SECRET
NEXTAUTH_URL=https://your-project.vercel.app (or custom domain)
RESEND_API_KEY=re_8Zs7wC7n_AWQKG6mA65EgvhozQpbVzpu4
RESEND_FROM_EMAIL=MedDrop.Dispatch@outlook.com
RESEND_FROM_NAME=MED DROP
NODE_ENV=production
```

6. Click "Deploy"

**Option B: Via Vercel CLI**
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Set environment variables
vercel env add DATABASE_URL
vercel env add NEXTAUTH_SECRET
vercel env add NEXTAUTH_URL
vercel env add RESEND_API_KEY
vercel env add RESEND_FROM_EMAIL
vercel env add RESEND_FROM_NAME

# Deploy to production
vercel --prod
```

### Step 4: Run Database Migrations

**After first deployment, run migrations:**

```bash
# Option A: Via Vercel CLI
npx vercel env pull .env.local  # Get production env vars
npx prisma migrate deploy

# Option B: Via Supabase Dashboard (if using Supabase)
# Go to SQL Editor, run migrations manually
```

**OR** Add to Vercel build command:
```json
// package.json
"build": "prisma generate && prisma migrate deploy && next build"
```

⚠️ **Note:** Use `prisma migrate deploy` (not `prisma migrate dev`) for production

### Step 5: Create Production Admin User

**After deployment:**

1. Access your deployed site
2. Or create a script to run locally with production DATABASE_URL:
```bash
DATABASE_URL="your-production-url" npm run create:admin admin@meddrop.com password "Admin Name"
```

---

## ✅ **POST-DEPLOYMENT VERIFICATION**

- [ ] Visit deployed URL (e.g., `https://your-project.vercel.app`)
- [ ] Test homepage loads
- [ ] Test login functionality
- [ ] Test load request creation
- [ ] Test email notifications (check spam folder)
- [ ] Test tracking page
- [ ] Verify database connections work
- [ ] Check Vercel function logs for errors

---

## 🔧 **VERCEL-SPECIFIC CONFIGURATIONS**

### Build Command
Vercel will auto-detect: `prisma generate && next build`

If it doesn't, set manually in Vercel dashboard:
- Build Command: `prisma generate && next build`
- Install Command: `npm install`
- Output Directory: `.next`

### Function Timeout
- Default: 10 seconds (API routes)
- Maximum: 60 seconds on Pro plan
- Your API routes should complete within 10 seconds ✅

### Environment Variables
Vercel automatically provides:
- `VERCEL_URL` - Preview deployment URL
- `VERCEL` - Set to "1" in Vercel environment

Your code already uses these ✅

### Prisma on Vercel
**Important:** 
- Prisma generates client during build ✅
- Use `prisma migrate deploy` for production migrations
- Don't use `prisma migrate dev` in production

---

## 🐛 **COMMON ISSUES & FIXES**

### Issue: "Prisma Client not generated"
**Fix:** Build command should include `prisma generate`
```json
"build": "prisma generate && next build"
```

### Issue: "Database connection error"
**Fix:** 
- Ensure `DATABASE_URL` is set in Vercel environment variables
- Use PostgreSQL connection string (not SQLite)
- Add `?sslmode=require` to connection string

### Issue: "Migration failed"
**Fix:**
- Run migrations manually: `npx prisma migrate deploy`
- Or add to build command (but this can slow down builds)

### Issue: "Environment variable not found"
**Fix:**
- Check variable is set in Vercel dashboard
- Variable names are case-sensitive
- Redeploy after adding variables

---

## 📊 **VERCEL FREE TIER LIMITS**

✅ **What You Get:**
- Unlimited deployments
- 100GB bandwidth/month
- Automatic SSL certificates
- Custom domains support
- Serverless functions (10s timeout)
- Edge network (CDN)

⚠️ **Limitations:**
- Builds: 45 minutes/month
- Serverless functions: 100GB-hours/month
- Bandwidth: 100GB/month

**For MED DROP:** Free tier is perfect for starting out! 🎉

---

## 🎯 **SUMMARY**

### ✅ Ready Now:
- Code structure
- Build configuration
- Environment variable handling
- Email service configured

### ⚠️ Need to Do:
1. Change `prisma/schema.prisma` to PostgreSQL
2. Set up PostgreSQL database (Supabase recommended)
3. Deploy to Vercel
4. Run migrations
5. Test!

**Time Estimate:** 30-60 minutes total

**You're 95% ready!** Just need database switch and deployment. 🚀


