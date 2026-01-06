# MED DROP - Architecture Documentation

**Purpose:** System architecture overview for developers, buyers, and maintainers.

---

## 🏗️ SYSTEM ARCHITECTURE

### High-Level Overview

```
┌─────────────────┐
│   Web Browser   │
│  (Shipper/Driver/Admin Portals)
└────────┬────────┘
         │ HTTPS
         │
┌────────▼─────────────────────────┐
│      Next.js Application         │
│  ┌──────────────────────────┐   │
│  │  App Router (Pages)      │   │
│  │  - Client Components     │   │
│  │  - Server Components     │   │
│  └──────────────────────────┘   │
│  ┌──────────────────────────┐   │
│  │  API Routes              │   │
│  │  - REST Endpoints        │   │
│  │  - Authentication        │   │
│  │  - Business Logic        │   │
│  └──────────────────────────┘   │
└────────┬─────────────────────────┘
         │
    ┌────┴────┬────────────┬──────────┐
    │         │            │          │
┌───▼───┐ ┌──▼────┐  ┌────▼────┐ ┌──▼─────┐
│PostgreSQL│ │Email  │ │  Blob   │ │Sentry  │
│Database  │ │Service│ │ Storage │ │Tracking│
└─────────┘ └───────┘ └─────────┘ └────────┘
```

---

## 📁 PROJECT STRUCTURE

```
med-drop/
├── app/                    # Next.js App Router
│   ├── (public)/          # Public routes (homepage, tracking)
│   ├── admin/             # Admin portal
│   ├── driver/            # Driver portal
│   ├── shipper/           # Shipper portal
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── load-requests/ # Load management
│   │   ├── shippers/      # Shipper management
│   │   ├── drivers/       # Driver management
│   │   └── invoices/      # Billing endpoints
│   └── layout.tsx         # Root layout
│
├── lib/                   # Shared libraries
│   ├── prisma.ts         # Database client
│   ├── auth.ts           # Authentication utilities
│   ├── auth-session.ts   # Session management
│   ├── email.ts          # Email templates
│   ├── email-service.ts  # Email provider abstraction
│   ├── validation.ts     # Zod schemas
│   ├── errors.ts         # Error handling
│   ├── logger.ts         # Structured logging
│   ├── sentry.ts         # Error tracking
│   ├── audit-log.ts      # Audit trail
│   ├── edge-case-validations.ts  # Business logic validation
│   └── config.ts         # Configuration management
│
├── components/            # React components
│   ├── features/         # Feature components
│   ├── layout/           # Layout components
│   └── ui/               # UI primitives
│
├── prisma/               # Database schema
│   ├── schema.prisma     # Prisma schema
│   ├── migrations/       # Database migrations
│   └── seed.ts           # Seed data
│
├── scripts/              # Utility scripts
│   ├── setup.sh          # Setup script (Unix)
│   ├── setup.ps1         # Setup script (Windows)
│   ├── create-admin.ts   # Admin creation
│   └── validate-config.js # Config validation
│
└── docs/                 # Documentation
    ├── ARCHITECTURE.md   # This file
    ├── DEPLOYMENT_RUNBOOK.md
    └── ...
```

---

## 🔄 DATA FLOW

### Load Request Lifecycle

```
1. Shipper Request
   └─> POST /api/load-requests
       └─> Create LoadRequest
           └─> Generate Tracking Code
               └─> Send Confirmation Email

2. Admin Quotes
   └─> POST /api/load-requests/[id]/set-quote
       └─> Update LoadRequest.quoteAmount
           └─> Set quoteExpiresAt (24h)
               └─> Send Quote Email to Shipper

3. Shipper Accepts Quote
   └─> POST /api/load-requests/[id]/accept-quote
       └─> Validate quoteExpiresAt
           └─> Update status to QUOTE_ACCEPTED
               └─> Create TrackingEvent

4. Driver Accepts Load
   └─> POST /api/load-requests/[id]/accept
       └─> Validate driver eligibility
           └─> Atomic update (prevent race condition)
               └─> Set driverId, status to SCHEDULED
                   └─> Create TrackingEvent

5. Pickup Execution
   └─> PATCH /api/load-requests/[id]/status
       └─> Validate status transition
           └─> Capture signature, temperature
               └─> Update status to PICKED_UP
                   └─> Create TrackingEvent

6. Delivery Completion
   └─> PATCH /api/load-requests/[id]/status
       └─> Validate status transition
           └─> Capture signature, temperature
               └─> Update status to DELIVERED
                   └─> Create TrackingEvent
                       └─> Auto-generate Invoice
```

---

## 🔐 AUTHENTICATION & AUTHORIZATION

### Authentication Flow

```
1. User Login
   └─> POST /api/auth/{role}/login
       └─> Verify credentials
           └─> Create session
               └─> Set httpOnly cookie
                   └─> Return user data

2. Protected Route Access
   └─> Layout checks authentication
       └─> getAuthSession(request)
           └─> Verify cookie
               └─> Check expiration
                   └─> Allow/deny access
```

### Authorization Levels

**Public:**
- Homepage
- Request load form
- Public tracking
- Signup pages

**Shipper (Authenticated):**
- View own loads
- Accept/reject quotes
- Manage facilities
- View invoices
- Upload documents (own loads)

**Driver (Authenticated):**
- View load board
- Accept loads
- Update load status
- Capture signatures
- Upload documents
- View earnings

**Admin (Authenticated):**
- Full system access
- All shipper/driver capabilities
- Assign drivers
- Set quotes
- Generate invoices
- Manage users
- Override locks

---

## 💾 DATABASE ARCHITECTURE

### Core Entities

```
Shipper
  ├─> Facility (pickup/dropoff locations)
  ├─> LoadRequest (courier jobs)
  ├─> Invoice (billing)
  └─> LoadTemplate (recurring loads)

LoadRequest
  ├─> TrackingEvent (UPS-style checkpoints)
  ├─> Document (proof of pickup/delivery)
  ├─> GPSTrackingPoint (real-time tracking)
  ├─> LoadNote (internal notes)
  ├─> DriverRating (feedback)
  └─> Driver (assigned courier)

Driver
  ├─> Vehicle (fleet)
  ├─> DriverDocument (compliance)
  └─> LoadRequest (assigned loads)

User (Admin/Staff)
  └─> (internal management)
```

### Key Relationships

- **Shipper → LoadRequest:** One-to-many
- **LoadRequest → Driver:** Many-to-one (optional)
- **LoadRequest → Facility:** Many-to-one (pickup and dropoff)
- **LoadRequest → TrackingEvent:** One-to-many
- **LoadRequest → Document:** One-to-many
- **Driver → Vehicle:** One-to-many

---

## 🛡️ SECURITY ARCHITECTURE

### Security Layers

1. **Authentication**
   - httpOnly cookies (production)
   - Session expiration
   - Password hashing (bcrypt)

2. **Authorization**
   - Role-based access control
   - Resource ownership checks
   - API endpoint guards

3. **Input Validation**
   - Zod schemas
   - XSS prevention (DOMPurify)
   - SQL injection prevention (Prisma ORM)

4. **Data Protection**
   - Audit logging
   - Soft deletes
   - PII masking in logs

5. **API Security**
   - Rate limiting
   - CORS configuration
   - Error sanitization

---

## 📧 EMAIL SERVICE ARCHITECTURE

### Abstraction Layer

```
Application Code
    │
    ├─> lib/email.ts (templates)
    │       │
    │       └─> lib/email-service.ts (provider abstraction)
    │               │
    │               ├─> Resend
    │               ├─> SendGrid
    │               ├─> SMTP
    │               └─> Mailtrap (dev)
```

**Benefits:**
- Easy provider switching
- Consistent API
- Development fallback (console logging)

---

## 🔍 OBSERVABILITY

### Logging

**Structured Logs:**
```typescript
logger.info('Load created', { loadId, shipperId })
logger.error('Payment failed', error, { invoiceId })
```

**Log Levels:**
- `debug`: Development details
- `info`: Normal operations
- `warn`: Warning conditions
- `error`: Error conditions

### Error Tracking

**Sentry Integration:**
- Automatic error capture
- Performance monitoring
- User context
- Sensitive data filtering

### Audit Trail

**Audit Log:**
- All critical actions logged
- User attribution
- Change tracking
- Compliance ready

---

## 🚀 DEPLOYMENT ARCHITECTURE

### Production Stack

- **Hosting:** Vercel
- **Database:** PostgreSQL (Supabase/Neon)
- **Storage:** Vercel Blob (optional)
- **Email:** Resend/SendGrid
- **Monitoring:** Sentry
- **CDN:** Vercel Edge Network

### Environment Separation

- **Development:** SQLite, console email
- **Staging:** PostgreSQL, test email provider
- **Production:** PostgreSQL, production email, Sentry

---

## 🔄 BUSINESS LOGIC LAYERS

### Validation Layer

**Input Validation:**
- Zod schemas
- Type checking
- Format validation

**Business Rules:**
- Status transition validation
- Quote expiration checks
- Driver eligibility
- Duplicate prevention

### Service Layer

**Core Services:**
- Load management
- Quote workflow
- Driver assignment
- Invoice generation
- Document handling

### Data Access Layer

**Prisma ORM:**
- Type-safe queries
- Relationship handling
- Transaction support
- Migration management

---

## 📊 PERFORMANCE CONSIDERATIONS

### Optimization Strategies

1. **Database:**
   - Indexed queries
   - Connection pooling
   - Query optimization

2. **API:**
   - Response caching
   - Rate limiting
   - Request batching

3. **Frontend:**
   - Code splitting
   - Image optimization
   - Lazy loading

4. **Infrastructure:**
   - CDN for static assets
   - Edge functions
   - Auto-scaling

---

## 🔧 EXTENSIBILITY

### Adding New Features

1. **New Entity:**
   - Add to Prisma schema
   - Create migration
   - Add API routes
   - Create UI components

2. **New Email Template:**
   - Add to `lib/email.ts`
   - Use email service abstraction

3. **New Validation:**
   - Add to `lib/edge-case-validations.ts`
   - Use in API routes

---

## 📚 KEY DESIGN DECISIONS

1. **Prisma ORM:** Type safety and migration management
2. **Next.js App Router:** Server components and API routes in one framework
3. **Zod Validation:** Runtime type checking and validation
4. **Email Abstraction:** Easy provider switching
5. **Audit Logging:** Compliance and debugging
6. **Soft Deletes:** Data preservation and recovery

---

**Last Updated:** Current  
**Version:** 1.0.0


**Purpose:** System architecture overview for developers, buyers, and maintainers.

---

## 🏗️ SYSTEM ARCHITECTURE

### High-Level Overview

```
┌─────────────────┐
│   Web Browser   │
│  (Shipper/Driver/Admin Portals)
└────────┬────────┘
         │ HTTPS
         │
┌────────▼─────────────────────────┐
│      Next.js Application         │
│  ┌──────────────────────────┐   │
│  │  App Router (Pages)      │   │
│  │  - Client Components     │   │
│  │  - Server Components     │   │
│  └──────────────────────────┘   │
│  ┌──────────────────────────┐   │
│  │  API Routes              │   │
│  │  - REST Endpoints        │   │
│  │  - Authentication        │   │
│  │  - Business Logic        │   │
│  └──────────────────────────┘   │
└────────┬─────────────────────────┘
         │
    ┌────┴────┬────────────┬──────────┐
    │         │            │          │
┌───▼───┐ ┌──▼────┐  ┌────▼────┐ ┌──▼─────┐
│PostgreSQL│ │Email  │ │  Blob   │ │Sentry  │
│Database  │ │Service│ │ Storage │ │Tracking│
└─────────┘ └───────┘ └─────────┘ └────────┘
```

---

## 📁 PROJECT STRUCTURE

```
med-drop/
├── app/                    # Next.js App Router
│   ├── (public)/          # Public routes (homepage, tracking)
│   ├── admin/             # Admin portal
│   ├── driver/            # Driver portal
│   ├── shipper/           # Shipper portal
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── load-requests/ # Load management
│   │   ├── shippers/      # Shipper management
│   │   ├── drivers/       # Driver management
│   │   └── invoices/      # Billing endpoints
│   └── layout.tsx         # Root layout
│
├── lib/                   # Shared libraries
│   ├── prisma.ts         # Database client
│   ├── auth.ts           # Authentication utilities
│   ├── auth-session.ts   # Session management
│   ├── email.ts          # Email templates
│   ├── email-service.ts  # Email provider abstraction
│   ├── validation.ts     # Zod schemas
│   ├── errors.ts         # Error handling
│   ├── logger.ts         # Structured logging
│   ├── sentry.ts         # Error tracking
│   ├── audit-log.ts      # Audit trail
│   ├── edge-case-validations.ts  # Business logic validation
│   └── config.ts         # Configuration management
│
├── components/            # React components
│   ├── features/         # Feature components
│   ├── layout/           # Layout components
│   └── ui/               # UI primitives
│
├── prisma/               # Database schema
│   ├── schema.prisma     # Prisma schema
│   ├── migrations/       # Database migrations
│   └── seed.ts           # Seed data
│
├── scripts/              # Utility scripts
│   ├── setup.sh          # Setup script (Unix)
│   ├── setup.ps1         # Setup script (Windows)
│   ├── create-admin.ts   # Admin creation
│   └── validate-config.js # Config validation
│
└── docs/                 # Documentation
    ├── ARCHITECTURE.md   # This file
    ├── DEPLOYMENT_RUNBOOK.md
    └── ...
```

---

## 🔄 DATA FLOW

### Load Request Lifecycle

```
1. Shipper Request
   └─> POST /api/load-requests
       └─> Create LoadRequest
           └─> Generate Tracking Code
               └─> Send Confirmation Email

2. Admin Quotes
   └─> POST /api/load-requests/[id]/set-quote
       └─> Update LoadRequest.quoteAmount
           └─> Set quoteExpiresAt (24h)
               └─> Send Quote Email to Shipper

3. Shipper Accepts Quote
   └─> POST /api/load-requests/[id]/accept-quote
       └─> Validate quoteExpiresAt
           └─> Update status to QUOTE_ACCEPTED
               └─> Create TrackingEvent

4. Driver Accepts Load
   └─> POST /api/load-requests/[id]/accept
       └─> Validate driver eligibility
           └─> Atomic update (prevent race condition)
               └─> Set driverId, status to SCHEDULED
                   └─> Create TrackingEvent

5. Pickup Execution
   └─> PATCH /api/load-requests/[id]/status
       └─> Validate status transition
           └─> Capture signature, temperature
               └─> Update status to PICKED_UP
                   └─> Create TrackingEvent

6. Delivery Completion
   └─> PATCH /api/load-requests/[id]/status
       └─> Validate status transition
           └─> Capture signature, temperature
               └─> Update status to DELIVERED
                   └─> Create TrackingEvent
                       └─> Auto-generate Invoice
```

---

## 🔐 AUTHENTICATION & AUTHORIZATION

### Authentication Flow

```
1. User Login
   └─> POST /api/auth/{role}/login
       └─> Verify credentials
           └─> Create session
               └─> Set httpOnly cookie
                   └─> Return user data

2. Protected Route Access
   └─> Layout checks authentication
       └─> getAuthSession(request)
           └─> Verify cookie
               └─> Check expiration
                   └─> Allow/deny access
```

### Authorization Levels

**Public:**
- Homepage
- Request load form
- Public tracking
- Signup pages

**Shipper (Authenticated):**
- View own loads
- Accept/reject quotes
- Manage facilities
- View invoices
- Upload documents (own loads)

**Driver (Authenticated):**
- View load board
- Accept loads
- Update load status
- Capture signatures
- Upload documents
- View earnings

**Admin (Authenticated):**
- Full system access
- All shipper/driver capabilities
- Assign drivers
- Set quotes
- Generate invoices
- Manage users
- Override locks

---

## 💾 DATABASE ARCHITECTURE

### Core Entities

```
Shipper
  ├─> Facility (pickup/dropoff locations)
  ├─> LoadRequest (courier jobs)
  ├─> Invoice (billing)
  └─> LoadTemplate (recurring loads)

LoadRequest
  ├─> TrackingEvent (UPS-style checkpoints)
  ├─> Document (proof of pickup/delivery)
  ├─> GPSTrackingPoint (real-time tracking)
  ├─> LoadNote (internal notes)
  ├─> DriverRating (feedback)
  └─> Driver (assigned courier)

Driver
  ├─> Vehicle (fleet)
  ├─> DriverDocument (compliance)
  └─> LoadRequest (assigned loads)

User (Admin/Staff)
  └─> (internal management)
```

### Key Relationships

- **Shipper → LoadRequest:** One-to-many
- **LoadRequest → Driver:** Many-to-one (optional)
- **LoadRequest → Facility:** Many-to-one (pickup and dropoff)
- **LoadRequest → TrackingEvent:** One-to-many
- **LoadRequest → Document:** One-to-many
- **Driver → Vehicle:** One-to-many

---

## 🛡️ SECURITY ARCHITECTURE

### Security Layers

1. **Authentication**
   - httpOnly cookies (production)
   - Session expiration
   - Password hashing (bcrypt)

2. **Authorization**
   - Role-based access control
   - Resource ownership checks
   - API endpoint guards

3. **Input Validation**
   - Zod schemas
   - XSS prevention (DOMPurify)
   - SQL injection prevention (Prisma ORM)

4. **Data Protection**
   - Audit logging
   - Soft deletes
   - PII masking in logs

5. **API Security**
   - Rate limiting
   - CORS configuration
   - Error sanitization

---

## 📧 EMAIL SERVICE ARCHITECTURE

### Abstraction Layer

```
Application Code
    │
    ├─> lib/email.ts (templates)
    │       │
    │       └─> lib/email-service.ts (provider abstraction)
    │               │
    │               ├─> Resend
    │               ├─> SendGrid
    │               ├─> SMTP
    │               └─> Mailtrap (dev)
```

**Benefits:**
- Easy provider switching
- Consistent API
- Development fallback (console logging)

---

## 🔍 OBSERVABILITY

### Logging

**Structured Logs:**
```typescript
logger.info('Load created', { loadId, shipperId })
logger.error('Payment failed', error, { invoiceId })
```

**Log Levels:**
- `debug`: Development details
- `info`: Normal operations
- `warn`: Warning conditions
- `error`: Error conditions

### Error Tracking

**Sentry Integration:**
- Automatic error capture
- Performance monitoring
- User context
- Sensitive data filtering

### Audit Trail

**Audit Log:**
- All critical actions logged
- User attribution
- Change tracking
- Compliance ready

---

## 🚀 DEPLOYMENT ARCHITECTURE

### Production Stack

- **Hosting:** Vercel
- **Database:** PostgreSQL (Supabase/Neon)
- **Storage:** Vercel Blob (optional)
- **Email:** Resend/SendGrid
- **Monitoring:** Sentry
- **CDN:** Vercel Edge Network

### Environment Separation

- **Development:** SQLite, console email
- **Staging:** PostgreSQL, test email provider
- **Production:** PostgreSQL, production email, Sentry

---

## 🔄 BUSINESS LOGIC LAYERS

### Validation Layer

**Input Validation:**
- Zod schemas
- Type checking
- Format validation

**Business Rules:**
- Status transition validation
- Quote expiration checks
- Driver eligibility
- Duplicate prevention

### Service Layer

**Core Services:**
- Load management
- Quote workflow
- Driver assignment
- Invoice generation
- Document handling

### Data Access Layer

**Prisma ORM:**
- Type-safe queries
- Relationship handling
- Transaction support
- Migration management

---

## 📊 PERFORMANCE CONSIDERATIONS

### Optimization Strategies

1. **Database:**
   - Indexed queries
   - Connection pooling
   - Query optimization

2. **API:**
   - Response caching
   - Rate limiting
   - Request batching

3. **Frontend:**
   - Code splitting
   - Image optimization
   - Lazy loading

4. **Infrastructure:**
   - CDN for static assets
   - Edge functions
   - Auto-scaling

---

## 🔧 EXTENSIBILITY

### Adding New Features

1. **New Entity:**
   - Add to Prisma schema
   - Create migration
   - Add API routes
   - Create UI components

2. **New Email Template:**
   - Add to `lib/email.ts`
   - Use email service abstraction

3. **New Validation:**
   - Add to `lib/edge-case-validations.ts`
   - Use in API routes

---

## 📚 KEY DESIGN DECISIONS

1. **Prisma ORM:** Type safety and migration management
2. **Next.js App Router:** Server components and API routes in one framework
3. **Zod Validation:** Runtime type checking and validation
4. **Email Abstraction:** Easy provider switching
5. **Audit Logging:** Compliance and debugging
6. **Soft Deletes:** Data preservation and recovery

---

**Last Updated:** Current  
**Version:** 1.0.0


