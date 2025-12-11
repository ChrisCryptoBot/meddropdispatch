# ⚡ QUICK START - Deploy in 15 Minutes

**Everything is ready! Follow these 4 simple steps:**

---

## ✅ **STEP 1: Set Up Database** (5 min)

Go to https://supabase.com → Create account → New Project → Copy connection string

---

## ✅ **STEP 2: Push to GitHub** (2 min)

```bash
git add .
git commit -m "Ready for Vercel deployment"
git push
```

---

## ✅ **STEP 3: Deploy to Vercel** (5 min)

1. Go to https://vercel.com
2. Import your GitHub repo
3. Add environment variables (see `VERCEL_ENV_VARS.md`)
4. Deploy!

---

## ✅ **STEP 4: Run Migrations** (3 min)

```bash
npm i -g vercel
vercel login
vercel link
vercel env pull .env.local
npx prisma migrate deploy
```

---

**🎉 DONE! Your site is live!**

**Full detailed guide:** See `DEPLOY_NOW.md`


