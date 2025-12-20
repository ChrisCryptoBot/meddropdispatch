# Namecheap DNS Configuration for meddropdispatch.com

**Quick reference for configuring your domain in Namecheap**

---

## 📋 **Step-by-Step DNS Setup**

### 1. Log in to Namecheap

- Go to https://www.namecheap.com
- Log in to your account

### 2. Navigate to Domain Management

1. Click **"Domain List"** in the left sidebar
2. Find **meddropdispatch.com**
3. Click **"Manage"** button

### 3. Go to Advanced DNS

1. Click **"Advanced DNS"** tab
2. Scroll down to **"Host Records"** section

### 4. Add DNS Records

**After you add the domain in Vercel, Vercel will show you the exact records to add. Here's what you'll typically need:**

#### For Root Domain (meddropdispatch.com):

**Option A: A Record (if Vercel provides IP address)**
- **Type:** `A Record`
- **Host:** `@`
- **Value:** `[IP address from Vercel]` (usually looks like `76.76.21.21`)
- **TTL:** `Automatic` (or `300`)
- Click **"Add Record"** or **"Save"**

**Option B: CNAME Record (if Vercel provides CNAME)**
- **Type:** `CNAME Record`
- **Host:** `@`
- **Value:** `[CNAME from Vercel]` (usually `cname.vercel-dns.com`)
- **TTL:** `Automatic` (or `300`)
- Click **"Add Record"** or **"Save"**

#### For WWW Subdomain (www.meddropdispatch.com):

- **Type:** `CNAME Record`
- **Host:** `www`
- **Value:** `cname.vercel-dns.com` (or what Vercel provides)
- **TTL:** `Automatic` (or `300`)
- Click **"Add Record"** or **"Save"**

### 5. Remove/Update Existing Records

**If there are existing A or CNAME records for @ or www:**
- Either **delete** them or **update** them to point to Vercel
- Don't have duplicate records pointing to different places

### 6. Save Changes

- Click **"Save All Changes"** button at the bottom
- Wait 5-30 minutes for DNS to propagate

---

## 🔍 **How to Get DNS Records from Vercel**

1. **In Vercel Dashboard:**
   - Go to your project
   - Click **Settings** tab
   - Click **Domains** in sidebar
   - Add domain: `meddropdispatch.com`
   - Vercel will show you the exact DNS records to add

2. **Vercel will display:**
   - Type of record (A or CNAME)
   - Host value (@ or www)
   - Target value (IP or CNAME)
   - Copy these exactly into Namecheap

---

## ⏱️ **DNS Propagation Time**

- **Usually:** 5-30 minutes
- **Can take:** Up to 48 hours (rare)
- **Check status:** Vercel → Settings → Domains

---

## ✅ **Verification**

After adding DNS records:

1. **Wait 5-30 minutes**
2. **Check in Vercel:**
   - Go to Settings → Domains
   - Status should change from "Pending" to "Valid" ✅
3. **Test in browser:**
   - Visit https://meddropdispatch.com
   - Should load your site (may take a few more minutes for SSL)

---

## 🔧 **Troubleshooting**

### Domain Not Working After 30 Minutes?

1. **Check DNS Propagation:**
   - Use https://dnschecker.org
   - Enter `meddropdispatch.com`
   - Check if records are propagated globally

2. **Verify Records in Namecheap:**
   - Go back to Advanced DNS
   - Make sure records match exactly what Vercel provided
   - Check for typos

3. **Clear DNS Cache:**
   - On your computer: `ipconfig /flushdns` (Windows) or `sudo dscacheutil -flushcache` (Mac)
   - Or wait longer - DNS can be slow

4. **Contact Support:**
   - Namecheap support if DNS issues
   - Vercel support if domain verification issues

---

## 📝 **Example DNS Records (What Vercel Might Show)**

```
Type: A Record
Host: @
Value: 76.76.21.21
TTL: Automatic

Type: CNAME Record
Host: www
Value: cname.vercel-dns.com
TTL: Automatic
```

**Copy these exactly into Namecheap!**

---

## 🎯 **Quick Checklist**

- [ ] Logged into Namecheap
- [ ] Went to Domain List → Manage → Advanced DNS
- [ ] Added A or CNAME record for @ (root domain)
- [ ] Added CNAME record for www
- [ ] Removed/updated conflicting records
- [ ] Saved all changes
- [ ] Waited 5-30 minutes
- [ ] Verified in Vercel dashboard
- [ ] Tested in browser

---

**Once DNS propagates, your site will be live at https://meddropdispatch.com! 🚀**

