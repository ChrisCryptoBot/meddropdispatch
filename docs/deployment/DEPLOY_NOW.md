# 🚀 DEPLOY TO VERCEL - Step-by-Step Guide

**Status:** ✅ Codebase 100% ready - Follow these steps to deploy!

---

## ⏱️ **TIME ESTIMATE: 15-30 Minutes**

---

## 📋 **STEP 1: Set Up PostgreSQL Database** (10 minutes)

### Option A: Supabase (Recommended - Free & Easy)

1. **Create Account:**
   - Go to https://supabase.com
   - Click "Start your project"
   - Sign up with GitHub (easiest)

2. **Create New Project:**
   - Click "New Project"
   - Project name: `med-drop` (or any name)
   - Database password: **Save this password!** (you'll need it)
   - Region: Choose closest to you
   - Click "Create new project"
   - Wait 2-3 minutes for setup

3. **Get Connection String:**
   - Go to Settings (gear icon) → Database
   - Scroll to "Connection string"
   - Select "URI" tab
   - Copy the connection string (looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres`)
   - **SAVE THIS** - you'll need it in Step 3

### Option B: Vercel Postgres (If using Vercel)

1. In Vercel dashboard, go to Storage
2. Click "Create Database" → "Postgres"
3. Create database
4. Connection string auto-populated in environment variables

---

## 📋 **STEP 2: Push Code to GitHub** (2 minutes)

Make sure your code is pushed to GitHub:

```bash
git add .
git commit -m "Ready for Vercel deployment - PostgreSQL configured"
git push origin main
```

**If you haven't set up Git:**
- Create GitHub repository
- Push your code
- Vercel needs GitHub to deploy

---

## 📋 **STEP 3: Deploy to Vercel** (10 minutes)

### 3.1 Import Project

1. **Go to Vercel:**
   - Visit https://vercel.com
   - Sign up/login (use GitHub - easiest)

2. **Import Project:**
   - Click "Add New Project"
   - Select "Import Git Repository"
   - Choose your GitHub repository
   - Click "Import"

### 3.2 Configure Project

**Vercel will auto-detect Next.js - leave these as default:**
- Framework Preset: **Next.js** ✅
- Root Directory: **./** ✅
- Build Command: `prisma generate && next build` ✅
- Output Directory: `.next` ✅
- Install Command: `npm install` ✅

**Click "Deploy"** (we'll add env vars after first deploy fails - that's normal!)

### 3.3 Add Environment Variables

**After deployment starts (or if it fails), go to:**
- Project Settings → Environment Variables

**Add these variables:**

#### Required Variables:

```
DATABASE_URL
postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres?sslmode=require
(Use the connection string from Step 1)
```

```
NEXTAUTH_SECRET
[Generate with: openssl rand -base64 32]
(Or use: https://generate-secret.vercel.app/32)
```

```
NEXTAUTH_URL
https://your-project-name.vercel.app
(Or your custom domain if you have one)
```

```
RESEND_API_KEY
re_8Zs7wC7n_AWQKG6mA65EgvhozQpbVzpu4
(Already configured)
```

```
RESEND_FROM_EMAIL
MedDrop.Dispatch@outlook.com
```

```
RESEND_FROM_NAME
MED DROP
```

```
NODE_ENV
production
```

**For each variable:**
- Click "Add"
- Paste name and value
- Select "Production", "Preview", and "Development"
- Click "Save"

### 3.4 Redeploy

After adding all environment variables:
- Go to Deployments tab
- Click the 3 dots (⋯) on latest deployment
- Click "Redeploy"
- Wait for build to complete

---

## 📋 **STEP 4: Run Database Migrations** (5 minutes)

### Option A: Via Vercel CLI (Recommended)

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login:**
   ```bash
   vercel login
   ```

3. **Link to project:**
   ```bash
   vercel link
   ```
   - Select your project
   - Select appropriate settings

4. **Pull environment variables:**
   ```bash
   vercel env pull .env.local
   ```

5. **Run migrations:**
   ```bash
   npx prisma migrate deploy
   ```

### Option B: Via Supabase Dashboard

1. Go to Supabase dashboard
2. Click "SQL Editor"
3. Go to `prisma/migrations` folder in your local project
4. Open the SQL files in order
5. Copy and paste each migration SQL into Supabase SQL Editor
6. Run each migration

### Option C: Add to Build Command (Quick but not recommended)

Update `package.json` build script temporarily:
```json
"build": "prisma generate && prisma migrate deploy && next build"
```

⚠️ This slows down builds and can cause issues - better to run migrations manually.

---

## 📋 **STEP 5: Create Production Admin User** (2 minutes)

After migrations are complete:

```bash
# Using Vercel CLI (recommended)
vercel env pull .env.local
npx prisma generate

# Create admin user
npm run create:admin admin@meddrop.com your-secure-password "Admin User"
```

**Or manually via Supabase:**
1. Go to Supabase → Table Editor
2. Find `User` table
3. Insert new user with:
   - Email: `admin@meddrop.com`
   - Password: (hashed with bcrypt)
   - Role: `ADMIN`

---

## 📋 **STEP 6: Test Everything** (5 minutes)

Visit your deployed site: `https://your-project.vercel.app`

### Test Checklist:

- [ ] Homepage loads
- [ ] Go to `/admin/login`
- [ ] Login with admin credentials
- [ ] Test load request creation
- [ ] Check email notifications (check spam folder)
- [ ] Test tracking page
- [ ] Verify no console errors

---

## 🎉 **YOU'RE LIVE!**

Your website is now deployed and usable!

---

## 🔧 **TROUBLESHOOTING**

### Build Fails

**Error: "Prisma Client not generated"**
- ✅ Already fixed - build command includes `prisma generate`

**Error: "DATABASE_URL not found"**
- Go to Vercel → Settings → Environment Variables
- Make sure `DATABASE_URL` is set
- Redeploy

**Error: "Connection refused"**
- Check database connection string
- Make sure database is running (Supabase shows status)
- Add `?sslmode=require` to connection string

### Database Issues

**Migration fails:**
- Make sure you're using `prisma migrate deploy` (not `migrate dev`)
- Check database is accessible
- Verify connection string is correct

**Can't connect:**
- Supabase: Check firewall settings (should allow all by default)
- Verify password in connection string
- Check database is not paused

### Email Not Sending

- Check Resend API key is correct
- Verify `RESEND_FROM_EMAIL` matches your Resend domain
- Check Resend dashboard for logs
- Test emails might go to spam

---

## 📞 **NEXT STEPS**

### Set Up Custom Domain (Optional)

1. Buy domain (Namecheap, Google Domains, etc.)
2. In Vercel → Settings → Domains
3. Add your domain
4. Update DNS records as instructed
5. Update `NEXTAUTH_URL` to your custom domain

### Monitor Your Site

- Vercel Dashboard → Analytics (free tier)
- Set up error tracking (Sentry - free tier)
- Monitor database usage in Supabase

---

## ✅ **DEPLOYMENT COMPLETE!**

Your MED DROP website is now live and ready to use! 🚀

**Your production URL:** `https://your-project.vercel.app`

**Admin Login:** `/admin/login`

**Need help?** Check Vercel logs or Supabase logs for errors.


