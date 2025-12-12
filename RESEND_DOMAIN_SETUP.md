# Resend Domain Verification Required

## Problem
Emails are not being delivered because Resend's test domain (`onboarding@resend.dev`) has restrictions.

## Error Message
```
403 validation_error: "You can only send testing emails to your own email address (meddrop.dispatch@outlook.com). 
To send emails to other recipients, please verify a domain at resend.com/domains, 
and change the `from` address to an email using this domain."
```

## Solution: Verify Your Domain

### Step 1: Go to Resend Dashboard
1. Visit: https://resend.com/domains
2. Log in with your Resend account

### Step 2: Add Your Domain
1. Click "Add Domain"
2. Enter your domain (e.g., `meddrop.com` or `yourdomain.com`)
3. Follow the DNS verification steps:
   - Add the provided DNS records to your domain's DNS settings
   - Wait for DNS propagation (usually 5-15 minutes)
   - Resend will verify automatically

### Step 3: Update Environment Variables
Once your domain is verified, update your `.env` file:

```env
RESEND_FROM_EMAIL="noreply@yourdomain.com"
# or
RESEND_FROM_EMAIL="hello@yourdomain.com"
```

### Step 4: Restart Server
```bash
# Stop the server (Ctrl+C)
npm run dev
```

## Temporary Workaround
Until your domain is verified, you can only send test emails to:
- `meddrop.dispatch@outlook.com` (the verified email on your Resend account)

## Testing After Domain Verification
Once your domain is verified, you can send emails to any recipient.

Test with:
```bash
node send-test-emails.js
```

## Current Status
- ✅ API Key: Configured
- ✅ Email Service: Working
- ❌ Domain: Not verified (using test domain with restrictions)
- ⚠️  Can only send to: `meddrop.dispatch@outlook.com`

