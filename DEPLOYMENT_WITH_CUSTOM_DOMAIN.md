# 🚀 Deploy MED DROP to Vercel with Custom Domain (meddropdispatch.com)

**Complete step-by-step guide to deploy and use your Namecheap domain**

---

## ⏱️ **TIME ESTIMATE: 30-45 Minutes**

---

## 📋 **STEP 1: Set Up PostgreSQL Database** (10 minutes)

### Option A: Supabase (Recommended - Free & Easy)

1. **Create Account:**
   - Go to https://supabase.com
   - Click "Start your project"
   - Sign up with GitHub (easiest)

2. **Create New Project:**
   - Click "New Project"
   - Project name: `med-drop-production`
   - Database password: **Save this password!** (you'll need it)
   - Region: Choose closest to you
   - Click "Create new project"
   - Wait 2-3 minutes for setup

3. **Get Connection String:**
   - Go to Settings (gear icon) → Database
   - Scroll to "Connection string"
   - Select "URI" tab
   - Copy the connection string
   - **SAVE THIS** - you'll need it in Step 3

---

## 📋 **STEP 2: Push Code to GitHub** (5 minutes)

1. **Initialize Git (if not already done):**
   ```bash
   git init
   git add .
   git commit -m "Ready for production deployment"
   ```

2. **Create GitHub Repository:**
   - Go to https://github.com/new
   - Repository name: `med-drop` (or any name)
   - Make it **Private** (recommended)
   - Click "Create repository"

3. **Push Code:**
   ```bash
   git remote add origin https://github.com/YOUR-USERNAME/med-drop.git
   git branch -M main
   git push -u origin main
   ```

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

**Click "Deploy"** (we'll add env vars after first deploy)

---

## 📋 **STEP 4: Add Environment Variables** (5 minutes)

**Go to:** Project Settings → Environment Variables

**Add these variables (select Production, Preview, and Development for each):**

### Required Variables:

```env
# Database
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres?sslmode=require
(Use the connection string from Step 1)

# NextAuth
NEXTAUTH_SECRET=9i4xxrvyqRJbF9hloPeO0vL+gHrNU4dyUfH8VB31bhg=
(Or generate new: npm run generate:secret)

NEXTAUTH_URL=https://meddropdispatch.com
(Use your custom domain)

# SendGrid Email
SENDGRID_API_KEY=SG.your-api-key-here

SENDGRID_FROM_EMAIL=noreply@meddropdispatch.com
(Use your custom domain)

SENDGRID_FROM_NAME=MED DROP

# Environment
NODE_ENV=production
```

**After adding all variables, click "Redeploy"**

---

## 📋 **STEP 5: Configure Custom Domain in Vercel** (5 minutes)

1. **Go to Project Settings:**
   - Click on your project in Vercel dashboard
   - Go to **Settings** tab
   - Click **Domains** in sidebar

2. **Add Domain:**
   - Enter: `meddropdispatch.com`
   - Click "Add"
   - Vercel will show you DNS records to configure

3. **Vercel will show you:**
   - **A Record** or **CNAME Record** to add
   - Copy these - you'll need them for Namecheap

---

## 📋 **STEP 6: Configure DNS in Namecheap** (10 minutes)

### Option A: Using A Records (Recommended)

1. **Log in to Namecheap:**
   - Go to https://www.namecheap.com
   - Log in to your account

2. **Go to Domain List:**
   - Click "Domain List" in left sidebar
   - Find `meddropdispatch.com`
   - Click "Manage"

3. **Go to Advanced DNS:**
   - Click "Advanced DNS" tab
   - Scroll to "Host Records" section

4. **Add/Update Records:**

   **For Root Domain (meddropdispatch.com):**
   - **Type:** A Record
   - **Host:** @
   - **Value:** (Vercel will provide this - usually looks like `76.76.21.21` or similar)
   - **TTL:** Automatic (or 300)
   - Click "Add Record" or "Save"

   **For WWW (www.meddropdispatch.com):**
   - **Type:** CNAME Record
   - **Host:** www
   - **Value:** `cname.vercel-dns.com` (or what Vercel provides)
   - **TTL:** Automatic (or 300)
   - Click "Add Record" or "Save"

5. **Save Changes:**
   - Click "Save All Changes" at the bottom
   - DNS changes can take 5-30 minutes to propagate

### Option B: Using Nameservers (Alternative)

If Vercel provides nameservers, you can use those instead:

1. **In Namecheap:**
   - Go to Domain List → Manage → Advanced DNS
   - Scroll to "Nameservers"
   - Select "Custom DNS"
   - Enter Vercel's nameservers (if provided)
   - Save

---

## 📋 **STEP 7: Verify Domain in Vercel** (Wait 5-30 minutes)

1. **Wait for DNS Propagation:**
   - DNS changes can take 5-30 minutes
   - Check status in Vercel → Settings → Domains

2. **Verify Domain:**
   - Vercel will automatically verify when DNS propagates
   - Status will change from "Pending" to "Valid"
   - You'll see a green checkmark ✅

3. **SSL Certificate:**
   - Vercel automatically provisions SSL (HTTPS)
   - This happens automatically after domain verification
   - Takes 5-10 minutes

---

## 📋 **STEP 8: Update SendGrid Domain (Optional but Recommended)** (10 minutes)

For better email deliverability, verify your domain in SendGrid:

1. **Log in to SendGrid:**
   - Go to https://app.sendgrid.com
   - Log in

2. **Go to Domain Authentication:**
   - Settings → Sender Authentication → Domain Authentication
   - Click "Authenticate Your Domain"

3. **Enter Domain:**
   - Enter: `meddropdispatch.com`
   - Click "Next"

4. **Add DNS Records:**
   - SendGrid will show you DNS records to add
   - Go back to Namecheap → Advanced DNS
   - Add each record SendGrid provides:
     - **CNAME records** (usually 3-4 records)
     - **TXT record** (for verification)

5. **Verify Domain:**
   - Click "Verify" in SendGrid
   - Wait for verification (can take a few minutes)

6. **Update Environment Variable:**
   - In Vercel, update `SENDGRID_FROM_EMAIL` to:
     ```
     noreply@meddropdispatch.com
     ```
   - Redeploy

**Note:** You can send emails without domain verification, but verification improves deliverability.

---

## 📋 **STEP 9: Run Database Migrations** (5 minutes)

After deployment, run Prisma migrations:

1. **In Vercel Dashboard:**
   - Go to your project
   - Click "Deployments" tab
   - Click on the latest deployment
   - Click "..." menu → "Redeploy"

2. **Or use Vercel CLI:**
   ```bash
   npm install -g vercel
   vercel login
   vercel link
   npx prisma migrate deploy
   ```

3. **Or manually:**
   - Go to Vercel project → Settings → Functions
   - You can run migrations via Vercel's CLI or use a one-time script

---

## 📋 **STEP 10: Create Admin User** (2 minutes)

After deployment, create your first admin user:

1. **Use Vercel CLI:**
   ```bash
   vercel env pull .env.local
   npm run create:admin
   ```

2. **Or use Vercel's Function:**
   - Create a temporary API route to create admin
   - Or use Prisma Studio in production

---

## ✅ **Verification Checklist**

After deployment, verify:

- [ ] Site loads at https://meddropdispatch.com
- [ ] SSL certificate is active (green lock in browser)
- [ ] www.meddropdispatch.com redirects correctly
- [ ] Database connection works
- [ ] Emails send via SendGrid
- [ ] Admin user can log in
- [ ] All pages load correctly

---

## 🔧 **Troubleshooting**

### Domain Not Working?

1. **Check DNS Propagation:**
   - Use https://dnschecker.org
   - Enter `meddropdispatch.com`
   - Check if A record points to Vercel's IP

2. **Check Vercel Domain Status:**
   - Go to Settings → Domains
   - Check for error messages
   - Click "Refresh" if needed

3. **Wait Longer:**
   - DNS can take up to 48 hours (usually 5-30 minutes)
   - Be patient!

### SSL Certificate Issues?

- Vercel automatically provisions SSL
- Wait 5-10 minutes after domain verification
- If issues persist, contact Vercel support

### Database Connection Issues?

- Verify `DATABASE_URL` is correct in Vercel
- Check Supabase connection settings
- Ensure database is accessible from Vercel's IPs

### Email Not Sending?

- Check `SENDGRID_API_KEY` is set correctly
- Verify `SENDGRID_FROM_EMAIL` uses your domain
- Check SendGrid dashboard for errors
- Verify API key has "Mail Send" permission

---

## 📞 **Support Resources**

- **Vercel Docs:** https://vercel.com/docs
- **Namecheap DNS Help:** https://www.namecheap.com/support/knowledgebase/article.aspx/767/10/how-to-change-dns-for-a-domain/
- **SendGrid Docs:** https://docs.sendgrid.com

---

## 🎉 **You're Done!**

Your site should now be live at:
- **https://meddropdispatch.com**
- **https://www.meddropdispatch.com**

All emails will send from: `noreply@meddropdispatch.com`

**Congratulations! Your MED DROP system is now live! 🚀**

