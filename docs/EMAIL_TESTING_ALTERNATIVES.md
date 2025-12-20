# Email Testing Alternatives - Bypass Domain Requirement

## Problem
Resend requires domain verification for production, and the test domain `onboarding@resend.dev` can only send to verified email addresses.

## Solutions

### Option 1: Verify Your Email in Resend (Easiest)

**Steps:**
1. Sign up for Resend: https://resend.com
2. Go to **Dashboard → Emails → Domains**
3. You'll see the test domain `resend.dev`
4. **Add your email address** to verified recipients
5. Use test domain in `.env`:
   ```env
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   RESEND_FROM_EMAIL=onboarding@resend.dev
   ```
6. **Send test emails to your verified email only**

**Limitation**: Can only send to YOUR verified email address

---

### Option 2: Use Mailtrap (Best for Testing)

**Mailtrap** is designed specifically for testing - it catches all emails without sending them.

1. **Sign up**: https://mailtrap.io (free tier available)
2. **Get SMTP credentials** from Mailtrap inbox
3. **Install Nodemailer**:
   ```bash
   npm install nodemailer
   npm install --save-dev @types/nodemailer
   ```
4. **Create alternative email service** (see below)

**Benefits**:
- ✅ No domain verification needed
- ✅ Catches all emails in a test inbox
- ✅ See HTML/text preview
- ✅ Test any email address
- ✅ Free tier available

---

### Option 3: Use Gmail SMTP (Quick Testing)

**For quick local testing**, you can use Gmail's SMTP:

1. **Enable App Password** in Gmail:
   - Google Account → Security → 2-Step Verification → App Passwords
   - Generate app password for "Mail"

2. **Update email service** to use SMTP (see below)

**Limitation**: 
- Gmail has daily sending limits
- Requires 2FA enabled
- Not ideal for production

---

### Option 4: Use Ethereal Email (Zero Config)

**Ethereal** creates fake SMTP servers for testing:

1. **Install**: `npm install nodemailer`
2. **Use Ethereal** - automatically creates test account
3. **All emails go to Ethereal inbox** (no real sending)

---

## Recommended: Mailtrap Integration

Here's how to add Mailtrap support:

### Step 1: Install Nodemailer
```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

### Step 2: Create Mailtrap Email Service

Create `lib/email-service-mailtrap.ts`:

```typescript
import nodemailer from 'nodemailer'

// Mailtrap SMTP configuration
const transporter = nodemailer.createTransport({
  host: process.env.MAILTRAP_HOST || 'sandbox.smtp.mailtrap.io',
  port: parseInt(process.env.MAILTRAP_PORT || '2525'),
  auth: {
    user: process.env.MAILTRAP_USER || '',
    pass: process.env.MAILTRAP_PASS || '',
  },
})

export async function sendEmailMailtrap(options: {
  to: string
  subject: string
  text: string
  html: string
}) {
  const result = await transporter.sendMail({
    from: process.env.MAILTRAP_FROM || 'MED DROP <noreply@meddrop.com>',
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  })
  
  console.log('📧 [Mailtrap] Email sent:', result.messageId)
  return result
}
```

### Step 3: Update email-service.ts

Add Mailtrap as fallback when Resend not configured:

```typescript
// In lib/email-service.ts, add after Resend check:

if (!client) {
  // Try Mailtrap if configured
  if (process.env.MAILTRAP_USER && process.env.MAILTRAP_PASS) {
    const { sendEmailMailtrap } = await import('./email-service-mailtrap')
    return sendEmailMailtrap(options)
  }
  
  // Otherwise log to console
  console.log('⚠️  [Email Service] No email service configured...')
}
```

### Step 4: Add to .env
```env
# Mailtrap (for testing)
MAILTRAP_USER=your_mailtrap_username
MAILTRAP_PASS=your_mailtrap_password
MAILTRAP_FROM=MED DROP <noreply@meddrop.com>
```

---

## Quick Fix: Verify Your Email in Resend

**Fastest solution** - Use Resend but verify your email:

1. Go to https://resend.com/emails
2. Click "Verify Email" 
3. Add your email address
4. Check inbox for verification link
5. Now you can receive test emails!

**Then in `.env`:**
```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=onboarding@resend.dev
```

**Test by approving a driver** - email will go to YOUR verified email address.

---

## Recommendation

**For immediate testing**: 
- Verify your email in Resend (5 minutes)
- Use test domain `onboarding@resend.dev`
- Send test emails to yourself

**For better testing experience**:
- Set up Mailtrap (10 minutes)
- Test with any email address
- See all emails in Mailtrap inbox
- No domain verification needed





