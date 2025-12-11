# 🔐 Your Supabase Configuration

## Project Details

- **Project URL:** https://ellnlpigwaalvbyorxwt.supabase.co
- **Project ID:** ellnlpigwaalvbyorxwt
- **Dashboard:** https://supabase.com/dashboard/project/ellnlpigwaalvbyorxwt

## ✅ What You Have

- **Supabase Anon Key** (for API access): 
  ```
  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsbG5scGlnd2FhbHZieW9yeHd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzOTQwODQsImV4cCI6MjA4MDk3MDA4NH0.2U_a6ea_J0kUwf0cfiHD0oYsY5X3kBxP_kTDyCtKfRo
  ```

## 🔑 What You Need for DATABASE_URL

**You need the PostgreSQL connection string (not the anon key).**

### How to Get Your DATABASE_URL:

1. **Go to Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard/project/ellnlpigwaalvbyorxwt/settings/database

2. **Find Connection String:**
   - Scroll down to "Connection string"
   - Click on the "URI" tab
   - Copy the connection string

3. **It should look like:**
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.ellnlpigwaalvbyorxwt.supabase.co:5432/postgres?sslmode=require
   ```

4. **If you forgot your database password:**
   - In the same Database settings page
   - Scroll to "Database password"
   - Click "Reset database password"
   - Save the new password!
   - Update the connection string with the new password

---

## 📋 For Vercel Environment Variables

Once you have your DATABASE_URL, use this format in Vercel:

```
postgresql://postgres:[YOUR-PASSWORD]@db.ellnlpigwaalvbyorxwt.supabase.co:5432/postgres?sslmode=require
```

Replace `[YOUR-PASSWORD]` with your actual database password.

---

## 🔍 Quick Steps:

1. Go to: https://supabase.com/dashboard/project/ellnlpigwaalvbyorxwt/settings/database
2. Scroll to "Connection string" section
3. Click "URI" tab
4. Copy the full connection string
5. Use it as `DATABASE_URL` in Vercel

---

## ⚠️ Important Notes:

- **The anon key you have is for API access** - not for database connection
- **You need the PostgreSQL connection string** - found in Database settings
- **The connection string includes your database password** - keep it secret!
- **Format:** `postgresql://postgres:PASSWORD@db.ellnlpigwaalvbyorxwt.supabase.co:5432/postgres?sslmode=require`


