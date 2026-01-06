# MED DROP - Complete Workflow & Feature Documentation

**Version:** 1.0  
**Last Updated:** Current  
**Purpose:** Comprehensive documentation of all features, functions, workflows, and technical implementation for gap analysis

---

## TABLE OF CONTENTS

1. [System Overview](#system-overview)
2. [User Types & Access Levels](#user-types--access-levels)
3. [Authentication & Authorization](#authentication--authorization)
4. [Complete Load Lifecycle Workflow](#complete-load-lifecycle-workflow)
5. [Public-Facing Features](#public-facing-features)
6. [Shipper Portal Features](#shipper-portal-features)
7. [Driver Portal Features](#driver-portal-features)
8. [Admin/Staff Portal Features](#adminstaff-portal-features)
9. [Compliance & Medical Features](#compliance--medical-features)
10. [Billing & Invoice System](#billing--invoice-system)
11. [API Endpoints Reference](#api-endpoints-reference)
12. [Database Schema & Models](#database-schema--models)
13. [Email Notifications](#email-notifications)
14. [Document Management](#document-management)
15. [Tracking & Chain of Custody](#tracking--chain-of-custody)
16. [Technical Implementation Details](#technical-implementation-details)
17. [Known Gaps & Future Enhancements](#known-gaps--future-enhancements)

---

## SYSTEM OVERVIEW

**MED DROP** is a comprehensive medical courier management platform built with Next.js 14, TypeScript, Prisma ORM, and Tailwind CSS. The system manages the complete lifecycle of medical courier requests from initial request through delivery, billing, and compliance tracking.

### Core Technologies
- **Frontend:** Next.js 14 (App Router), React, TypeScript
- **Backend:** Next.js API Routes, Prisma ORM
- **Database:** SQLite (development), PostgreSQL-ready (production)
- **Authentication:** Email/password with bcryptjs hashing
- **Styling:** Tailwind CSS with custom glassmorphism design
- **Document Storage:** Base64 encoding in database (can migrate to S3/Cloud Storage)
- **PDF Generation:** jsPDF + jspdf-autotable for invoice generation

---

## USER TYPES & ACCESS LEVELS

### 1. **PUBLIC USER (Unauthenticated)**
- **Access:** Homepage, public load request form, public tracking
- **Limitations:** Cannot view shipper portal, cannot manage loads
- **Actions:** Submit load requests, track shipments by tracking code

### 2. **SHIPPER (Authenticated Client)**
- **Access Level:** Shipper Portal
- **Permissions:**
  - View own load requests only
  - Accept/reject quotes
  - Track own shipments
  - View and upload documents for own loads
  - Manage profile and billing information
  - View invoices and payment history
  - Request new loads
  - View saved facilities

### 3. **DRIVER (Authenticated Courier)**
- **Access Level:** Driver Portal
- **Permissions:**
  - View all available loads (shared load board)
  - Accept loads assigned to them
  - Update load status (pickup, in-transit, delivery)
  - Capture digital signatures
  - Record temperatures
  - Upload documents (POD, BOL, etc.)
  - View earnings and completed loads
  - Manage profile and vehicle information
  - Update payment settings

### 4. **ADMIN/STAFF (Authenticated Internal User)**
- **Access Level:** Admin Portal
- **Permissions:**
  - View all loads (all shippers, all statuses)
  - Set quotes for load requests
  - Assign drivers to loads (optional - drivers can also self-accept)
  - Update load statuses
  - Create tracking events
  - Generate invoices for completed loads
  - View all shippers and facilities
  - View all drivers
  - Override document locks
  - Full system visibility

---

## AUTHENTICATION & AUTHORIZATION

### Authentication Methods

#### 1. **Shipper Authentication**
- **Login Route:** `/shipper/login`
- **API Endpoint:** `POST /api/auth/shipper/login`
- **Method:** Email + password
- **Session:** localStorage (temporary, needs httpOnly cookies for production)
- **Signup:** `/shipper/signup` → `POST /api/auth/shipper/signup`
- **Password Verification:** `POST /api/auth/shipper/verify-password`
- **Password Change:** `PATCH /api/shippers/[id]/password`

#### 2. **Driver Authentication**
- **Login Route:** `/driver/login`
- **API Endpoint:** `POST /api/auth/driver/login`
- **Method:** Email + password
- **Session:** localStorage
- **Signup:** `/driver/signup` → `POST /api/auth/driver/signup`
- **Password Verification:** `POST /api/auth/driver/verify-password`
- **Password Change:** `PATCH /api/drivers/[id]/password`

#### 3. **Admin/Staff Authentication**
- **Login Route:** `/admin/login`
- **API Endpoint:** `POST /api/auth/admin/login`
- **Method:** Email + password
- **Session:** localStorage
- **User Model:** Separate `User` model (not Driver or Shipper)
- **Roles:** ADMIN, DISPATCHER, VIEW_ONLY (defined but not enforced in UI)

### Authorization & Route Protection

#### Layout-Based Protection
- **Shipper Layout:** `app/shipper/layout.tsx` - Checks localStorage for 'shipper', redirects to login
- **Driver Layout:** `app/driver/layout.tsx` - Checks localStorage for 'driver', redirects to login
- **Admin Layout:** `app/admin/layout.tsx` - Checks localStorage for 'admin', redirects to login

#### Public Routes (No Auth Required)
- `/` - Homepage
- `/request-load` - Public load request form
- `/track` - Public tracking search
- `/track/[code]` - Public tracking detail
- `/shipper/signup` - Shipper registration
- `/driver/signup` - Driver registration
- All login pages

---

## COMPLETE LOAD LIFECYCLE WORKFLOW

### Phase 1: Request Creation

#### Option A: Public Form (`/request-load`)
1. User fills out comprehensive load request form
2. Form includes:
   - Company information (auto-creates Shipper if email not found)
   - Pickup facility details (address, contact, access notes)
   - Dropoff facility details
   - Service type (STAT, SAME_DAY, SCHEDULED_ROUTE, OVERFLOW, GOVERNMENT)
   - Commodity description
   - Specimen category (UN3373, non-specimen, pharmaceutical, other)
   - Temperature requirement (ambient, refrigerated, frozen, other)
   - Timing (ready time, delivery deadline)
   - Container count, weight, declared value
3. **API:** `POST /api/load-requests`
4. **Backend Actions:**
   - Generates unique tracking code (MED-XXXX-YY format)
   - Creates or finds Shipper by email
   - Creates Facility records for pickup/dropoff
   - Creates LoadRequest with status `NEW`
   - Creates initial tracking event `REQUEST_RECEIVED`
   - Sends notification email to admin (if configured)
5. **Response:** Redirects to `/request-load/success` with tracking code

#### Option B: Authenticated Shipper Portal (`/shipper/request-load`)
1. Same form as public, but pre-populated with shipper info
2. Automatically associates with logged-in shipper (no email lookup)
3. Can select from saved facilities (future enhancement)

### Phase 2: Quote & Acceptance

#### Admin Quote Creation
1. Admin views load in `/admin/loads/[id]`
2. Admin enters quote amount and notes
3. Admin clicks "Send Quote"
4. **API:** `PATCH /api/load-requests/[id]` - Updates `quoteAmount`, `quoteNotes`, sets status to `QUOTED`
5. **Backend Actions:**
   - Updates LoadRequest
   - Creates tracking event `PRICE_QUOTED`
   - Sends email notification to shipper (quote ready)

#### Shipper Quote Acceptance
1. Shipper views load in `/shipper/loads/[id]`
2. Shipper sees quote amount and notes
3. Shipper clicks "Accept Quote"
4. **API:** `POST /api/load-requests/[id]/accept-quote`
5. **Backend Actions:**
   - Sets status to `QUOTE_ACCEPTED`
   - Sets `quoteAcceptedAt` timestamp
   - Creates tracking event `SHIPPER_CONFIRMED`
   - Load appears on driver load board

### Phase 3: Driver Assignment (Optional)

#### Option A: Driver Self-Acceptance (Current Default)
1. Driver views Load Board (`/driver/dashboard`)
2. Driver sees all loads with status `NEW`, `QUOTED`, or `QUOTE_ACCEPTED`
3. Driver clicks "Accept Load" on desired load
4. **API:** `POST /api/load-requests/[id]/accept`
5. **Backend Actions:**
   - Sets `driverId` to current driver
   - Sets `acceptedByDriverAt` timestamp
   - Sets status to `SCHEDULED`
   - Creates tracking event with driver info

#### Option B: Admin Assignment (Available)
1. Admin views load in `/admin/loads/[id]`
2. Admin selects driver from dropdown
3. Admin clicks "Assign Driver"
4. **API:** `POST /api/load-requests/[id]/assign-driver`
5. **Backend Actions:**
   - Sets `driverId` and `assignedAt`
   - Sets status to `SCHEDULED`
   - Creates tracking event `DRIVER_EN_ROUTE_PICKUP`
   - Driver can still accept to confirm

### Phase 4: Pickup Execution

#### Driver Actions at Pickup Location
1. Driver navigates to `/driver/loads/[id]`
2. Driver sees pickup facility details (address, contact, access notes)
3. Driver captures pickup signature using SignatureCapture component
4. Driver enters pickup temperature
5. Driver checks attestation checkbox ("I confirm item was sealed and intact")
6. Driver clicks "Confirm Pickup"
7. **API:** `PATCH /api/load-requests/[id]`
8. **Backend Actions:**
   - Updates `pickupSignature` (base64 PNG)
   - Updates `pickupSignerName`
   - Updates `pickupTemperature`
   - Sets `pickupAttested` = true, `pickupAttestedAt`
   - Sets `actualPickupTime` = now
   - Sets status to `PICKED_UP`
   - Creates tracking event `PICKED_UP`
   - Checks temperature against min/max (sets exception flags if out of range)
   - Sends email notification to shipper

#### Temperature Exception Handling
- If temperature outside `temperatureMin`/`temperatureMax` range:
  - Sets `pickupTempException` = true
  - Driver can add `pickupTempExceptionNotes`
- System records exception for compliance

#### Signature Failure Fallback
- If signature capture unavailable:
  - Driver selects reason: `DEVICE_ISSUE`, `SIGNER_UNAVAILABLE`, `OTHER`
  - Records `pickupSignatureUnavailableReason`
  - Driver can upload photo fallback: `pickupPhotoFallbackUrl`
  - Admin can review and override if needed

### Phase 5: In-Transit Status

#### Manual Status Update (Driver or Admin)
1. Driver or Admin updates status to `IN_TRANSIT`
2. **API:** `PATCH /api/load-requests/[id]/status`
3. **Backend Actions:**
   - Updates status
   - Creates tracking event `IN_TRANSIT`
   - Sends email notification

### Phase 6: Delivery Execution

#### Driver Actions at Delivery Location
1. Driver navigates to `/driver/loads/[id]`
2. Driver sees dropoff facility details
3. Driver captures delivery signature
4. Driver enters delivery temperature
5. Driver checks attestation checkbox
6. Driver clicks "Confirm Delivery"
7. **API:** `PATCH /api/load-requests/[id]`
8. **Backend Actions:**
   - Updates `deliverySignature`, `deliverySignerName`
   - Updates `deliveryTemperature`
   - Sets `deliveryAttested` = true, `deliveryAttestedAt`
   - Sets `actualDeliveryTime` = now
   - Sets status to `DELIVERED`
   - Creates tracking event `DELIVERED`
   - Checks temperature exceptions
   - **LOCKS ALL DOCUMENTS** (`isLocked` = true on Document model)
   - Sends email notification to shipper

### Phase 7: Document Upload & POD

#### Driver Document Upload (Pre-Delivery)
1. Driver navigates to load detail page
2. Driver clicks "Upload Document"
3. Driver selects file (PDF, image)
4. Driver enters title and document type (PROOF_OF_PICKUP, BILL_OF_LADING, OTHER)
5. **API:** `POST /api/load-requests/[id]/documents`
6. **Backend Actions:**
   - Converts file to base64
   - Stores in Document model
   - Sets `uploadedBy` = "driver"
   - Sends email notification to shipper with document link
   - If load is `DELIVERED`, requires admin override

#### Driver Document Upload (Post-Delivery)
- If load status is `DELIVERED`:
  - Document upload requires admin override
  - Admin must provide `adminOverrideNotes` (audit log)
  - Sets `adminOverride` = true, `adminOverrideBy`

#### Shipper Document Upload
1. Shipper views load in `/shipper/loads/[id]`
2. Shipper can upload documents (fallback if tech issues)
3. Same API endpoint, but `uploadedBy` = "shipper"
4. No locking restrictions (shippers can add documents anytime)

### Phase 8: Completion & Invoice Generation

#### Status Completion
1. Admin or system sets status to `COMPLETED` (after all docs received)
2. **API:** `PATCH /api/load-requests/[id]/status`
3. Load appears in "Completed" filter

#### Invoice Generation (Admin)
1. Admin views completed load in `/admin/loads/[id]`
2. Admin clicks "Generate Invoice" (only visible for `DELIVERED` or `COMPLETED`)
3. **API:** `POST /api/invoices`
4. **Backend Actions:**
   - Generates invoice number (INV-YYYY-XXX format)
   - Calculates `dueDate` based on shipper's `paymentTerms` (NET_7, NET_14, NET_30)
   - Links load to invoice (`invoiceId` on LoadRequest)
   - Sets `invoicedAt` timestamp
   - Creates Invoice with status `DRAFT`
   - Admin can then mark as `SENT` and email PDF

#### Invoice PDF Generation
1. Admin or Shipper views invoice
2. Clicks "Download PDF"
3. **API:** `GET /api/invoices/[id]/pdf`
4. **Backend Actions:**
   - Generates PDF using jsPDF + jspdf-autotable
   - Includes invoice number, dates, shipper details, billing address
   - Lists all loads on invoice (if multiple)
   - Shows amounts, taxes, totals
   - Returns PDF blob for download

---

## PUBLIC-FACING FEATURES

### Homepage (`/`)
- **Features:**
  - Hero section with "Join as Shipper" and "Join as Driver" CTAs
  - Stats display (placeholder)
  - Benefits sections for shippers and drivers
  - Navigation to signup/login pages
  - Responsive design with glassmorphism effects

### Public Load Request (`/request-load`)
- **Features:**
  - Comprehensive form with all load details
  - Auto-creates shipper account if email not found
  - Creates facilities automatically
  - Generates tracking code immediately
  - Redirects to success page with tracking code

### Public Tracking (`/track`)
- **Features:**
  - Simple tracking code search form
  - Redirects to detail page

### Public Tracking Detail (`/track/[code]`)
- **Features:**
  - Shows load details (if tracking code valid)
  - Displays tracking timeline with all events
  - Shows current status
  - Shows route (pickup → delivery)
  - No authentication required

---

## SHIPPER PORTAL FEATURES

### Layout & Navigation (`/shipper/layout.tsx`)
- **Features:**
  - Fixed header with logo, notifications, profile dropdown
  - Fixed sidebar with navigation items
  - Profile dropdown: Account Settings, Billing & Payments, Security, Logout
  - Sidebar: My Loads, New Request, Saved Facilities, Tracking, Documents, Invoices, Support
  - Authentication protection (redirects to login if not authenticated)

### My Loads (`/shipper/dashboard`)
- **Features:**
  - Shows all loads for logged-in shipper
  - Stats cards: Total Loads, Active, Pending Quote, Completed
  - Load cards with:
    - Tracking code, status, quote amount
    - Pickup/dropoff locations
    - Ready time and deadline
    - Quick actions (View Details)
  - Filter by status
  - Search by tracking code, commodity, facility

### Load Detail (`/shipper/loads/[id]`)
- **Features:**
  - Complete load information display
  - Status badge and timeline
  - Route visualization (pickup → delivery)
  - Quote display with accept/reject button
  - Tracking events timeline
  - Documents section (view all documents, upload new)
  - Driver information (if assigned)
  - Compliance data:
    - Signatures (pickup/delivery)
    - Temperatures (pickup/delivery)
    - Temperature exceptions (if any)
    - Driver attestations
    - Signature unavailable reasons (if any)
  - Public tracking link (for sharing)

### New Request (`/shipper/request-load`)
- **Features:**
  - Same form as public request
  - Pre-populated with shipper information
  - Automatically associates with logged-in shipper
  - Future: Select from saved facilities

### Tracking (`/shipper/tracking`)
- **Features:**
  - Tracking code search form
  - Redirects to public tracking detail page

### Saved Facilities (`/shipper/facilities`)
- **Status:** Placeholder page (future enhancement)
- **Planned:** List of saved facilities, quick-add to new requests

### Documents (`/shipper/documents`)
- **Features:**
  - Aggregate view of all documents across all loads
  - Filter by load, document type
  - Download/view documents
  - Upload new documents (for own records)

### Invoices (`/shipper/invoices`)
- **Features:**
  - List of all invoices for logged-in shipper
  - Filter by status (Draft, Sent, Paid, Overdue)
  - Search by invoice number
  - View invoice details
  - Download PDF
  - Payment status tracking

### Profile (`/shipper/profile`)
- **Features:**
  - View/edit company name, contact name, email, phone
  - Payment terms display (read-only, edit in Billing)
  - Save changes

### Billing & Payments (`/shipper/billing`)
- **Features:**
  - Payment terms selection (NET_7, NET_14, NET_30, INVOICE_ONLY)
  - Billing contact information
  - Billing address (full address fields)
  - Stripe customer ID (optional, for ACH invoicing)

### Security (`/shipper/security`)
- **Features:**
  - Password change form
  - Requires current password verification
  - New password confirmation

### Notifications (`/shipper/notifications`)
- **Status:** Placeholder page
- **Planned:** In-app notifications for load updates, quotes, etc.

### Support (`/shipper/support`)
- **Status:** Placeholder page
- **Planned:** Support ticket system or contact form

---

## DRIVER PORTAL FEATURES

### Layout & Navigation (`/driver/layout.tsx`)
- **Features:**
  - Fixed header with logo, notifications, profile dropdown
  - Fixed sidebar with navigation items
  - Profile dropdown: Profile Settings, Vehicle Information, Payment & Payouts, Security, Logout
  - Sidebar: Load Board, Documents, Earnings, Support
  - Authentication protection

### Load Board (`/driver/dashboard`)
- **Features:**
  - **Tabs:**
    - "All Loads" - Shows all available loads (shared load board)
    - "My Loads" - Shows only loads accepted by current driver
  - **Stats Cards:**
    - Driver name, vehicle type, status
    - Total loads, my loads, active loads
  - **Filter Options:**
    - Search: By tracking code, city, state, commodity
    - Filter: By status (New, Quoted/Accepted, Scheduled, Picked Up, In Transit)
    - Sort: Newest, Oldest, Ready Time, Deadline, Status, Amount
  - **Load Cards:**
    - Tracking code, status, quote amount
    - Pickup/dropoff locations
    - "Accept Load" button (for unassigned loads)
    - "My Load" badge (for accepted loads)
    - Enhanced info for "My Loads" tab:
      - Signature status (pickup/delivery ✓)
      - Temperature readings
      - Document count
      - Tracking events count
      - Actual pickup/delivery timestamps
  - Click load card to view details

### Load Detail (`/driver/loads/[id]`)
- **Features:**
  - Complete load information
  - Route visualization
  - Quick action buttons:
    - "Confirm Pickup" (if status allows)
    - "Confirm Delivery" (if status allows)
  - **Pickup Section:**
    - Facility details (name, address, contact)
    - Access notes
    - Signature capture component
    - Temperature input
    - Temperature min/max display (with exception flags)
    - Attestation checkbox
    - Signature unavailable options (if needed)
    - Photo fallback upload (if signature unavailable)
  - **Delivery Section:**
    - Same as pickup
    - Temperature exception notes
  - **Document Upload Section:**
    - List of existing documents
    - Upload new document (file, title, type)
    - View/download documents
  - **Tracking Timeline:**
    - All tracking events with timestamps
    - Chain-of-custody actor information

### Documents (`/driver/documents`)
- **Features:**
  - Aggregate view of all documents for all driver's loads
  - Filter by load, document type
  - View/download documents
  - See upload date and type

### Earnings (`/driver/earnings`)
- **Features:**
  - Earnings overview:
    - Total earnings
    - This month
    - This year
    - Completed loads count
  - Completed loads list:
    - Tracking code, date, amount
    - Status (Completed, Pending Payment)
    - Filter: All Completed, Completed, Pending Payment

### Profile Settings (`/driver/profile`)
- **Features:**
  - Personal information: Name, email, phone
  - License number, license expiry
  - Emergency contact information
  - Save changes

### Vehicle Information (`/driver/vehicle`)
- **Features:**
  - Vehicle type, make, model, year
  - License plate
  - Refrigeration capability
  - Save changes

### Payment & Payouts (`/driver/payments`)
- **Features:**
  - **Tabs:**
    - Payment Settings: Bank account, payout frequency, minimum payout
    - Tax Information: Tax ID, W-9 status
    - Payout History: Placeholder (future enhancement)
  - Save payment settings

### Security (`/driver/security`)
- **Features:**
  - Password change form
  - Requires current password verification

### Notifications (`/driver/notifications`)
- **Status:** Placeholder page

### Support (`/driver/support`)
- **Status:** Placeholder page

---

## ADMIN/STAFF PORTAL FEATURES

### Layout & Navigation (`/admin/layout.tsx`)
- **Features:**
  - Fixed header with admin name, role, logout
  - Sidebar: All Loads, Shippers, Invoices
  - Authentication protection

### All Loads (`/admin/loads`)
- **Features:**
  - List of ALL loads (all shippers, all statuses)
  - Filter by status, shipper, date range
  - Search by tracking code
  - Load cards with quick info
  - Click to view details

### Load Detail (`/admin/loads/[id]`)
- **Features:**
  - Complete load information (read/write)
  - **Quote Management:**
    - Enter quote amount and notes
    - Send quote to shipper
  - **Driver Assignment:**
    - Select driver from dropdown
    - Assign driver
  - **Status Updates:**
    - Manual status change dropdown
    - Create custom tracking events
  - **Invoice Generation:**
    - "Generate Invoice" button (for DELIVERED/COMPLETED loads)
    - Opens invoice creation modal
  - **Compliance Data:**
    - View all signatures
    - View temperatures and exceptions
    - View driver attestations
    - View chain-of-custody events
  - **Documents:**
    - View all documents
    - Override document locks if needed (with notes)

### Shippers (`/admin/shippers`)
- **Features:**
  - List of all shipper companies
  - View shipper details
  - View all loads for shipper
  - View payment terms and billing info

### Invoices (`/admin/invoices`)
- **Features:**
  - List of all invoices
  - Filter by status, shipper, date
  - Search by invoice number
  - View invoice details
  - Mark as sent/paid
  - Download PDF
  - Add payment details (method, reference)

---

## COMPLIANCE & MEDICAL FEATURES

### Chain-of-Custody Assertion
- **Implementation:**
  - Every tracking event records:
    - `actorId` - Driver ID or User ID who performed action
    - `actorType` - "DRIVER", "SHIPPER", "ADMIN", "SYSTEM"
    - `createdAt` - Precise timestamp
    - `locationText` - Optional location info
  - System enforces linear custody progression (cannot skip statuses)
  - Displayed in tracking timeline with actor information

### Temperature Exception Handling
- **Implementation:**
  - Each load can have `temperatureMin` and `temperatureMax` (optional)
  - When driver records temperature:
    - System automatically checks if outside range
    - Sets `pickupTempException` or `deliveryTempException` = true
    - Driver can add exception notes (`pickupTempExceptionNotes`, `deliveryTempExceptionNotes`)
  - Displayed prominently in shipper and admin views

### Driver Attestation
- **Implementation:**
  - Checkbox at pickup: "I confirm this item was sealed and intact at transfer"
  - Checkbox at delivery: "I confirm this item was sealed and intact at transfer"
  - Stored as `pickupAttested`, `pickupAttestedAt`, `deliveryAttested`, `deliveryAttestedAt`
  - Timestamped and linked to driver ID
  - Displayed in compliance sections

### POD Locking (Post-Delivery Document Protection)
- **Implementation:**
  - When load status changes to `DELIVERED`:
    - All documents for that load are set to `isLocked` = true
    - `lockedAt` timestamp recorded
  - Locked documents:
    - Cannot be edited or deleted
    - New uploads require admin override
  - Admin override:
    - Admin must set `adminOverride` = true
    - Must provide `adminOverrideBy` (admin user ID)
    - Must provide `adminOverrideNotes` (audit log reason)
  - Prevents post-hoc manipulation accusations

### Load-to-Invoice Linking
- **Implementation:**
  - When invoice is generated:
    - `invoiceId` is set on LoadRequest
    - `invoicedAt` timestamp recorded
  - Invoice can contain multiple loads
    - Invoice model has `loadRequests` relation (one-to-many)
  - Enables billing completeness tracking
  - Easy dispute resolution (load → invoice link)

### Signature Failure Fallback
- **Implementation:**
  - If signature cannot be captured:
    - Driver selects reason: `DEVICE_ISSUE`, `SIGNER_UNAVAILABLE`, `TECHNICAL_ERROR`, `OTHER`
    - Stored in `pickupSignatureUnavailableReason` or `deliverySignatureUnavailableReason`
    - Driver can upload photo fallback: `pickupPhotoFallbackUrl` or `deliveryPhotoFallbackUrl`
    - Admin can review and add notes
  - Ensures real-world issues are logged and auditable

### Data Retention Policy
- **Documentation:** `docs/DATA_RETENTION_POLICY.md`
- **Policy:**
  - POD documents and signatures retained for 7 years
  - Exportable on request
  - HIPAA considerations documented
  - Technical enforcement (deletion prevention) - future enhancement

---

## BILLING & INVOICE SYSTEM

### Payment Terms (Per Shipper)
- **Options:** NET_7, NET_14, NET_30, INVOICE_ONLY
- **Storage:** `Shipper.paymentTerms` field
- **Usage:** Calculates invoice `dueDate` when invoice is created

### Invoice Creation Flow
1. Admin views completed load
2. Clicks "Generate Invoice"
3. **API:** `POST /api/invoices`
4. **Backend:**
   - Generates invoice number (INV-YYYY-XXX)
   - Calculates `dueDate` from shipper's `paymentTerms`
   - Creates Invoice with status `DRAFT`
   - Links load to invoice (`invoiceId`, `invoicedAt`)
5. Admin can:
   - Review invoice
   - Mark as `SENT` (sets `sentAt`)
   - Email PDF to shipper (future)
   - Download PDF

### Invoice Statuses
- **DRAFT** - Created but not sent
- **SENT** - Emailed to shipper
- **PAID** - Payment received (sets `paidAt`, `paymentMethod`, `paymentReference`)
- **OVERDUE** - Past due date, not paid
- **CANCELLED** - Invoice cancelled

### Payment Tracking
- **No Online Payment Processing:**
  - System tracks payment status only
  - Payments processed offline (ACH, check, wire)
  - Admin manually updates invoice status to PAID
  - Admin records payment method and reference
- **Optional Stripe Integration (Future):**
  - Stripe ACH invoicing only (no cards)
  - Fully optional per client
  - `stripeInvoiceId` stored as secondary reference
  - `stripeCustomerId` stored on Shipper (optional)

### Invoice PDF Generation
- **Technology:** jsPDF + jspdf-autotable
- **Content:**
  - Invoice number, dates (invoice date, due date)
  - Shipper billing address
  - Line items (loads with tracking codes, dates, amounts)
  - Subtotals, taxes, totals
  - Payment terms
  - Notes

### Billing Address Management
- Shipper can set billing address separately from facility addresses
- Fields: Contact name, email, address line 1/2, city, state, postal code
- Used for invoice PDF generation

---

## API ENDPOINTS REFERENCE

### Authentication Endpoints

#### Shipper Auth
- `POST /api/auth/shipper/login` - Shipper login
- `POST /api/auth/shipper/signup` - Shipper registration
- `POST /api/auth/shipper/verify-password` - Verify current password

#### Driver Auth
- `POST /api/auth/driver/login` - Driver login
- `POST /api/auth/driver/signup` - Driver registration
- `POST /api/auth/driver/verify-password` - Verify current password

#### Admin Auth
- `POST /api/auth/admin/login` - Admin login

### Load Request Endpoints

- `POST /api/load-requests` - Create new load request
- `GET /api/load-requests/[id]` - Get single load with all relations
- `PATCH /api/load-requests/[id]` - Update load (signatures, temps, etc.)
- `PATCH /api/load-requests/[id]/status` - Update load status and create tracking event
- `POST /api/load-requests/[id]/accept-quote` - Shipper accepts quote
- `POST /api/load-requests/[id]/accept` - Driver accepts load
- `POST /api/load-requests/[id]/assign-driver` - Admin assigns driver
- `GET /api/load-requests/[id]/documents` - Get all documents for load
- `POST /api/load-requests/[id]/documents` - Upload document to load

### Driver Endpoints

- `GET /api/drivers` - Get all drivers (filter by status)
- `GET /api/drivers/[id]` - Get driver details
- `PATCH /api/drivers/[id]` - Update driver profile
- `GET /api/drivers/[id]/loads` - Get all loads (shared load board)
- `GET /api/drivers/[id]/my-loads` - Get driver's accepted loads only
- `GET /api/drivers/[id]/documents` - Get all documents for driver's loads
- `PATCH /api/drivers/[id]/password` - Change driver password
- `GET /api/drivers/[id]/payment-settings` - Get payment settings
- `PATCH /api/drivers/[id]/payment-settings` - Update payment settings

### Shipper Endpoints

- `GET /api/shippers/[id]` - Get shipper details
- `PATCH /api/shippers/[id]` - Update shipper profile/billing
- `GET /api/shippers/[id]/loads` - Get all loads for shipper
- `GET /api/shippers/[id]/documents` - Get all documents for shipper's loads
- `PATCH /api/shippers/[id]/password` - Change shipper password

### Invoice Endpoints

- `POST /api/invoices` - Create new invoice
- `GET /api/invoices/[id]` - Get invoice details
- `PATCH /api/invoices/[id]` - Update invoice (status, payment info)
- `GET /api/invoices/[id]/pdf` - Download invoice PDF

---

## DATABASE SCHEMA & MODELS

### Core Models

#### Shipper
- **Purpose:** Client companies requesting services
- **Key Fields:**
  - Company info: `companyName`, `clientType`, `contactName`, `phone`, `email`
  - Auth: `passwordHash`
  - Billing: `paymentTerms`, `billingContactName`, `billingContactEmail`, `billingAddress*`, `stripeCustomerId`
- **Relations:** facilities, loadRequests, invoices

#### Facility
- **Purpose:** Pickup/dropoff locations
- **Key Fields:**
  - Address: `addressLine1`, `addressLine2`, `city`, `state`, `postalCode`
  - Contact: `contactName`, `contactPhone`
  - Metadata: `facilityType`, `defaultAccessNotes`
- **Relations:** shipper, pickupLoadRequests, dropoffLoadRequests

#### LoadRequest
- **Purpose:** Main courier job entity
- **Key Fields:**
  - Tracking: `publicTrackingCode` (unique)
  - Service: `serviceType`, `commodityDescription`, `specimenCategory`, `temperatureRequirement`
  - Timing: `readyTime`, `deliveryDeadline`, `actualPickupTime`, `actualDeliveryTime`
  - Status: `status` (LoadStatus enum)
  - Driver: `driverId`, `assignedAt`, `acceptedByDriverAt`
  - Signatures: `pickupSignature`, `pickupSignerName`, `deliverySignature`, `deliverySignerName`
  - Attestations: `pickupAttested`, `pickupAttestedAt`, `deliveryAttested`, `deliveryAttestedAt`
  - Temperatures: `pickupTemperature`, `deliveryTemperature`, `temperatureMin`, `temperatureMax`, exception flags/notes
  - Signatures fallback: `pickupSignatureUnavailableReason`, `pickupPhotoFallbackUrl`, etc.
  - Pricing: `quoteAmount`, `quoteCurrency`, `quoteNotes`, `quoteAcceptedAt`
  - Invoice: `invoiceId`, `invoicedAt`
- **Relations:** shipper, pickupFacility, dropoffFacility, driver, invoice, trackingEvents, documents

#### TrackingEvent
- **Purpose:** Chain-of-custody and status tracking
- **Key Fields:**
  - Event: `code` (TrackingEventCode enum), `label`, `description`
  - Chain-of-custody: `actorId`, `actorType`, `locationText`
  - Location: `latitude`, `longitude` (optional GPS)
  - Timestamp: `createdAt`
- **Relations:** loadRequest

#### Document
- **Purpose:** Proof documents (POD, BOL, etc.)
- **Key Fields:**
  - Document: `type` (DocumentType enum), `title`, `url` (base64 or URL), `mimeType`, `fileSize`
  - Upload: `uploadedBy` (user ID or "driver"/"shipper")
  - Locking: `isLocked`, `lockedAt`, `adminOverride`, `adminOverrideBy`, `adminOverrideNotes`
- **Relations:** loadRequest

#### Invoice
- **Purpose:** Billing invoices
- **Key Fields:**
  - Invoice: `invoiceNumber` (unique), `invoiceDate`, `dueDate`
  - Amounts: `subtotal`, `tax`, `total`
  - Status: `status` (DRAFT, SENT, PAID, OVERDUE, CANCELLED)
  - Payment: `sentAt`, `paidAt`, `paymentMethod`, `paymentReference`, `notes`
  - Stripe: `stripeInvoiceId` (optional)
- **Relations:** shipper, loadRequests (one-to-many)

#### Driver
- **Purpose:** Courier drivers
- **Key Fields:**
  - Personal: `firstName`, `lastName`, `email`, `phone`, `passwordHash`
  - License: `licenseNumber`, `licenseExpiry`
  - Status: `status` (DriverStatus enum)
  - Vehicle: `vehicleType`, `vehicleMake`, `vehicleModel`, `vehicleYear`, `vehiclePlate`, `hasRefrigeration`
  - Certifications: `un3373Certified`, `un3373ExpiryDate`, `hipaaTrainingDate`
  - Employment: `hiredDate`, `emergencyContact`, `emergencyPhone`
  - Payment: `paymentMethod`, `bankName`, `accountHolderName`, `routingNumber`, `accountNumber`, `accountType`, `payoutFrequency`, `minimumPayout`, `taxId`, `taxIdType`, `w9Submitted`
- **Relations:** loadRequests

#### User
- **Purpose:** Internal admin/staff users
- **Key Fields:**
  - Personal: `name`, `email`, `passwordHash`
  - Role: `role` (ADMIN, DISPATCHER, VIEW_ONLY)

### Enums (Stored as Strings for SQLite Compatibility)

- **ClientType:** INDEPENDENT_PHARMACY, CLINIC, LAB, DIALYSIS_CENTER, IMAGING_CENTER, HOSPITAL, GOVERNMENT, OTHER
- **FacilityType:** CLINIC, LAB, HOSPITAL, PHARMACY, DIALYSIS, IMAGING, GOVERNMENT, OTHER
- **ServiceType:** STAT, SAME_DAY, SCHEDULED_ROUTE, OVERFLOW, GOVERNMENT
- **SpecimenCategory:** UN3373_CATEGORY_B, NON_SPECIMEN_MEDICAL, PHARMACEUTICAL_NON_CONTROLLED, OTHER
- **TemperatureRequirement:** AMBIENT, REFRIGERATED, FROZEN, OTHER
- **LoadStatus:** QUOTE_REQUESTED, REQUESTED, SCHEDULED, EN_ROUTE, PICKED_UP, IN_TRANSIT, DELIVERED, DENIED, CANCELLED
- **TrackingEventCode:** REQUEST_RECEIVED, PRICE_QUOTED, SHIPPER_CONFIRMED, DRIVER_EN_ROUTE_PICKUP, PICKED_UP, IN_TRANSIT, DELIVERED, CANCELLED
- **DocumentType:** PROOF_OF_PICKUP, PROOF_OF_DELIVERY, BILL_OF_LADING, OTHER
- **DriverStatus:** AVAILABLE, ON_ROUTE, OFF_DUTY, INACTIVE
- **VehicleType:** SEDAN, SUV, VAN, SPRINTER, BOX_TRUCK, REFRIGERATED
- **UserRole:** ADMIN, DISPATCHER, VIEW_ONLY

---

## EMAIL NOTIFICATIONS

### Email Service (`lib/email.ts`)
- **Implementation:** Abstract email service (ready for Resend, SendGrid, etc.)
- **Current:** Console logging (for development)

### Email Templates

#### New Load Notification
- **Trigger:** New load request created
- **Recipients:** Admin (if configured)
- **Content:** Load details, tracking code, shipper info

#### Quote Ready Notification
- **Trigger:** Admin sets quote on load
- **Recipients:** Shipper
- **Content:** Quote amount, load details, accept link

#### Quote Accepted Notification
- **Trigger:** Shipper accepts quote
- **Recipients:** Admin (if configured)
- **Content:** Load details, shipper confirmation

#### Status Update Notifications
- **Trigger:** Load status changes
- **Recipients:** Shipper, Driver (if configured)
- **Content:** New status, tracking event, timeline link

#### Document Upload Notification
- **Trigger:** Driver uploads document
- **Recipients:** Shipper
- **Content:** Document type, title, download link, load details

### Email Configuration
- **Future Enhancement:** Configure email service provider
- **Future Enhancement:** Email preferences per shipper
- **Future Enhancement:** Email templates customization

---

## DOCUMENT MANAGEMENT

### Document Storage
- **Current:** Base64 encoding stored in database (`Document.url` field)
- **Future:** Migrate to S3, Cloud Storage, or similar
- **File Types:** PDF, images (JPEG, PNG)
- **Size Limits:** Not enforced (should add validation)

### Document Types
- **PROOF_OF_PICKUP:** Proof that driver picked up items
- **PROOF_OF_DELIVERY:** POD document with signature
- **BILL_OF_LADING:** BOL document
- **OTHER:** Miscellaneous documents

### Document Upload Flow

#### Driver Upload
1. Driver selects file
2. Converts to base64 (client-side)
3. Sends to `POST /api/load-requests/[id]/documents`
4. Server stores in database
5. Sends email notification to shipper
6. Document appears in shipper portal immediately

#### Shipper Upload
1. Same flow as driver
2. `uploadedBy` = "shipper"
3. No email notification (shipper uploaded their own)

### Document Locking
- **Automatic:** When load status = `DELIVERED`, all documents locked
- **Admin Override:** Required for post-delivery uploads
- **Audit Trail:** `adminOverrideBy`, `adminOverrideNotes`, `lockedAt`

### Document Viewing
- **Driver Portal:** View all documents for own loads
- **Shipper Portal:** View all documents for own loads
- **Admin Portal:** View all documents (all loads)
- **Aggregate Views:** `/driver/documents`, `/shipper/documents` show all documents

---

## TRACKING & CHAIN OF CUSTODY

### Tracking Code Format
- **Format:** MED-XXXX-YY (e.g., MED-1234-AB)
- **Generation:** `lib/tracking.ts` - `generateTrackingCode()`
- **Uniqueness:** Enforced by database unique constraint

### Tracking Events
- **Automatic Events:**
  - `REQUEST_RECEIVED` - When load is created
  - `PRICE_QUOTED` - When admin sets quote
  - `SHIPPER_CONFIRMED` - When shipper accepts quote
  - `DRIVER_EN_ROUTE_PICKUP` - When driver assigned
  - `PICKED_UP` - When driver confirms pickup
  - `IN_TRANSIT` - When status updated to in-transit
  - `DELIVERED` - When driver confirms delivery (final state)

- **Manual Events:**
  - Admin can create custom tracking events via status update API

### Chain-of-Custody Tracking
- **Actor Recording:**
  - Every tracking event records `actorId` and `actorType`
  - `actorType`: "DRIVER", "SHIPPER", "ADMIN", "SYSTEM"
  - Enables complete audit trail of who performed what action

- **Location Tracking:**
  - Optional `locationText` (city, facility name)
  - Optional GPS coordinates (`latitude`, `longitude`) - future enhancement

### Tracking Display
- **Timeline View:**
  - Chronological list of all events
  - Shows event label, description, timestamp, location
  - Shows actor information (who performed action)
  - Color-coded by status

- **Status Badges:**
  - Visual status indicators with color coding
  - LoadStatus enum mapped to colors/labels

---

## TECHNICAL IMPLEMENTATION DETAILS

### Frontend Architecture
- **Framework:** Next.js 14 App Router
- **Language:** TypeScript (strict mode)
- **Components:**
  - Server Components by default
  - Client Components (`'use client'`) for interactivity
  - Shared components: `SignatureCapture`, layout components

### State Management
- **Local State:** React `useState` for component state
- **Session:** localStorage for authentication (temporary)
- **Data Fetching:** `fetch` API in `useEffect` hooks
- **Future:** Consider React Query or SWR for caching

### Styling
- **Framework:** Tailwind CSS
- **Design System:**
  - Glassmorphism effects (glass utility class)
  - Muted color scheme (slate/sage tones)
  - Responsive design (mobile-first)
  - Custom utilities in `globals.css`

### Form Handling
- **Client-Side Validation:** HTML5 validation + custom validation
- **File Upload:** Base64 conversion client-side
- **Signature Capture:** HTML5 Canvas component
- **Error Handling:** Try-catch blocks with user-friendly messages

### API Architecture
- **Pattern:** RESTful API routes
- **Location:** `app/api/` directory
- **Methods:**
  - GET for retrieval
  - POST for creation/actions
  - PATCH for updates
- **Error Handling:** JSON error responses with status codes
- **Authentication:** Session check in API routes (future: JWT tokens)

### Database
- **ORM:** Prisma
- **Database:** SQLite (dev), PostgreSQL-ready (prod)
- **Migrations:** Prisma migrations
- **Client:** Singleton pattern (`lib/prisma.ts`)

### Utilities
- **Tracking Code:** `lib/tracking.ts` - Generate unique tracking codes
- **Auth:** `lib/auth.ts` - Password hashing/verification (bcryptjs)
- **Email:** `lib/email.ts` - Abstract email service
- **Invoice:** `lib/invoice.ts` - Invoice number generation, due date calculation
- **PDF:** `lib/pdf-invoice.ts` - Invoice PDF generation
- **Utils:** `lib/utils.ts` - Date formatting, URL helpers

---

## KNOWN GAPS & FUTURE ENHANCEMENTS

### Authentication & Security
- [ ] **Replace localStorage with httpOnly cookies** (critical for production)
- [ ] **Implement JWT tokens** for stateless authentication
- [ ] **Add CSRF protection**
- [ ] **Implement rate limiting** on API routes
- [ ] **Add password reset flow** (forgot password)
- [ ] **Add two-factor authentication** (optional)
- [ ] **Role-based access control enforcement** (currently User.role exists but not enforced)

### Features Missing
- [ ] **Saved Facilities Management** (`/shipper/facilities` is placeholder)
- [ ] **Notifications System** (both portals have placeholder pages)
- [ ] **Support Ticket System** (support pages are placeholders)
- [ ] **Driver Earnings/Payout History** (payout history tab is placeholder)
- [ ] **Email Preferences** (per shipper email notification settings)
- [ ] **Bulk Operations** (bulk invoice generation, bulk status updates)
- [ ] **Reporting & Analytics** (revenue reports, load statistics, driver performance)

### Technical Improvements
- [ ] **Migrate document storage** from base64 to S3/Cloud Storage
- [ ] **Add file size limits** and validation for document uploads
- [ ] **Implement image optimization** for uploaded images
- [ ] **Add GPS tracking** for real-time driver location (optional)
- [ ] **Add push notifications** for mobile drivers
- [ ] **Implement caching** (React Query/SWR for API calls)
- [ ] **Add pagination** for large lists (loads, invoices, documents)
- [ ] **Add data export** (CSV/Excel export for loads, invoices)
- [ ] **Add search indexing** (full-text search for loads, shippers)

### Payment & Billing
- [ ] **Stripe ACH Integration** (optional, per client)
- [ ] **Automated Invoice Emailing** (send PDF via email when marked as SENT)
- [ ] **Payment Reminders** (automatic emails for overdue invoices)
- [ ] **Multiple Loads Per Invoice** (UI for selecting multiple loads)
- [ ] **Invoice Templates** (customizable PDF templates)
- [ ] **Payment Reconciliation** (matching payments to invoices)

### Compliance & Medical
- [ ] **HIPAA Compliance Audit** (ensure all data handling is HIPAA-compliant)
- [ ] **Data Encryption at Rest** (encrypt sensitive fields like SSN, account numbers)
- [ ] **Audit Logging** (comprehensive audit trail of all actions)
- [ ] **Data Export/Deletion** (automated data retention policy enforcement)
- [ ] **Temperature Monitoring Alerts** (real-time alerts for temperature exceptions)
- [ ] **Chain-of-Custody Reports** (generate PDF reports for compliance)

### User Experience
- [ ] **Mobile App** (React Native app for drivers)
- [ ] **Offline Mode** (drivers can work offline, sync when online)
- [ ] **Drag-and-Drop File Upload** (improve document upload UX)
- [ ] **Bulk Document Upload** (upload multiple documents at once)
- [ ] **Advanced Search** (search across all fields, date ranges, filters)
- [ ] **Dashboard Widgets** (customizable dashboards)
- [ ] **Keyboard Shortcuts** (power user shortcuts)

### Integration
- [ ] **Webhook System** (notify external systems of status changes)
- [ ] **API Documentation** (OpenAPI/Swagger docs)
- [ ] **Third-Party Integrations** (QuickBooks, accounting software)
- [ ] **SMS Notifications** (optional SMS alerts)
- [ ] **Calendar Integration** (Google Calendar, Outlook for scheduled loads)

---

## TESTING & QUALITY ASSURANCE

### Current State
- **No automated tests** currently implemented
- **Manual testing** only

### Recommendations
- [ ] **Unit Tests:** Test utility functions (tracking code generation, date calculations)
- [ ] **Integration Tests:** Test API endpoints
- [ ] **E2E Tests:** Test complete workflows (load creation → delivery → invoice)
- [ ] **Component Tests:** Test React components (SignatureCapture, forms)
- [ ] **Database Tests:** Test Prisma queries and relations

---

## DEPLOYMENT & PRODUCTION CONSIDERATIONS

### Environment Setup
- [ ] **Production Database:** Migrate from SQLite to PostgreSQL
- [ ] **Environment Variables:** Secure storage of secrets (API keys, DB credentials)
- [ ] **Email Service:** Configure production email provider (Resend, SendGrid)
- [ ] **File Storage:** Set up S3 or Cloud Storage for documents
- [ ] **CDN:** Set up CDN for static assets

### Performance
- [ ] **Database Indexing:** Review and optimize indexes
- [ ] **Image Optimization:** Next.js Image component usage
- [ ] **Code Splitting:** Ensure proper code splitting for faster loads
- [ ] **Caching Strategy:** Implement Redis or similar for session/API caching

### Monitoring
- [ ] **Error Tracking:** Integrate Sentry or similar
- [ ] **Analytics:** Google Analytics or privacy-friendly alternative
- [ ] **Uptime Monitoring:** Monitor API health and uptime
- [ ] **Performance Monitoring:** Track API response times

### Security
- [ ] **HTTPS:** Ensure all traffic is encrypted
- [ ] **Security Headers:** Implement security headers (CSP, HSTS, etc.)
- [ ] **Input Validation:** Validate all user inputs server-side
- [ ] **SQL Injection Prevention:** Prisma handles this, but verify
- [ ] **XSS Prevention:** Sanitize all user-generated content

---

## CONCLUSION

This documentation provides a comprehensive overview of all features, workflows, and technical implementation details in the MED DROP medical courier portal. The system is functionally complete for core operations (request → quote → delivery → invoice), with robust compliance features and clear pathways for future enhancements.

**Key Strengths:**
- Complete end-to-end workflow
- Medical compliance features (chain-of-custody, temperature exceptions, attestations, POD locking)
- Flexible driver assignment (admin-assigned or self-acceptance)
- Comprehensive document management
- Invoice generation with payment terms
- Multi-user portal (public, shipper, driver, admin)

**Primary Gaps:**
- Authentication security (localStorage → httpOnly cookies)
- Missing features (notifications, support tickets, saved facilities management)
- No automated testing
- Document storage optimization (base64 → cloud storage)
- Missing analytics and reporting

---

**Document Version:** 1.0  
**Last Updated:** Current Date  
**Maintained By:** Development Team  
**For:** Gap Analysis & Feature Planning

