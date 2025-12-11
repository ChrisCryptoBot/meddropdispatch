# Quick Reference Guide - Optimized Codebase

## 📁 New File Structure

```
├── hooks/                    # NEW: Custom React hooks
│   ├── useAuth.ts           # Generic auth hook
│   ├── useDriverAuth.ts     # Driver auth hook
│   ├── useShipperAuth.ts    # Shipper auth hook
│   └── useAdminAuth.ts      # Admin auth hook
│
├── lib/
│   ├── storage.ts           # NEW: Type-safe localStorage utilities
│   ├── constants.ts         # NEW: All application constants
│   ├── types.ts             # UPDATED: Types only (constants moved)
│   ├── auth.ts              # Password hashing/verification
│   ├── email.ts             # Email utilities
│   ├── invoice.ts           # Invoice utilities
│   ├── pdf-invoice.ts      # PDF generation
│   ├── prisma.ts           # Prisma client
│   ├── tracking.ts          # Tracking code generation
│   └── utils.ts            # General utilities
│
├── components/              # REORGANIZED
│   ├── ui/                 # Reusable UI components
│   ├── forms/              # Form components
│   ├── layout/             # Layout components
│   └── features/           # Feature-specific components
│       └── SignatureCapture.tsx
│
└── app/                     # Next.js app directory (unchanged)
```

---

## 🔧 Common Patterns

### Authentication

```tsx
// Driver authentication
import { useDriverAuth } from '@/hooks/useDriverAuth'

const { driver, isLoading, isAuthenticated } = useDriverAuth()
// Automatically checks auth and redirects if needed
```

```tsx
// Shipper authentication
import { useShipperAuth } from '@/hooks/useShipperAuth'

const { shipper, isLoading, isAuthenticated } = useShipperAuth()
```

```tsx
// Admin authentication
import { useAdminAuth } from '@/hooks/useAdminAuth'

const { admin, isLoading, isAuthenticated } = useAdminAuth()
```

### Storage Operations

```tsx
import { getDriver, setDriver, removeDriver } from '@/lib/storage'

// Get driver
const driver = getDriver()

// Set driver
setDriver(driverData)

// Remove driver
removeDriver()
```

### Constants

```tsx
import { 
  LOAD_STATUS_LABELS, 
  LOAD_STATUS_COLORS,
  TRACKING_EVENT_LABELS 
} from '@/lib/constants'

import type { LoadStatus } from '@/lib/types' // Types still here
```

---

## 📚 Documentation Files

- `CODEBASE_AUDIT_REPORT.md` - Complete audit findings
- `OPTIMIZATION_SUMMARY.md` - What was optimized
- `QUICK_REFERENCE.md` - This file

---

## ✅ All Optimizations Are Backward Compatible

Existing code continues to work. New abstractions are available for:
- New code (use immediately)
- Gradual migration (update as needed)
- Refactoring (when convenient)

