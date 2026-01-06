# 🔐 Your DATABASE_URL Configuration

## ✅ Connection String Format

Your Supabase connection string template:

```
postgresql://postgres:[YOUR_PASSWORD]@db.ellnlpigwaalvbyorxwt.supabase.co:5432/postgres
```

---

## 🔑 **Get Your Database Password**

### Option 1: You Set It During Project Creation
- If you remember the password you set when creating the Supabase project, use that

### Option 2: Reset Your Password (Recommended)
1. Go to: https://supabase.com/dashboard/project/ellnlpigwaalvbyorxwt/settings/database
2. Scroll to **"Database password"** section
3. Click **"Reset database password"**
4. **Copy and save the new password** (you'll only see it once!)
5. Use this password in the connection string

---

## ✅ **Complete DATABASE_URL for Vercel**

Once you have your password, your complete DATABASE_URL should be:

```
postgresql://postgres:YOUR_ACTUAL_PASSWORD@db.ellnlpigwaalvbyorxwt.supabase.co:5432/postgres?sslmode=require
```

**Important:** 
- Replace `YOUR_ACTUAL_PASSWORD` with your real password
- Add `?sslmode=require` at the end (for secure connection)

---

## 📋 **Example (DO NOT USE - This is just format):**

```
postgresql://postgres:mySecurePassword123@db.ellnlpigwaalvbyorxwt.supabase.co:5432/postgres?sslmode=require
```

---

## 🚀 **Next Steps:**

1. ✅ Get your database password (reset if needed)
2. ✅ Replace `[YOUR_PASSWORD]` in the connection string
3. ✅ Add `?sslmode=require` at the end
4. ✅ Copy the complete string
5. ✅ Add it to Vercel as `DATABASE_URL` environment variable

---

## ⚠️ **Security Note:**

- Never commit your DATABASE_URL with password to GitHub
- Only add it to Vercel environment variables (which are encrypted)
- Keep your password secure

---

**Once you have your password, paste the complete connection string here and I'll verify it's correct!**


