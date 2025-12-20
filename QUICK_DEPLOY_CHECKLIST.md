# 🚀 Quick Deployment Checklist - meddropdispatch.com

**Follow this checklist to deploy your MED DROP system**

---

## ✅ **Pre-Deployment Checklist**

- [ ] Code is pushed to GitHub
- [ ] Build passes locally (`npm run build`)
- [ ] SendGrid API key is ready
- [ ] Domain `meddropdispatch.com` is purchased from Namecheap

---

## 📋 **Deployment Steps**

### 1. Database Setup
- [ ] Created Supabase account
- [ ] Created new project
- [ ] Copied database connection string
- [ ] Saved password securely

### 2. Vercel Deployment
- [ ] Signed up/logged into Vercel
- [ ] Imported GitHub repository
- [ ] Project auto-detected as Next.js
- [ ] First deployment started

### 3. Environment Variables (Add in Vercel)
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `NEXTAUTH_SECRET` - Generated secret
- [ ] `NEXTAUTH_URL` - `https://meddropdispatch.com`
- [ ] `SENDGRID_API_KEY` - `SG.your-api-key-here`
- [ ] `SENDGRID_FROM_EMAIL` - `noreply@meddropdispatch.com`
- [ ] `SENDGRID_FROM_NAME` - `MED DROP`
- [ ] `NODE_ENV` - `production`
- [ ] Selected "Production", "Preview", and "Development" for each
- [ ] Redeployed after adding variables

### 4. Custom Domain Setup
- [ ] Added `meddropdispatch.com` in Vercel → Settings → Domains
- [ ] Copied DNS records from Vercel
- [ ] Logged into Namecheap
- [ ] Went to Domain List → Manage → Advanced DNS
- [ ] Added A or CNAME record for @ (root domain)
- [ ] Added CNAME record for www
- [ ] Saved all changes in Namecheap
- [ ] Waited 5-30 minutes for DNS propagation
- [ ] Verified domain in Vercel (status: Valid ✅)
- [ ] SSL certificate auto-provisioned

### 5. Database Migrations
- [ ] Ran `npx prisma migrate deploy` (via Vercel CLI or manually)
- [ ] Verified database tables created

### 6. Admin User Creation
- [ ] Created first admin user
- [ ] Tested admin login

### 7. Final Verification
- [ ] Site loads at https://meddropdispatch.com
- [ ] SSL certificate active (green lock 🔒)
- [ ] www.meddropdispatch.com works
- [ ] Can log in as admin
- [ ] Emails send successfully
- [ ] All pages load correctly

---

## 🔑 **Environment Variables Summary**

Copy these into Vercel:

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres?sslmode=require
NEXTAUTH_SECRET=[generate with: npm run generate:secret]
NEXTAUTH_URL=https://meddropdispatch.com
SENDGRID_API_KEY=SG.your-api-key-here
SENDGRID_FROM_EMAIL=noreply@meddropdispatch.com
SENDGRID_FROM_NAME=MED DROP
NODE_ENV=production
```

---

## 📚 **Detailed Guides**

- **Full Deployment Guide:** See `DEPLOYMENT_WITH_CUSTOM_DOMAIN.md`
- **DNS Setup:** See `NAMECHEAP_DNS_SETUP.md`
- **Email Setup:** See `EMAIL_SETUP_GUIDE.md`

---

## 🆘 **Need Help?**

- **Vercel Issues:** Check Vercel dashboard for error messages
- **DNS Issues:** Use https://dnschecker.org to verify propagation
- **Email Issues:** Check SendGrid dashboard for errors

---

**Once all checkboxes are checked, your site is live! 🎉**

