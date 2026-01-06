# MED DROP - Medical Courier Portal

A modern web application for medical courier and logistics services, built with Next.js 14, TypeScript, Prisma, and Tailwind CSS.

## Features

### Public-Facing
- **Request a Load**: Comprehensive form for shippers to submit courier requests
- **Track Shipment**: UPS-style tracking with event timeline and real-time status updates
- **Responsive Design**: Modern, professional UI with glassmorphism effects

### Admin Portal
- **Load Management**: View, quote, and manage all load requests
- **Status Updates**: Update load status and create tracking events
- **Quote Management**: Set pricing and send quotes to shippers
- **Shipper Management**: View all client companies and facilities
- **Email Notifications**: Automatic email updates on status changes (configurable)

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Prisma + SQLite (development) / PostgreSQL (production)
- **Styling**: Tailwind CSS
- **Authentication**: Simple email/password (ready for NextAuth integration)
- **Email**: Abstract email service (ready for Resend/SendGrid/etc.)

## Prerequisites

- **Node.js 18+** ([Download](https://nodejs.org))
- **npm** (comes with Node.js) or **yarn**

## Quick Start (One Command)

Run the setup script for your platform:

**Windows (PowerShell):**
```powershell
npm run setup
```

**Unix/Linux/Mac:**
```bash
npm run setup
```

The setup script will:
- ✅ Install dependencies
- ✅ Create `.env` from `.env.example`
- ✅ Generate Prisma client
- ✅ Run database migrations
- ✅ Seed the database
- ✅ Validate configuration

## Manual Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration (see `.env.example` for all options):

**Minimum required:**
```env
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

**Generate a secure secret:**
```bash
npm run generate:secret
```

### 3. Initialize Database

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database (optional)
npm run prisma:seed
```

### 4. Validate Configuration

```bash
npm run setup:validate
```

### 5. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## Creating Your First Admin User

Before you can access the admin portal, you need to create an admin user:

```bash
# Create admin with default credentials (admin@meddrop.com / admin123)
npm run create:admin

# Or create with custom credentials
npm run create:admin your-email@example.com your-password "Your Name"
```

Then login at http://localhost:3000/admin/login

**Creating Other Users:**
- **Drivers**: Add through admin portal (after logging in)
- **Shippers**: Register through the public request form (will be created automatically)

## Architecture

For detailed architecture documentation, see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

**Key Components:**
- **Frontend:** Next.js 14 App Router (React Server Components)
- **Backend:** Next.js API Routes
- **Database:** Prisma ORM with PostgreSQL
- **Authentication:** httpOnly cookie-based sessions
- **Email:** Abstracted service (Resend/SendGrid/SMTP)
- **Storage:** Vercel Blob (optional, defaults to base64)
- **Monitoring:** Sentry integration

## Project Structure

```
med-drop/
├── app/
│   ├── (public routes)
│   │   ├── page.tsx                 # Home page
│   │   ├── request-load/            # Load request form
│   │   └── track/                   # Tracking pages
│   ├── admin/                       # Admin portal
│   │   ├── layout.tsx               # Admin layout with sidebar
│   │   ├── loads/                   # Load management
│   │   └── shippers/                # Shipper management
│   ├── api/                         # API routes
│   │   └── load-requests/           # Load request endpoints
│   ├── layout.tsx                   # Root layout
│   └── globals.css                  # Global styles
├── lib/
│   ├── prisma.ts                    # Prisma client singleton
│   ├── email.ts                     # Email service
│   ├── tracking.ts                  # Tracking code generation
│   ├── auth.ts                      # Authentication utilities
│   ├── types.ts                     # TypeScript types
│   └── utils.ts                     # Utility functions
├── prisma/
│   ├── schema.prisma                # Database schema
│   └── seed.ts                      # Database seed script
└── package.json
```

## Key Entities

### Data Models

1. **Shipper** - Client companies requesting services
2. **Facility** - Pickup and delivery locations
3. **LoadRequest** - Main entity for courier jobs
4. **TrackingEvent** - UPS-style checkpoint events
5. **Document** - Proof of pickup/delivery attachments
6. **User** - Internal admin staff

### Status Flow

```
NEW → QUOTED → QUOTE_ACCEPTED → SCHEDULED → PICKED_UP → IN_TRANSIT → DELIVERED → COMPLETED
```

## Design Features

- **Modern Professional Design**: Clean, corporate-friendly aesthetics
- **Glassmorphism**: Subtle glass effects on cards and containers
- **Responsive**: Mobile-first design that works on all devices
- **Accessibility**: WCAG-compliant with keyboard navigation support
- **Performance**: Optimized with Next.js App Router and React Server Components

## Email Integration

The application includes an abstract email service in `lib/email.ts`. To integrate with a real provider:

### Using Resend

```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail(options: EmailOptions) {
  await resend.emails.send({
    from: 'MED DROP <noreply@meddrop.com>',
    to: options.to,
    subject: options.subject,
    html: options.html,
  })
}
```

### Using SendGrid

```typescript
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

export async function sendEmail(options: EmailOptions) {
  await sgMail.send({
    to: options.to,
    from: 'noreply@meddrop.com',
    subject: options.subject,
    html: options.html,
  })
}
```

## Deployment

### Quick Deploy to Vercel

1. **Set up PostgreSQL database** (Supabase recommended - free tier)
2. **Push code to GitHub**
3. **Import project in Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repository
4. **Configure environment variables** (see `.env.example`)
5. **Deploy** - Vercel will automatically build and deploy
6. **Run migrations:**
   ```bash
   npx prisma migrate deploy
   ```
7. **Create admin user:**
   ```bash
   npm run create:admin admin@yourdomain.com password "Admin Name"
   ```

### Full Deployment Guide

See [`docs/DEPLOYMENT_RUNBOOK.md`](docs/DEPLOYMENT_RUNBOOK.md) for:
- Complete deployment instructions
- Rollback procedures
- Troubleshooting guide
- Monitoring setup
- Maintenance procedures

### Environment Variables for Production

```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="https://yourdomain.com"
RESEND_API_KEY="your-email-api-key"
```

### Database Migration for Production

Update `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"  // Change from sqlite
  url      = env("DATABASE_URL")
}
```

Then run:

```bash
npx prisma migrate deploy
npx prisma generate
```

## Authentication

Currently uses a simple email/password system. To add full authentication with NextAuth:

1. Install NextAuth: `npm install next-auth`
2. Create `app/api/auth/[...nextauth]/route.ts`
3. Configure providers (credentials, Google, etc.)
4. Add middleware for protected routes

## File Upload Integration

To add document uploads, integrate with:

- **Vercel Blob**: For Vercel deployments
- **AWS S3**: Traditional cloud storage
- **Cloudinary**: Image and document management
- **UploadThing**: Next.js-friendly uploads

Example with Vercel Blob:

```typescript
import { put } from '@vercel/blob'

const blob = await put(file.name, file, {
  access: 'public',
})

await prisma.document.create({
  data: {
    loadRequestId: loadId,
    type: 'PROOF_OF_PICKUP',
    title: file.name,
    url: blob.url,
  },
})
```

## Available Scripts

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run setup        # One-command setup (Windows/Unix)
npm run setup:validate # Validate configuration
```

### Database
```bash
npm run prisma:generate   # Generate Prisma client
npm run prisma:migrate    # Run database migrations
npm run prisma:studio     # Open Prisma Studio (database GUI)
npm run prisma:seed       # Seed database with sample data
```

### User Management
```bash
npm run create:admin      # Create admin user
npm run create:shipper    # Create shipper account
npm run create:driver     # Create driver account
npm run set:driver-admin  # Grant driver admin access
```

### Utilities
```bash
npm run generate:secret   # Generate secure random secret
npm run test              # Run test suite
npm run test:coverage     # Run tests with coverage
```

## Testing

```bash
# Run all tests
npm run test

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage
```

See [`tests/`](tests/) directory for test suite.

## Future Enhancements

- [ ] Real-time driver location tracking
- [ ] SMS notifications via Twilio
- [ ] PDF generation for BOL and invoices
- [ ] Multi-tenant support for franchises
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Automated routing and dispatch
- [ ] Integration with accounting software

## Documentation

- **[Architecture](docs/ARCHITECTURE.md)** - System design and architecture
- **[Deployment Runbook](docs/DEPLOYMENT_RUNBOOK.md)** - Deployment and operations guide
- **[Buyer Readiness](BUYER_READINESS_STATUS.md)** - Acquisition readiness assessment
- **[Market Readiness](MARKET_READINESS_ASSESSMENT.md)** - Launch readiness assessment

## Security

- ✅ Input validation (Zod schemas)
- ✅ XSS prevention (DOMPurify)
- ✅ SQL injection prevention (Prisma ORM)
- ✅ IDOR prevention (authorization checks)
- ✅ Audit logging (HIPAA-ready)
- ✅ Password hashing (bcrypt)
- ✅ Rate limiting
- ✅ httpOnly cookies (production)

## Compliance

- ✅ HIPAA audit logging
- ✅ Data encryption (in transit)
- ✅ Soft deletes (data preservation)
- ✅ Access logging
- ✅ Chain of custody tracking

## License

Private and proprietary. All rights reserved.

## Support

For questions or support, contact your development team.

---

**Built for MED DROP Medical Courier Services**  
**Version:** 1.0.0  
**Status:** Production Ready ✅

## File Upload Integration

To add document uploads, integrate with:

- **Vercel Blob**: For Vercel deployments
- **AWS S3**: Traditional cloud storage
- **Cloudinary**: Image and document management
- **UploadThing**: Next.js-friendly uploads

Example with Vercel Blob:

```typescript
import { put } from '@vercel/blob'

const blob = await put(file.name, file, {
  access: 'public',
})

await prisma.document.create({
  data: {
    loadRequestId: loadId,
    type: 'PROOF_OF_PICKUP',
    title: file.name,
    url: blob.url,
  },
})
```

## Available Scripts

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run setup        # One-command setup (Windows/Unix)
npm run setup:validate # Validate configuration
```

### Database
```bash
npm run prisma:generate   # Generate Prisma client
npm run prisma:migrate    # Run database migrations
npm run prisma:studio     # Open Prisma Studio (database GUI)
npm run prisma:seed       # Seed database with sample data
```

### User Management
```bash
npm run create:admin      # Create admin user
npm run create:shipper    # Create shipper account
npm run create:driver     # Create driver account
npm run set:driver-admin  # Grant driver admin access
```

### Utilities
```bash
npm run generate:secret   # Generate secure random secret
npm run test              # Run test suite
npm run test:coverage     # Run tests with coverage
```

## Testing

```bash
# Run all tests
npm run test

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage
```

See [`tests/`](tests/) directory for test suite.

## Future Enhancements

- [ ] Real-time driver location tracking
- [ ] SMS notifications via Twilio
- [ ] PDF generation for BOL and invoices
- [ ] Multi-tenant support for franchises
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Automated routing and dispatch
- [ ] Integration with accounting software

## Documentation

- **[Architecture](docs/ARCHITECTURE.md)** - System design and architecture
- **[Deployment Runbook](docs/DEPLOYMENT_RUNBOOK.md)** - Deployment and operations guide
- **[Buyer Readiness](BUYER_READINESS_STATUS.md)** - Acquisition readiness assessment
- **[Market Readiness](MARKET_READINESS_ASSESSMENT.md)** - Launch readiness assessment

## Security

- ✅ Input validation (Zod schemas)
- ✅ XSS prevention (DOMPurify)
- ✅ SQL injection prevention (Prisma ORM)
- ✅ IDOR prevention (authorization checks)
- ✅ Audit logging (HIPAA-ready)
- ✅ Password hashing (bcrypt)
- ✅ Rate limiting
- ✅ httpOnly cookies (production)

## Compliance

- ✅ HIPAA audit logging
- ✅ Data encryption (in transit)
- ✅ Soft deletes (data preservation)
- ✅ Access logging
- ✅ Chain of custody tracking

## License

Private and proprietary. All rights reserved.

## Support

For questions or support, contact your development team.

---

**Built for MED DROP Medical Courier Services**  
**Version:** 1.0.0  
**Status:** Production Ready ✅
