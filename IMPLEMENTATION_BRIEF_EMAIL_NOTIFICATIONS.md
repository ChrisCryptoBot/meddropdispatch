# Implementation Brief: Email-Based Passive Notification System

## 🎯 PROJECT CONTEXT

### Current System Overview
This is a medical courier scheduling system built with:
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Prisma ORM with SQLite (dev) / PostgreSQL (production)
- **Styling**: Tailwind CSS
- **Email**: Resend (configured but not fully utilized)
- **Authentication**: Custom hooks (useDriverAuth, useShipperAuth, useAdminAuth)
- **Storage**: Type-safe localStorage utilities

### Current Workflow
1. Shipper fills out comprehensive web form (`/request-load`)
2. System creates LoadRequest with status "REQUESTED" or "NEW"
3. Admin reviews in dashboard
4. Admin calls shipper to negotiate
5. Admin updates load with quote
6. Load moves through: SCHEDULED → PICKED_UP → IN_TRANSIT → DELIVERED → COMPLETED

### Problem Statement
- Shippers don't want to fill out long forms
- System is too active/requires too much input
- Need passive notification system where shippers can just email
- Still need documentation/records in system
- Need context (distance, rate) before calling shipper

---

## 🚀 WHAT WE'RE BUILDING

### Email-Based Passive Notification System

**Core Concept**: Shippers email `requests@meddrop.com` (or configured email), system automatically:
1. Parses email (from, subject, body)
2. Extracts pickup/dropoff addresses
3. Auto-creates LoadRequest with status "QUOTE_REQUESTED"
4. Calculates distance and suggests rate
5. Shows notification in admin dashboard
6. Admin calls shipper, negotiates, updates load with full details

### Key Features
- **Email parsing**: Extract shipper info, addresses, description from email
- **Auto geocoding**: Convert addresses to coordinates
- **Distance calculation**: Calculate route distance and time
- **Rate suggestion**: Auto-calculate suggested rate based on distance
- **Dashboard notifications**: Real-time alerts for new quote requests
- **Quick actions**: Call button, view details, accept/quote buttons

---

## 📋 BRANCH INFORMATION

### Working Branch
**Branch Name**: `claude/build-shipperbridge-portal-01Y9eA9nJsDkqCrrkAk8CXoF`

**IMPORTANT**: 
- Work ONLY on this branch
- Do NOT create new branches
- Do NOT merge to main/master
- All changes must be on this specific branch

### Repository
- **URL**: `https://github.com/ChrisCryptoBot/MED-DROP.git`
- **Current Status**: All previous optimizations are committed and pushed
- **Working Tree**: Should be clean before starting

---

## 🗂️ FILE STRUCTURE OVERVIEW

### Current Structure
```
app/
├── admin/
│   ├── page.tsx (dashboard)
│   ├── loads/
│   │   ├── page.tsx (loads list)
│   │   └── [id]/page.tsx (load detail)
├── api/
│   ├── load-requests/
│   │   ├── route.ts (create/list loads)
│   │   └── [id]/
│   │       ├── route.ts (get/update load)
│   │       └── status/route.ts (update status)
lib/
├── email.ts (email sending utilities)
├── types.ts (TypeScript types)
├── constants.ts (application constants)
├── prisma.ts (Prisma client)
prisma/
├── schema.prisma (database schema)
```

---

## 📝 FILES TO CREATE

### 1. Email Parsing & Processing
**File**: `lib/email-parser.ts`
- Parse email content (from, subject, body)
- Extract addresses using regex patterns
- Extract basic description
- Return structured data

**File**: `lib/address-parser.ts`
- Parse addresses from email body text
- Handle various address formats
- Return structured address objects

**File**: `lib/geocoding.ts`
- Geocode addresses using Google Maps API
- Validate addresses
- Return coordinates and formatted addresses

**File**: `lib/distance-calculator.ts`
- Calculate distance between two addresses
- Calculate estimated travel time
- Use Google Maps Distance Matrix API
- Return distance (miles) and time (minutes)

**File**: `lib/rate-calculator.ts`
- Calculate suggested rate based on:
  - Base rate (configurable)
  - Distance (per mile rate)
  - Service type multiplier
- Return suggested rate range

### 2. API Routes
**File**: `app/api/webhooks/email/route.ts`
- Handle incoming email webhooks from Resend
- Parse email data
- Create QUOTE_REQUESTED loads
- Return success/error

**File**: `app/api/load-requests/quote-requests/route.ts`
- GET: List all QUOTE_REQUESTED loads
- Filter and sort options
- Return quote requests with calculated rates

**File**: `app/api/load-requests/[id]/calculate-rate/route.ts`
- POST: Calculate rate for a specific load
- Use distance calculator and rate calculator
- Return calculated rate

**File**: `app/api/notifications/route.ts`
- GET: Get notifications for admin
- Return unread quote requests
- Mark as read functionality

### 3. Frontend Components
**File**: `components/features/QuoteRequestCard.tsx`
- Display quote request in card format
- Show: shipper, addresses, distance, suggested rate
- Quick action buttons

**File**: `components/features/RateDisplay.tsx`
- Display calculated/suggested rate
- Show rate breakdown (base + distance)

**File**: `components/features/EmailSourceBadge.tsx`
- Badge showing load came from email
- Visual indicator

**File**: `components/features/CallButton.tsx`
- Button that opens phone dialer
- Takes phone number as prop

**File**: `components/features/NotificationBell.tsx`
- Notification bell icon with badge
- Shows count of unread notifications
- Click to show dropdown

---

## 🔧 FILES TO MODIFY

### 1. Database Schema
**File**: `prisma/schema.prisma`

**Changes to LoadRequest model**:
```prisma
model LoadRequest {
  // ... existing fields ...
  
  // Add these new fields:
  rawEmailContent    String?  // Store original email body
  emailSubject       String?  // Store email subject
  emailFrom          String?  // Store sender email
  autoCalculatedDistance Float? // Distance in miles
  autoCalculatedTime     Int?   // Time in minutes
  suggestedRateMin      Float?  // Minimum suggested rate
  suggestedRateMax      Float?  // Maximum suggested rate
  
  // Modify existing:
  createdVia String @default("WEB_FORM") // Change to support "EMAIL", "WEB_FORM", "INTERNAL"
  
  // Ensure QUOTE_REQUESTED status is supported (check LoadStatus type)
}
```

**Note**: The status "QUOTE_REQUESTED" should be added to the LoadStatus type if not already present.

### 2. Type Definitions
**File**: `lib/types.ts`

**Add to LoadStatus type**:
```typescript
export type LoadStatus = 
  | 'QUOTE_REQUESTED'  // NEW: Email-based quote request
  | 'REQUESTED'        // Existing
  | 'SCHEDULED'        // Existing
  // ... rest of existing statuses
```

**Add new types**:
```typescript
export type LoadSource = 'EMAIL' | 'WEB_FORM' | 'INTERNAL'

export interface ParsedEmailData {
  from: string
  subject: string
  body: string
  pickupAddress?: string
  dropoffAddress?: string
  description?: string
}

export interface CalculatedRate {
  distance: number
  time: number
  suggestedRateMin: number
  suggestedRateMax: number
  breakdown: {
    baseRate: number
    distanceRate: number
    serviceMultiplier: number
  }
}
```

**File**: `lib/constants.ts`

**Add**:
```typescript
// Rate calculation constants
export const RATE_CONFIG = {
  BASE_RATE: 25.00,           // Base rate in USD
  PER_MILE_RATE: 1.50,        // Rate per mile
  MINIMUM_RATE: 30.00,        // Minimum charge
  SERVICE_MULTIPLIERS: {
    STAT: 1.5,
    SAME_DAY: 1.2,
    SCHEDULED_ROUTE: 1.0,
    OVERFLOW: 1.1,
    GOVERNMENT: 1.0,
  },
}

// Add QUOTE_REQUESTED to status labels/colors
export const LOAD_STATUS_LABELS: Record<LoadStatus, string> = {
  QUOTE_REQUESTED: 'Quote Requested',
  // ... existing
}

export const LOAD_STATUS_COLORS: Record<LoadStatus, string> = {
  QUOTE_REQUESTED: 'bg-amber-100 text-amber-800',
  // ... existing
}
```

### 3. Email Service
**File**: `lib/email.ts`

**Add functions**:
```typescript
// Parse incoming email webhook data
export async function parseIncomingEmail(webhookData: any): Promise<ParsedEmailData>

// Send confirmation email to shipper after quote request created
export async function sendQuoteRequestConfirmation(
  to: string,
  trackingCode: string
): Promise<void>
```

### 4. Admin Dashboard
**File**: `app/admin/page.tsx`

**Changes**:
- Add "Quote Requests" section/widget at top
- Show count of QUOTE_REQUESTED loads
- Display recent quote requests (last 5)
- Add link to view all quote requests
- Show notification badge if new requests exist

### 5. Admin Loads List
**File**: `app/admin/loads/page.tsx`

**Changes**:
- Add "Quote Requests" tab/filter
- Filter loads by QUOTE_REQUESTED status
- Show email source badge for email-sourced loads
- Display distance and suggested rate in list
- Add quick actions column

### 6. Admin Load Detail
**File**: `app/admin/loads/[id]/page.tsx`

**Changes**:
- Show email source information (if from email)
- Display original email content in collapsible section
- Show auto-calculated distance and time
- Display suggested rate with breakdown
- Add "Call Shipper" button (opens phone dialer)
- Add "Calculate Rate" button (recalculate)
- Modify form to allow updating after call
- Add quick status buttons: "Quote", "Schedule", "Deny"

### 7. API Routes - Load Requests
**File**: `app/api/load-requests/route.ts`

**Changes**:
- Modify POST handler to support email-sourced loads
- Add logic to match email sender to existing Shipper
- Auto-create Shipper if email not found
- Set createdVia to "EMAIL" for email-sourced loads
- Set status to "QUOTE_REQUESTED" for email loads
- Trigger distance/rate calculation after creation

**File**: `app/api/load-requests/[id]/route.ts`

**Changes**:
- Ensure GET returns email source fields
- Ensure PATCH can update email-related fields
- Support updating from QUOTE_REQUESTED to other statuses

**File**: `app/api/load-requests/[id]/status/route.ts`

**Changes**:
- Add support for QUOTE_REQUESTED status
- Add transition: QUOTE_REQUESTED → QUOTED
- Add transition: QUOTE_REQUESTED → SCHEDULED
- Add transition: QUOTE_REQUESTED → DENIED

### 8. Tracking
**File**: `lib/tracking.ts`

**Changes**:
- Ensure QUOTE_REQUESTED status can generate tracking events
- Add tracking event for "QUOTE_REQUESTED" status

---

## 🗑️ FILES TO REMOVE

**None** - We're adding functionality, not removing existing features. The web form will still work alongside email system.

---

## 🔐 ENVIRONMENT VARIABLES TO ADD

Add to `.env` file:
```env
# Email Webhook
RESEND_WEBHOOK_SECRET=your-webhook-secret-here
QUOTE_REQUEST_EMAIL=requests@meddrop.com

# Google Maps API (for geocoding and distance)
GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here

# Rate Calculation (optional - can be in constants)
BASE_RATE=25.00
PER_MILE_RATE=1.50
MINIMUM_RATE=30.00
```

---

## 📦 DEPENDENCIES TO ADD

Add to `package.json`:
```json
{
  "dependencies": {
    "@googlemaps/google-maps-services-js": "^3.3.0"
  }
}
```

Run: `npm install @googlemaps/google-maps-services-js`

---

## 🗄️ DATABASE MIGRATION

**File**: Create new migration file in `prisma/migrations/`

**Migration name**: `add_email_quote_request_features`

**SQL changes**:
```sql
-- Add new columns to LoadRequest table
ALTER TABLE "LoadRequest" ADD COLUMN "rawEmailContent" TEXT;
ALTER TABLE "LoadRequest" ADD COLUMN "emailSubject" TEXT;
ALTER TABLE "LoadRequest" ADD COLUMN "emailFrom" TEXT;
ALTER TABLE "LoadRequest" ADD COLUMN "autoCalculatedDistance" REAL;
ALTER TABLE "LoadRequest" ADD COLUMN "autoCalculatedTime" INTEGER;
ALTER TABLE "LoadRequest" ADD COLUMN "suggestedRateMin" REAL;
ALTER TABLE "LoadRequest" ADD COLUMN "suggestedRateMax" REAL;

-- Update createdVia to support EMAIL (if needed, check current values)
-- Note: This depends on current schema implementation
```

**After migration**: Run `npx prisma generate` to update Prisma client

---

## 🔄 WORKFLOW ARCHITECTURE (IN-DEPTH)

### Complete End-to-End Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    EMAIL-BASED QUOTE REQUEST FLOW              │
└─────────────────────────────────────────────────────────────────┘

1. SHIPPER SENDS EMAIL
   │
   ├─> Email sent to: requests@meddrop.com
   │
   └─> Resend receives email
       │
       └─> Webhook triggered → POST /api/webhooks/email
           │
           ├─> Verify webhook signature
           ├─> Extract email data (from, subject, body)
           └─> Parse email content
               │
               ├─> Extract shipper email/name
               ├─> Extract pickup address
               ├─> Extract dropoff address
               └─> Extract description (if available)

2. SHIPPER MATCHING/CREATION
   │
   ├─> Query database: Find Shipper by email
   │
   ├─> IF Shipper exists:
   │   └─> Link LoadRequest to existing Shipper
   │
   └─> IF Shipper NOT found:
       ├─> Extract company name from email domain or body
       ├─> Create new Shipper record
       │   ├─> email: from email address
       │   ├─> companyName: extracted or "Unknown"
       │   ├─> contactName: extracted or "Unknown"
       │   ├─> phone: null (to be filled later)
       │   └─> isActive: true
       └─> Link LoadRequest to new Shipper

3. ADDRESS PROCESSING
   │
   ├─> IF addresses parsed successfully:
   │   ├─> Geocode pickup address (Google Maps API)
   │   │   ├─> Get coordinates (lat, lng)
   │   │   ├─> Get formatted address
   │   │   └─> Validate address exists
   │   │
   │   ├─> Geocode dropoff address (Google Maps API)
   │   │   ├─> Get coordinates (lat, lng)
   │   │   ├─> Get formatted address
   │   │   └─> Validate address exists
   │   │
   │   └─> Calculate distance (Google Maps Distance Matrix API)
   │       ├─> Get distance in miles
   │       ├─> Get estimated travel time
   │       └─> Store in LoadRequest
   │
   └─> IF addresses NOT parsed:
       ├─> Create LoadRequest with status QUOTE_REQUESTED
       ├─> Set flag: needsManualReview = true
       ├─> Store raw email content
       └─> Admin must manually enter addresses

4. RATE CALCULATION
   │
   ├─> IF distance calculated:
   │   ├─> Calculate base rate
   │   ├─> Calculate distance rate (distance × per_mile_rate)
   │   ├─> Apply service type multiplier (if detected)
   │   ├─> Calculate total: (base + distance) × multiplier
   │   ├─> Apply minimum rate check
   │   └─> Generate rate range (min: -5%, max: +10%)
   │
   └─> IF distance NOT calculated:
       └─> Set suggestedRateMin/Max to null
           └─> Admin calculates manually

5. LOAD REQUEST CREATION
   │
   ├─> Create LoadRequest record:
   │   ├─> status: "QUOTE_REQUESTED"
   │   ├─> createdVia: "EMAIL"
   │   ├─> shipperId: matched/created shipper
   │   ├─> pickupFacilityId: create facility from parsed address
   │   ├─> dropoffFacilityId: create facility from parsed address
   │   ├─> rawEmailContent: original email body
   │   ├─> emailSubject: email subject
   │   ├─> emailFrom: sender email
   │   ├─> autoCalculatedDistance: distance (if calculated)
   │   ├─> autoCalculatedTime: time (if calculated)
   │   ├─> suggestedRateMin: min rate (if calculated)
   │   ├─> suggestedRateMax: max rate (if calculated)
   │   ├─> commodityDescription: extracted from email or "See email"
   │   └─> serviceType: detected or "SAME_DAY" (default)
   │
   ├─> Create TrackingEvent:
   │   ├─> code: "QUOTE_REQUESTED"
   │   ├─> label: "Quote Request Received"
   │   ├─> description: "Quote request received via email"
   │   └─> createdAt: now
   │
   └─> Send confirmation email to shipper:
       ├─> Subject: "Quote Request Received - [Tracking Code]"
       └─> Body: Confirmation that request was received

6. ADMIN NOTIFICATION
   │
   ├─> Create notification record:
   │   ├─> type: "QUOTE_REQUEST"
   │   ├─> loadRequestId: new load ID
   │   ├─> read: false
   │   └─> createdAt: now
   │
   └─> Update admin dashboard:
       ├─> Increment notification badge count
       ├─> Add to "Quote Requests" list
       └─> Show in real-time (polling or WebSocket)

7. ADMIN WORKFLOW (HUMAN INTERVENTION)
   │
   ├─> Admin sees notification in dashboard
   │
   ├─> Admin clicks on quote request
   │   └─> Opens load detail page
   │
   ├─> Admin reviews:
   │   ├─> Shipper information
   │   ├─> Pickup/dropoff addresses
   │   ├─> Distance and suggested rate
   │   ├─> Original email content
   │   └─> Any flags (needsManualReview, etc.)
   │
   ├─> Admin clicks "Call Shipper" button
   │   └─> Phone dialer opens with shipper phone number
   │
   ├─> Admin calls shipper:
   │   ├─> Confirms details
   │   ├─> Negotiates price
   │   ├─> Gets full load details:
   │   │   ├─> Exact commodity description
   │   │   ├─> Temperature requirements
   │   │   ├─> Specimen category
   │   │   ├─> Container count
   │   │   ├─> Weight
   │   │   ├─> Ready time
   │   │   ├─> Delivery deadline
   │   │   └─> Special instructions
   │   └─> Agrees on final price
   │
   └─> Admin updates LoadRequest:
       ├─> Update all fields with full details
       ├─> Set quoteAmount to negotiated price
       ├─> Update status based on outcome:
       │   ├─> IF shipper accepts: status = "QUOTED"
       │   ├─> IF scheduled immediately: status = "SCHEDULED"
       │   └─> IF declined: status = "DENIED"
       └─> Create TrackingEvent:
           ├─> IF QUOTED: "QUOTE_SUBMITTED"
           ├─> IF SCHEDULED: "SCHEDULED"
           └─> IF DENIED: "DENIED"

8. CONTINUE NORMAL WORKFLOW
   │
   └─> Load continues through standard flow:
       QUOTED → SCHEDULED → PICKED_UP → IN_TRANSIT → DELIVERED → COMPLETED
```

### State Machine Diagram

```
                    ┌─────────────────┐
                    │ QUOTE_REQUESTED │  ← Email received, auto-created
                    └────────┬────────┘
                             │
                ┌────────────┼────────────┐
                │            │            │
                ▼            ▼            ▼
        ┌───────────┐  ┌──────────┐  ┌──────────┐
        │  QUOTED   │  │ SCHEDULED│  │  DENIED  │
        └─────┬─────┘  └────┬─────┘  └──────────┘
              │             │
              │             │
              ▼             ▼
        ┌─────────────────────────┐
        │   NORMAL WORKFLOW       │
        │                         │
        │  SCHEDULED              │
        │    ↓                     │
        │  PICKED_UP              │
        │    ↓                     │
        │  IN_TRANSIT             │
        │    ↓                     │
        │  DELIVERED              │
        │    ↓                     │
        │  COMPLETED              │
        └─────────────────────────┘
```

### Data Flow Architecture

```
┌──────────────┐
│   Resend     │  Email Service
│   Webhook    │
└──────┬───────┘
       │
       │ POST /api/webhooks/email
       │ { email data }
       ▼
┌─────────────────────────────────┐
│  Email Parser Service           │
│  - Parse from, subject, body    │
│  - Extract addresses             │
│  - Extract description           │
└──────┬──────────────────────────┘
       │
       │ Parsed Data
       ▼
┌─────────────────────────────────┐
│  Address Parser                 │
│  - Extract pickup address        │
│  - Extract dropoff address       │
└──────┬──────────────────────────┘
       │
       │ Addresses
       ▼
┌─────────────────────────────────┐
│  Geocoding Service              │
│  (Google Maps API)              │
│  - Geocode addresses            │
│  - Get coordinates              │
└──────┬──────────────────────────┘
       │
       │ Coordinates
       ▼
┌─────────────────────────────────┐
│  Distance Calculator            │
│  (Google Maps API)              │
│  - Calculate distance           │
│  - Calculate time               │
└──────┬──────────────────────────┘
       │
       │ Distance + Time
       ▼
┌─────────────────────────────────┐
│  Rate Calculator                │
│  - Calculate base rate           │
│  - Calculate distance rate       │
│  - Apply multipliers            │
│  - Generate rate range           │
└──────┬──────────────────────────┘
       │
       │ All Calculated Data
       ▼
┌─────────────────────────────────┐
│  Database (Prisma)              │
│  - Create/Update Shipper         │
│  - Create Facilities            │
│  - Create LoadRequest            │
│  - Create TrackingEvent          │
│  - Create Notification           │
└──────┬──────────────────────────┘
       │
       │ LoadRequest Created
       ▼
┌─────────────────────────────────┐
│  Admin Dashboard                │
│  - Show notification            │
│  - Display quote request        │
│  - Show calculated data          │
└─────────────────────────────────┘
```

### User Interaction Flow (Admin Side)

```
ADMIN DASHBOARD
│
├─> Sees notification badge (red, with count)
│
├─> Clicks notification OR navigates to "Quote Requests"
│
└─> QUOTE REQUESTS LIST PAGE
    │
    ├─> Sees table of quote requests:
    │   ├─> Shipper name
    │   ├─> Pickup → Dropoff (abbreviated)
    │   ├─> Distance (miles)
    │   ├─> Suggested rate ($XX-XX)
    │   ├─> Time since request
    │   └─> Status badge
    │
    ├─> Clicks on a quote request
    │
    └─> LOAD DETAIL PAGE (Quote Request View)
        │
        ├─> TOP SECTION: Quick Info
        │   ├─> Email source badge
        │   ├─> Tracking code
        │   ├─> Shipper info
        │   └─> Status: QUOTE_REQUESTED
        │
        ├─> EMAIL SOURCE SECTION
        │   ├─> "Received via Email" badge
        │   ├─> From: shipper@email.com
        │   ├─> Subject: [email subject]
        │   └─> [Collapsible] View Original Email
        │       └─> Shows raw email content
        │
        ├─> AUTO-CALCULATED INFO SECTION
        │   ├─> Distance: X.X miles
        │   ├─> Estimated Time: XX minutes
        │   ├─> Suggested Rate: $XX - $XX
        │   └─> [Expandable] Rate Breakdown
        │       ├─> Base Rate: $XX
        │       ├─> Distance Rate: $XX
        │       ├─> Service Multiplier: X.X
        │       └─> Total: $XX
        │
        ├─> ADDRESSES SECTION
        │   ├─> Pickup Address (formatted)
        │   └─> Dropoff Address (formatted)
        │
        ├─> QUICK ACTIONS BUTTONS
        │   ├─> [Primary] "Call Shipper" button
        │   │   └─> Opens phone dialer
        │   │
        │   ├─> "Recalculate Rate" button
        │   │   └─> Re-runs calculation
        │   │
        │   ├─> "Quote" button
        │   │   └─> Moves to QUOTED status
        │   │
        │   ├─> "Schedule" button
        │   │   └─> Moves to SCHEDULED status
        │   │
        │   └─> "Deny" button
        │       └─> Moves to DENIED status
        │
        └─> DETAILS FORM (Editable)
            ├─> After call, admin fills in:
            │   ├─> Full commodity description
            │   ├─> Temperature requirements
            │   ├─> Specimen category
            │   ├─> Container count
            │   ├─> Weight
            │   ├─> Ready time
            │   ├─> Delivery deadline
            │   ├─> Special instructions
            │   └─> Final quote amount
            │
            └─> [Save] button
                └─> Updates load, creates tracking event
```

### Error Handling Workflows

```
EMAIL PARSING ERRORS
│
├─> IF email body is empty:
│   └─> Create load with status QUOTE_REQUESTED
│       ├─> Store raw email content
│       ├─> Set needsManualReview = true
│       └─> Admin must manually extract info
│
├─> IF addresses cannot be parsed:
│   └─> Create load with status QUOTE_REQUESTED
│       ├─> Store raw email content
│       ├─> Set needsManualReview = true
│       ├─> Set pickupFacilityId = null
│       ├─> Set dropoffFacilityId = null
│       └─> Admin must manually enter addresses
│
└─> IF shipper email is invalid:
    └─> Create load with status QUOTE_REQUESTED
        ├─> Store email in rawEmailContent
        ├─> Set shipperId = null (or create placeholder)
        └─> Admin must manually create/link shipper

GEOCODING ERRORS
│
├─> IF address geocoding fails:
│   └─> Create load with status QUOTE_REQUESTED
│       ├─> Store address as text (not geocoded)
│       ├─> Set needsManualReview = true
│       └─> Admin must manually geocode/validate
│
└─> IF address is ambiguous (multiple results):
    └─> Create load with status QUOTE_REQUESTED
        ├─> Store all possible addresses
        ├─> Set needsManualReview = true
        └─> Admin must select correct address

DISTANCE CALCULATION ERRORS
│
├─> IF distance calculation fails:
│   └─> Create load with status QUOTE_REQUESTED
│       ├─> Set autoCalculatedDistance = null
│       ├─> Set autoCalculatedTime = null
│       └─> Admin must manually calculate or use estimate
│
└─> IF no route found:
    └─> Create load with status QUOTE_REQUESTED
        ├─> Set autoCalculatedDistance = null
        ├─> Set needsManualReview = true
        └─> Admin must verify addresses are correct

RATE CALCULATION ERRORS
│
└─> IF rate calculation fails:
    └─> Create load with status QUOTE_REQUESTED
        ├─> Set suggestedRateMin = null
        ├─> Set suggestedRateMax = null
        └─> Admin calculates rate manually

GENERAL ERROR HANDLING PRINCIPLE:
- ALWAYS create the LoadRequest, even if parsing fails
- Mark with needsManualReview flag
- Store all available raw data
- Never lose the email/request
- Admin can always manually complete the process
```

### Decision Points & Logic

```
DECISION TREE: Email Processing

START: Email received
│
├─> Parse email content
│   │
│   ├─> SUCCESS: Continue
│   └─> FAIL: Create load, mark for review, STOP
│
├─> Extract addresses
│   │
│   ├─> BOTH addresses found: Continue
│   ├─> ONE address found: Create load, mark for review, STOP
│   └─> NO addresses found: Create load, mark for review, STOP
│
├─> Geocode addresses
│   │
│   ├─> BOTH geocoded: Continue
│   ├─> ONE geocoded: Create load, mark for review, STOP
│   └─> NONE geocoded: Create load, mark for review, STOP
│
├─> Calculate distance
│   │
│   ├─> SUCCESS: Continue
│   └─> FAIL: Create load, continue without distance
│
├─> Calculate rate
│   │
│   ├─> SUCCESS: Continue
│   └─> FAIL: Create load, continue without rate
│
└─> Create LoadRequest
    └─> ALWAYS succeeds (even with partial data)

DECISION TREE: Shipper Matching

START: Extract shipper email
│
├─> Query: Shipper WHERE email = extracted_email
│   │
│   ├─> FOUND:
│   │   └─> Link LoadRequest to existing Shipper
│   │
│   └─> NOT FOUND:
│       ├─> Extract company name from:
│       │   ├─> Email domain (e.g., clinic@abchealth.com → "ABC Health")
│       │   ├─> Email body (look for "company:", "from:", etc.)
│       │   └─> Default: "Unknown Company"
│       │
│       ├─> Create new Shipper:
│       │   ├─> email: extracted
│       │   ├─> companyName: extracted or "Unknown"
│       │   ├─> contactName: extracted or "Unknown"
│       │   ├─> phone: null (to be filled later)
│       │   ├─> clientType: "OTHER" (default)
│       │   └─> isActive: true
│       │
│       └─> Link LoadRequest to new Shipper
```

### Component Interaction Flow

```
┌─────────────────┐
│  Email Webhook  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│ Email Parser    │─────>│ Address Parser   │
└────────┬────────┘      └────────┬─────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐      ┌──────────────────┐
│ Geocoding API   │      │ Distance API      │
└────────┬────────┘      └────────┬─────────┘
         │                       │
         └───────────┬───────────┘
                     ▼
         ┌──────────────────┐
         │ Rate Calculator  │
         └────────┬─────────┘
                  │
                  ▼
         ┌──────────────────┐
         │  Database Save    │
         └────────┬─────────┘
                  │
                  ▼
         ┌──────────────────┐
         │ Notification     │
         └────────┬─────────┘
                  │
                  ▼
         ┌──────────────────┐
         │ Admin Dashboard  │
         └──────────────────┘
```

### Real-time Notification Flow

```
POLLING APPROACH (Recommended for MVP):

Admin Dashboard
│
├─> Component mounts
│   └─> Start polling interval (every 30 seconds)
│
├─> Poll: GET /api/notifications
│   │
│   ├─> Backend queries:
│   │   ├─> LoadRequests WHERE status = 'QUOTE_REQUESTED'
│   │   ├─> AND createdAt > (last check time)
│   │   └─> Return count and recent requests
│   │
│   └─> Frontend updates:
│       ├─> Notification badge count
│       ├─> Quote requests list
│       └─> Show toast if new requests
│
└─> User clicks notification
    └─> Navigate to quote request detail

WEBSOCKET APPROACH (Future Enhancement):

Admin Dashboard
│
├─> Establish WebSocket connection
│   └─> ws://api/notifications/stream
│
├─> Backend listens for:
│   ├─> New LoadRequest created
│   ├─> Status = 'QUOTE_REQUESTED'
│   └─> Emit event to connected clients
│
└─> Frontend receives event
    ├─> Update notification badge
    ├─> Add to quote requests list
    └─> Show toast notification
```

### Complete Status Transition Flow

```
EMAIL RECEIVED
    │
    ▼
QUOTE_REQUESTED (Auto-created)
    │
    ├─> Admin calls, negotiates, quotes
    │   │
    │   ├─> Shipper accepts quote
    │   │   │
    │   │   ▼
    │   │ QUOTED
    │   │   │
    │   │   ├─> Shipper confirms
    │   │   │   │
    │   │   │   ▼
    │   │   │ SCHEDULED
    │   │   │
    │   │   └─> OR: Admin schedules directly
    │   │       │
    │   │       ▼
    │   │   SCHEDULED
    │   │
    │   ├─> Admin schedules immediately
    │   │   │
    │   │   ▼
    │   │ SCHEDULED
    │   │
    │   └─> Shipper declines or admin denies
    │       │
    │       ▼
    │   DENIED
    │
    └─> Continue normal workflow from SCHEDULED
        │
        ▼
    PICKED_UP
        │
        ▼
    IN_TRANSIT
        │
        ▼
    DELIVERED
        │
        ▼
    COMPLETED
```

## 🔄 IMPLEMENTATION STEPS

### Phase 1: Backend Infrastructure
1. Add new fields to Prisma schema
2. Create database migration
3. Update TypeScript types
4. Create email parser utility
5. Create address parser utility
6. Create geocoding utility
7. Create distance calculator utility
8. Create rate calculator utility

### Phase 2: API Routes
1. Create email webhook route
2. Modify load-requests route to handle email loads
3. Create quote-requests route
4. Create calculate-rate route
5. Create notifications route
6. Update status route to handle QUOTE_REQUESTED

### Phase 3: Frontend Components
1. Create QuoteRequestCard component
2. Create RateDisplay component
3. Create EmailSourceBadge component
4. Create CallButton component
5. Create NotificationBell component

### Phase 4: Admin Interface Updates
1. Update admin dashboard page
2. Update admin loads list page
3. Update admin load detail page
4. Add notification system to admin layout

### Phase 5: Email Service Integration
1. Configure Resend webhook
2. Set up email forwarding
3. Test email parsing
4. Test end-to-end flow

### Phase 6: Testing & Refinement
1. Test email parsing with various formats
2. Test address extraction
3. Test distance calculation
4. Test rate calculation
5. Test dashboard notifications
6. Test complete workflow

---

## 🎨 UI/UX REQUIREMENTS

### Admin Dashboard
- **Quote Requests Widget**: 
  - Show count of pending quote requests
  - Show last 3-5 recent requests
  - Red badge if unread
  - Click to view all

### Quote Requests List
- **Table/Grid View**:
  - Shipper name/company
  - Pickup → Dropoff (abbreviated)
  - Distance (miles)
  - Suggested rate ($XX-XX)
  - Time since request
  - Quick actions: Call, View, Quote

### Load Detail (Quote Request)
- **Email Source Section**:
  - Badge: "From Email"
  - Show original email subject
  - Collapsible: "View Original Email"
  - Show sender email
  
- **Auto-Calculated Info**:
  - Distance: X.X miles
  - Est. Time: XX minutes
  - Suggested Rate: $XX - $XX
  - Rate Breakdown (expandable)
  
- **Quick Actions**:
  - "Call Shipper" button (prominent)
  - "Calculate Rate" button
  - "Quote" button (moves to QUOTED)
  - "Schedule" button (moves to SCHEDULED)
  - "Deny" button (moves to DENIED)

---

## 🔍 ADDRESS PARSING LOGIC

### Patterns to Look For
1. **Explicit labels**: "Pickup:", "From:", "Origin:", "Pick up at:"
2. **Explicit labels**: "Dropoff:", "To:", "Destination:", "Deliver to:"
3. **Address formats**: 
   - Street number + street name
   - City, State ZIP
   - Full addresses with commas
4. **Common patterns**:
   - "Pickup: [address]"
   - "From [address] to [address]"
   - "Pick up at [address], deliver to [address]"

### Fallback Strategy
If addresses can't be parsed:
- Create load with status QUOTE_REQUESTED
- Mark as "NEEDS_MANUAL_REVIEW"
- Show in dashboard with flag
- Admin can manually enter addresses

---

## 💰 RATE CALCULATION FORMULA

```
Base Rate: $25.00
Per Mile: $1.50
Service Multiplier: Based on service type (STAT = 1.5x, etc.)

Suggested Rate = (Base Rate + (Distance × Per Mile)) × Service Multiplier

Minimum Rate: $30.00 (if calculated rate is below minimum)

Return range: [Suggested Rate - 5%, Suggested Rate + 10%]
```

**Example**:
- Distance: 12 miles
- Service: STAT (1.5x multiplier)
- Calculation: ($25 + (12 × $1.50)) × 1.5 = ($25 + $18) × 1.5 = $64.50
- Range: $61 - $71

---

## 🔔 NOTIFICATION SYSTEM

### Real-time Updates
- **Option 1**: Polling (simpler)
  - Poll `/api/notifications` every 30 seconds
  - Update badge count
  - Show toast notification for new requests

- **Option 2**: WebSocket (more complex, better UX)
  - Set up WebSocket connection
  - Push notifications in real-time
  - Update UI immediately

**Recommendation**: Start with polling, upgrade to WebSocket later if needed.

### Notification Data
```typescript
{
  id: string
  type: 'QUOTE_REQUEST'
  loadRequestId: string
  shipperName: string
  distance: number
  suggestedRate: number
  createdAt: Date
  read: boolean
}
```

---

## 🧪 TESTING SCENARIOS

### Test Cases
1. **Email with clear addresses**
   - Subject: "Need courier service"
   - Body: "Pickup: 123 Main St, City, State 12345. Deliver to: 456 Oak Ave, City, State 12345. Need STAT service."
   - Expected: Parse addresses, calculate distance, create load

2. **Email with ambiguous addresses**
   - Body: "Need to pick up from downtown clinic and deliver to hospital"
   - Expected: Create load, mark for manual review

3. **Email from existing shipper**
   - From: existing-shipper@email.com
   - Expected: Link to existing Shipper record

4. **Email from new shipper**
   - From: new-company@email.com
   - Expected: Create new Shipper, link load

5. **Rate calculation**
   - Distance: 10 miles, STAT service
   - Expected: Calculate rate correctly, show range

6. **Dashboard notification**
   - New email received
   - Expected: Show in dashboard, update badge count

---

## ⚠️ IMPORTANT NOTES

### Error Handling
- If email parsing fails: Create load with status QUOTE_REQUESTED, mark for manual review
- If geocoding fails: Create load, admin can manually geocode
- If distance calculation fails: Create load, admin can manually calculate
- Always create the load, even if some steps fail

### Backward Compatibility
- Existing web form must continue to work
- Existing loads must not be affected
- All existing functionality must remain intact
- Email system is additive, not replacement

### Data Validation
- Validate email format
- Validate addresses before geocoding
- Validate distance/rate calculations
- Sanitize email content before storing

### Security
- Verify webhook signature from Resend
- Validate email sender (optional: whitelist)
- Sanitize email content
- Rate limit webhook endpoint

---

## 📋 CHECKLIST

Before starting implementation:
- [ ] Checkout correct branch: `claude/build-shipperbridge-portal-01Y9eA9nJsDkqCrrkAk8CXoF`
- [ ] Verify working tree is clean
- [ ] Review current codebase structure
- [ ] Understand existing LoadRequest flow

During implementation:
- [ ] Follow file structure exactly as specified
- [ ] Maintain backward compatibility
- [ ] Add proper error handling
- [ ] Add TypeScript types for all new code
- [ ] Test each component as you build

After implementation:
- [ ] Run database migration
- [ ] Generate Prisma client
- [ ] Test email webhook
- [ ] Test complete workflow
- [ ] Verify no breaking changes
- [ ] Commit and push to branch

---

## 🚨 CRITICAL REMINDERS

1. **Work ONLY on specified branch** - Do not create new branches
2. **Do not remove existing functionality** - Email system is additive
3. **Maintain TypeScript types** - All new code must be typed
4. **Test thoroughly** - Email parsing can be tricky
5. **Handle errors gracefully** - Always create load, even if parsing fails
6. **Keep code clean** - Follow existing code style
7. **Document complex logic** - Especially address parsing

---

## 📞 SUPPORT INFORMATION

### Current System Capabilities
- Authentication: Custom hooks (useDriverAuth, useShipperAuth, useAdminAuth)
- Storage: Type-safe localStorage utilities (lib/storage.ts)
- Constants: Centralized in lib/constants.ts
- Email: Resend configured in lib/email.ts
- Database: Prisma with SQLite (dev) / PostgreSQL (prod)

### Key Files to Reference
- `lib/types.ts` - All TypeScript types
- `lib/constants.ts` - All constants
- `app/api/load-requests/route.ts` - Current load creation logic
- `prisma/schema.prisma` - Database schema

---

## ✅ FINAL CHECKLIST BEFORE STARTING

- [ ] On correct branch: `claude/build-shipperbridge-portal-01Y9eA9nJsDkqCrrkAk8CXoF`
- [ ] Working tree is clean
- [ ] Understand the requirements
- [ ] Have access to Google Maps API key
- [ ] Have Resend account configured
- [ ] Ready to implement step by step

---

**END OF IMPLEMENTATION BRIEF**

This document contains everything needed to implement the email-based passive notification system. Follow the steps in order, test thoroughly, and maintain backward compatibility throughout.

