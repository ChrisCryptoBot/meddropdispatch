# Mailtrap Setup Guide - Test Emails Without Domain Verification

## Why Mailtrap?

- ✅ **No domain verification needed**
- ✅ **Test with any email address**
- ✅ **See all emails in Mailtrap inbox**
- ✅ **Free tier available** (500 emails/month)
- ✅ **Perfect for development/testing**

## Quick Setup (5 minutes)

### Step 1: Sign Up for Mailtrap

1. Go to https://mailtrap.io
2. Sign up (free account available)
3. Verify your email

### Step 2: Get SMTP Credentials

1. Go to **Inboxes** → **My Inbox** (or create new inbox)
2. Click **SMTP Settings**
3. Select **Nodemailer** from dropdown
4. Copy your credentials:
   - **Host**: `sandbox.smtp.mailtrap.io`
   - **Port**: `2525`
   - **Username**: (your Mailtrap username)
   - **Password**: (your Mailtrap password)

### Step 3: Add to .env

```env
# Mailtrap (for testing emails)
MAILTRAP_USER=your_mailtrap_username
MAILTRAP_PASS=your_mailtrap_password
MAILTRAP_FROM=MED DROP <noreply@meddrop.com>
```

**Optional** (if using different Mailtrap host):
```env
MAILTRAP_HOST=sandbox.smtp.mailtrap.io
MAILTRAP_PORT=2525
```

### Step 4: Test It!

1. **Start your dev server**: `npm run dev`
2. **Approve a driver** in admin panel
3. **Check Mailtrap inbox**: https://mailtrap.io/inboxes
4. **See the email** - full HTML/text preview!

## How It Works

- **All emails go to Mailtrap inbox** (not real sending)
- **You can test with ANY email address** (test@example.com, driver@test.com, etc.)
- **See full email content** - HTML, text, attachments
- **No domain verification needed**

## Priority Order

The email service tries in this order:

1. **Resend** (if `RESEND_API_KEY` is set)
2. **Mailtrap** (if `MAILTRAP_USER` and `MAILTRAP_PASS` are set)
3. **Console logging** (if neither is configured)

## Testing Workflow

1. **Set up Mailtrap** (5 minutes)
2. **Add credentials to `.env`**
3. **Test approval workflow**:
   - Sign up as driver
   - Upload documents
   - Approve as admin
   - **Check Mailtrap inbox** → See approval email!
4. **Test rejection workflow**:
   - Reject a driver
   - **Check Mailtrap inbox** → See rejection email!

## Mailtrap Features

- ✅ **Email preview** - See HTML/text versions
- ✅ **Email inspection** - Headers, attachments, etc.
- ✅ **Spam score** - Check if emails would be marked spam
- ✅ **Email forwarding** - Forward to real email (optional)
- ✅ **Multiple inboxes** - Separate inboxes for different environments

## Production

**For production**, use Resend with verified domain:
```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

**For development/testing**, use Mailtrap:
```env
MAILTRAP_USER=your_username
MAILTRAP_PASS=your_password
```

## Troubleshooting

**Emails not appearing in Mailtrap?**
- Check `.env` file has correct credentials
- Restart dev server after adding env vars
- Check console for Mailtrap errors

**Want to use both?**
- Remove `RESEND_API_KEY` to use Mailtrap
- Or remove `MAILTRAP_USER` to use Resend
- System uses first available service









