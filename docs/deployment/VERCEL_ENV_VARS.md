# 🔐 Vercel Environment Variables - Copy & Paste

**Copy these into Vercel Dashboard → Settings → Environment Variables**

---

## Required Environment Variables

### 1. DATABASE_URL
```
postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres?sslmode=require
```
**Replace:**
- `[YOUR-PASSWORD]` with your Supabase database password
- `xxxxx` with your actual Supabase project reference

**Get this from:** Supabase → Settings → Database → Connection String (URI format)

---

### 2. NEXTAUTH_SECRET
```
9i4xxrvyqRJbF9hloPeO0vL+gHrNU4dyUfH8VB31bhg=
```
**Or generate new one:** Run `npm run generate:secret`

---

### 3. NEXTAUTH_URL
```
https://your-project-name.vercel.app
```
**Replace:** `your-project-name` with your actual Vercel project name  
**Or use:** Your custom domain if you have one

---

### 4. RESEND_API_KEY
```
re_8Zs7wC7n_AWQKG6mA65EgvhozQpbVzpu4
```
**Already configured** ✅

---

### 5. RESEND_FROM_EMAIL
```
MedDrop.Dispatch@outlook.com
```
**Already configured** ✅

---

### 6. RESEND_FROM_NAME
```
MED DROP
```
**Already configured** ✅

---

### 7. NODE_ENV
```
production
```
**Set this for production** ✅

---

## How to Add in Vercel:

1. Go to your project in Vercel Dashboard
2. Click **Settings** tab
3. Click **Environment Variables** in sidebar
4. For each variable:
   - Click **Add New**
   - Paste **Name** (left side)
   - Paste **Value** (right side)
   - Select **Production**, **Preview**, and **Development**
   - Click **Save**
5. After adding all, **Redeploy** your project

---

## Quick Checklist:

- [ ] DATABASE_URL (from Supabase)
- [ ] NEXTAUTH_SECRET (use generated one above)
- [ ] NEXTAUTH_URL (your Vercel URL)
- [ ] RESEND_API_KEY ✅
- [ ] RESEND_FROM_EMAIL ✅
- [ ] RESEND_FROM_NAME ✅
- [ ] NODE_ENV = production ✅

---

**After adding all variables, redeploy your project!**


