# 🔐 Complete Vercel Environment Variables

**Copy these into Vercel Dashboard → Settings → Environment Variables**

---

## ✅ **YOUR COMPLETE ENVIRONMENT VARIABLES**

### 1. DATABASE_URL ⚠️ **ACTION REQUIRED - ADD YOUR PASSWORD**

**Your connection string template:**
```
postgresql://postgres:[YOUR-PASSWORD]@db.ellnlpigwaalvbyorxwt.supabase.co:5432/postgres?sslmode=require
```

**To complete this:**
1. Go to: https://supabase.com/dashboard/project/ellnlpigwaalvbyorxwt/settings/database
2. Scroll to "Database password" section
3. If you don't know your password, click "Reset database password"
4. **Copy and save the password** (you'll only see it once!)
5. Replace `[YOUR-PASSWORD]` in the connection string above with your actual password
6. Make sure to include `?sslmode=require` at the end

**Complete format:**
```
postgresql://postgres:YOUR_ACTUAL_PASSWORD@db.ellnlpigwaalvbyorxwt.supabase.co:5432/postgres?sslmode=require
```

---

### 2. NEXTAUTH_SECRET ✅ **READY**
```
9i4xxrvyqRJbF9hloPeO0vL+gHrNU4dyUfH8VB31bhg=
```

**Or generate new:** Run `npm run generate:secret`

---

### 3. NEXTAUTH_URL ⚠️ **UPDATE AFTER DEPLOY**
```
https://your-project-name.vercel.app
```

**Replace with:**
- Your Vercel project URL after first deploy, OR
- Your custom domain if you have one

**Example:**
```
https://med-drop.vercel.app
```

---

### 4. RESEND_API_KEY ✅ **READY**
```
re_8Zs7wC7n_AWQKG6mA65EgvhozQpbVzpu4
```

---

### 5. RESEND_FROM_EMAIL ✅ **READY**
```
MedDrop.Dispatch@outlook.com
```

---

### 6. RESEND_FROM_NAME ✅ **READY**
```
MED DROP
```

---

### 7. NODE_ENV ✅ **READY**
```
production
```

---

## 📋 **COPY-PASTE CHECKLIST:**

1. ✅ Get DATABASE_URL from Supabase (see instructions above)
2. ✅ NEXTAUTH_SECRET = `9i4xxrvyqRJbF9hloPeO0vL+gHrNU4dyUfH8VB31bhg=`
3. ⚠️ NEXTAUTH_URL = `https://your-project-name.vercel.app` (update after deploy)
4. ✅ RESEND_API_KEY = `re_8Zs7wC7n_AWQKG6mA65EgvhozQpbVzpu4`
5. ✅ RESEND_FROM_EMAIL = `MedDrop.Dispatch@outlook.com`
6. ✅ RESEND_FROM_NAME = `MED DROP`
7. ✅ NODE_ENV = `production`

---

## 🚀 **HOW TO ADD IN VERCEL:**

1. Deploy your project first (it will fail - that's normal)
2. Go to **Project Settings** → **Environment Variables**
3. Add each variable:
   - **Key:** DATABASE_URL
   - **Value:** [Your connection string from Supabase]
   - Check boxes: ✅ Production, ✅ Preview, ✅ Development
   - Click **Save**
4. Repeat for all 7 variables
5. Go to **Deployments** tab
6. Click **⋯** on latest deployment → **Redeploy**

---

## ✅ **YOUR SUPABASE PROJECT:**

- **URL:** https://ellnlpigwaalvbyorxwt.supabase.co
- **Dashboard:** https://supabase.com/dashboard/project/ellnlpigwaalvbyorxwt
- **Connection String:** Get from Database Settings → Connection string (URI)

---

## 🎯 **NEXT STEP:**

1. Get your DATABASE_URL from Supabase
2. Deploy to Vercel
3. Add all environment variables
4. Redeploy
5. Run migrations
6. Create admin user

**You're almost there!** 🚀

