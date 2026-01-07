# Two-Factor Authentication (2FA/MFA) Implementation Plan

## Overview

This document outlines the plan for implementing two-factor authentication (2FA) for MED DROP, with priority on admin users and optional implementation for shippers and drivers.

## Priority Levels

1. **HIGH:** Admin users (full system access)
2. **MEDIUM:** Shipper users (access to sensitive shipment data)
3. **OPTIONAL:** Driver users (mobile-first, convenience vs. security trade-off)

## Implementation Options

### Option 1: TOTP (Time-based One-Time Password) - Recommended

**Pros:**
- Industry standard (Google Authenticator, Authy, Microsoft Authenticator)
- Works offline
- No SMS costs
- High security

**Cons:**
- Requires app installation
- Setup complexity for users

**Libraries:**
- `otplib` (Node.js)
- `qrcode` (QR code generation)

### Option 2: SMS-based 2FA

**Pros:**
- Familiar to users
- No app required
- Easy setup

**Cons:**
- SMS costs (Twilio)
- Vulnerable to SIM swapping
- Delivery delays

**Libraries:**
- `twilio` (already in dependencies)

### Option 3: Email-based 2FA

**Pros:**
- No additional costs
- Easy implementation
- Familiar to users

**Cons:**
- Lower security (email can be compromised)
- Delivery delays

## Recommended Approach

**Admins:** TOTP (required)  
**Shippers:** TOTP (optional, recommended)  
**Drivers:** SMS (optional, for convenience)

## Database Schema Changes

```prisma
// Add to User model (for admin users)
model User {
  // ... existing fields
  twoFactorEnabled Boolean @default(false)
  twoFactorSecret  String? // TOTP secret (encrypted)
  twoFactorBackupCodes String? // JSON array of backup codes (encrypted)
}

// Add to Shipper model
model Shipper {
  // ... existing fields
  twoFactorEnabled Boolean @default(false)
  twoFactorSecret  String? // TOTP secret (encrypted)
  twoFactorBackupCodes String? // JSON array of backup codes (encrypted)
  smsTwoFactorEnabled Boolean @default(false)
  smsPhoneNumber String? // For SMS 2FA
}

// Add to Driver model
model Driver {
  // ... existing fields
  smsTwoFactorEnabled Boolean @default(false)
  // Phone number already exists
}
```

## Implementation Steps

### Phase 1: TOTP for Admins (Required)

**1. Install Dependencies:**
```bash
npm install otplib qrcode
npm install --save-dev @types/qrcode
```

**2. Create 2FA Service:**
```typescript
// lib/two-factor.ts
import { authenticator } from 'otplib'
import QRCode from 'qrcode'
import { encrypt, decrypt } from './encryption'

export async function generateTOTPSecret(userId: string, email: string) {
  const secret = authenticator.generateSecret()
  const serviceName = 'MED DROP'
  const otpAuthUrl = authenticator.keyuri(email, serviceName, secret)
  
  // Generate QR code
  const qrCodeUrl = await QRCode.toDataURL(otpAuthUrl)
  
  return {
    secret: encrypt(secret), // Encrypt before storing
    qrCodeUrl,
  }
}

export function verifyTOTP(token: string, secret: string): boolean {
  try {
    const decryptedSecret = decrypt(secret)
    return authenticator.verify({ token, secret: decryptedSecret })
  } catch {
    return false
  }
}

export function generateBackupCodes(): string[] {
  const codes: string[] = []
  for (let i = 0; i < 10; i++) {
    codes.push(Math.random().toString(36).substring(2, 10).toUpperCase())
  }
  return codes
}
```

**3. Create API Routes:**
```typescript
// app/api/auth/admin/enable-2fa/route.ts
// app/api/auth/admin/verify-2fa/route.ts
// app/api/auth/admin/disable-2fa/route.ts
```

**4. Update Login Flow:**
```typescript
// app/api/auth/admin/login/route.ts
// After password verification:
if (user.twoFactorEnabled) {
  // Return 2FA required response
  return NextResponse.json({
    requiresTwoFactor: true,
    userId: user.id,
  })
}
```

**5. Create UI Components:**
- 2FA setup page (QR code display)
- 2FA verification modal
- Backup codes display/download

### Phase 2: SMS 2FA for Shippers/Drivers (Optional)

**1. Create SMS 2FA Service:**
```typescript
// lib/sms-two-factor.ts
import { sendSMS } from './sms' // Using Twilio

export async function send2FACode(phoneNumber: string): Promise<string> {
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  
  // Store code in Redis with 5-minute expiration
  await redis.setex(`2fa:${phoneNumber}`, 300, code)
  
  await sendSMS(phoneNumber, `Your MED DROP verification code is: ${code}`)
  
  return code
}

export async function verify2FACode(phoneNumber: string, code: string): Promise<boolean> {
  const storedCode = await redis.get(`2fa:${phoneNumber}`)
  return storedCode === code
}
```

**2. Update Login Flow:**
```typescript
// Similar to TOTP flow, but send SMS instead
```

## UI/UX Flow

### Setup Flow (TOTP)

1. User navigates to Security Settings
2. Clicks "Enable Two-Factor Authentication"
3. System generates secret and QR code
4. User scans QR code with authenticator app
5. User enters verification code to confirm
6. System displays backup codes (one-time download)
7. 2FA enabled

### Login Flow (2FA Required)

1. User enters email/password
2. System verifies credentials
3. If 2FA enabled:
   - Show 2FA input field
   - User enters TOTP code or backup code
   - System verifies code
4. Login successful

## Security Considerations

1. **Encrypt Secrets:** Store TOTP secrets encrypted at rest
2. **Backup Codes:** Generate and store securely (encrypted)
3. **Rate Limiting:** Limit 2FA verification attempts (5 per 15 minutes)
4. **Session Management:** Require 2FA for sensitive operations even after login
5. **Recovery:** Provide account recovery process (email verification)

## Testing

```typescript
// tests/two-factor.test.ts
import { generateTOTPSecret, verifyTOTP } from '@/lib/two-factor'

describe('2FA', () => {
  it('should generate and verify TOTP', async () => {
    const { secret } = await generateTOTPSecret('user1', 'test@example.com')
    const token = authenticator.generate(decrypt(secret))
    
    expect(verifyTOTP(token, secret)).toBe(true)
  })
  
  it('should reject invalid token', () => {
    expect(verifyTOTP('000000', secret)).toBe(false)
  })
})
```

## Migration Plan

1. **Week 1:** Implement TOTP for admins
2. **Week 2:** Testing and refinement
3. **Week 3:** Optional TOTP for shippers
4. **Week 4:** Optional SMS 2FA for drivers

## Cost Considerations

**TOTP:**
- No ongoing costs
- One-time development effort

**SMS (Twilio):**
- ~$0.0075 per SMS
- Estimate: $50-200/month for 10K users

## References

- [OTPLib Documentation](https://github.com/yeojz/otplib)
- [Twilio SMS API](https://www.twilio.com/docs/sms)
- [OWASP 2FA Guide](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)

