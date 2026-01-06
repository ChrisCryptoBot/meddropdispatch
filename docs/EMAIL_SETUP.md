# Email Service Setup Guide

This application supports multiple email providers. Choose the easiest option for your deployment.

## 🎯 Recommended: SendGrid (Easiest Setup)

**Why SendGrid?**
- ✅ No domain verification required initially
- ✅ Free tier: 100 emails/day forever
- ✅ Easy API key setup
- ✅ Great deliverability
- ✅ Can send from any email address

### Setup Steps:

1. **Create SendGrid Account**
   - Go to: https://signup.sendgrid.com/
   - Sign up for free account

2. **Create API Key**
   - Go to: https://app.sendgrid.com/settings/api_keys
   - Click "Create API Key"
   - Name it (e.g., "MED DROP Production")
   - Select "Full Access" or "Restricted Access" → "Mail Send"
   - Copy the API key (you'll only see it once!)

3. **Add to Environment Variables**
   ```env
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   SENDGRID_FROM_EMAIL=noreply@meddrop.com
   SENDGRID_FROM_NAME=MED DROP
   ```

4. **Deploy!** That's it - no domain verification needed!

---

## Option 2: SMTP (Gmail/Outlook) - Free but Limited

**Why SMTP?**
- ✅ Free (uses your existing email)
- ✅ No API keys needed
- ⚠️ Gmail: Limited to 500 emails/day
- ⚠️ Requires App Password for Gmail

### Gmail Setup:

1. **Enable 2-Factor Authentication**
   - Go to: https://myaccount.google.com/security
   - Enable 2FA

2. **Generate App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Name it "MED DROP"
   - Copy the 16-character password

3. **Add to Environment Variables**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-char-app-password
   SMTP_FROM_EMAIL=your-email@gmail.com
   SMTP_FROM_NAME=MED DROP
   ```

### Outlook Setup:

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
SMTP_FROM_EMAIL=your-email@outlook.com
SMTP_FROM_NAME=MED DROP
```

---

## Option 3: Mailtrap (Testing Only)

**Why Mailtrap?**
- ✅ Perfect for development/testing
- ✅ Catches all emails in inbox (no real sending)
- ⚠️ NOT for production

### Setup:

1. Sign up: https://mailtrap.io/
2. Get credentials from inbox settings
3. Add to `.env`:
   ```env
   MAILTRAP_USER=your-username
   MAILTRAP_PASS=your-password
   ```

---

## Option 4: Resend (Requires Domain Verification)

**Why Resend?**
- ✅ Great API
- ✅ Good deliverability
- ⚠️ Requires domain verification (DNS records)
- ⚠️ Can be complex to set up

Only use if you've already verified your domain.

---

## Priority Order

The email service will try providers in this order:

1. **SendGrid** (if `SENDGRID_API_KEY` is set) ← **RECOMMENDED**
2. **SMTP** (if `SMTP_HOST` is set)
3. **Mailtrap** (if `MAILTRAP_USER` is set) - Testing only
4. **Resend** (if `RESEND_API_KEY` is set) - Requires domain verification

**Only configure ONE provider** - the first one found will be used.

---

## Quick Start (SendGrid)

```bash
# 1. Install SendGrid package
npm install @sendgrid/mail

# 2. Add to .env
SENDGRID_API_KEY=SG.your-api-key-here
SENDGRID_FROM_EMAIL=noreply@meddrop.com
SENDGRID_FROM_NAME=MED DROP

# 3. Deploy!
```

That's it! No domain verification needed. 🎉

---

## Troubleshooting

### SendGrid Issues:
- **"Invalid API Key"**: Make sure you copied the full key starting with `SG.`
- **"Unauthorized"**: Check that API key has "Mail Send" permissions

### SMTP Issues:
- **Gmail "Login failed"**: Use App Password, not regular password
- **"Connection timeout"**: Check firewall allows port 587
- **"Too many emails"**: Gmail limit is 500/day

### Testing:
- Check console logs for email service status
- Emails will log to console if no provider is configured
- Use Mailtrap for local testing

---

## Production Recommendations

1. **Start with SendGrid** - easiest setup, no domain verification
2. **Verify domain later** (optional) - improves deliverability
3. **Monitor email logs** - check SendGrid dashboard for delivery status
4. **Set up bounce handling** - SendGrid webhooks for failed emails










