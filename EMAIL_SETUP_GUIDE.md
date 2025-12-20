# Email Setup Guide - No Domain Verification Required!

Your system already supports multiple email providers. You can use **SendGrid** (recommended) or **SMTP** (Gmail/Outlook) without any domain verification!

## Option 1: SendGrid (RECOMMENDED - Easiest Setup)

**No domain verification needed!** SendGrid allows you to send emails immediately.

### Setup Steps:

1. **Sign up for SendGrid** (Free tier: 100 emails/day forever)
   - Go to: https://signup.sendgrid.com/
   - Create a free account

2. **Get your API Key**
   - Log in to SendGrid: https://app.sendgrid.com/
   - Go to: Settings → API Keys
   - Click "Create API Key"
   - Name it: "MED DROP Production"
   - Select "Full Access" or "Restricted Access" (with Mail Send permission)
   - Copy the API key (you'll only see it once!)

3. **Add to your `.env` file:**
   ```env
   SENDGRID_API_KEY=SG.your-api-key-here
   SENDGRID_FROM_EMAIL=noreply@meddrop.com
   SENDGRID_FROM_NAME=MED DROP
   ```

4. **That's it!** Emails will now send via SendGrid.

**Note:** You can use any email address in `SENDGRID_FROM_EMAIL` - no verification needed initially. For better deliverability later, you can verify your domain in SendGrid dashboard.

---

## Option 2: SMTP (Gmail or Outlook)

Use your existing Gmail or Outlook account - no API keys needed!

### Gmail Setup:

1. **Enable 2-Factor Authentication** on your Gmail account
   - Go to: https://myaccount.google.com/security

2. **Generate App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the 16-character password

3. **Add to your `.env` file:**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-char-app-password
   SMTP_FROM_EMAIL=your-email@gmail.com
   SMTP_FROM_NAME=MED DROP
   ```

### Outlook Setup:

1. **Add to your `.env` file:**
   ```env
   SMTP_HOST=smtp-mail.outlook.com
   SMTP_PORT=587
   SMTP_USER=your-email@outlook.com
   SMTP_PASS=your-outlook-password
   SMTP_FROM_EMAIL=your-email@outlook.com
   SMTP_FROM_NAME=MED DROP
   ```

---

## Priority Order

The system will automatically use email providers in this order:
1. **SendGrid** (if `SENDGRID_API_KEY` is set) - **RECOMMENDED**
2. **SMTP** (if `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` are set)
3. **Mailtrap** (for testing only)
4. **Console Log** (if nothing is configured)

**To use SendGrid or SMTP, just set the environment variables and the system will automatically use them!**

**Note:** Resend has been removed from the system. Use SendGrid or SMTP instead.

---

## Testing

After setting up, test by:
1. Creating a load request
2. Checking the console logs - you should see:
   - `📧 [SendGrid] Email sent successfully` OR
   - `📧 [SMTP] Email sent successfully`

---

## Production Deployment

When deploying to production (Vercel, etc.), add the same environment variables in your hosting platform's dashboard.

For Vercel:
1. Go to your project → Settings → Environment Variables
2. Add `SENDGRID_API_KEY` (or SMTP variables)
3. Redeploy

---

## Troubleshooting

**Emails not sending?**
- Check console logs for error messages
- Verify environment variables are set correctly
- For Gmail: Make sure you're using an App Password, not your regular password
- For SendGrid: Check your API key has "Mail Send" permission

**Need help?** Check the console logs - they'll tell you exactly what's happening!

