# MED DROP - Comprehensive System Summary
## Medical Courier Management Platform

**Document Version:** 1.0  
**Date:** December 2024  
**Purpose:** Complete system overview for business lenders, potential buyers, and end users

---

## EXECUTIVE SUMMARY

**MED DROP** is a comprehensive, enterprise-grade medical courier management platform designed to streamline the complete lifecycle of medical specimen and pharmaceutical transportation. The system serves three distinct user types—healthcare facilities (Shippers), independent courier drivers, and administrative staff—providing a unified platform for load requests, real-time tracking, compliance documentation, billing, and operational management.

Built with modern web technologies (Next.js 14, TypeScript, Prisma ORM), the platform is production-ready, scalable, and designed to meet the stringent compliance requirements of the medical transportation industry, including HIPAA, UN3373, and OSHA standards.

---

## TABLE OF CONTENTS

1. [System Overview & Architecture](#1-system-overview--architecture)
2. [Target Market & Use Cases](#2-target-market--use-cases)
3. [User Types & Access Levels](#3-user-types--access-levels)
4. [Core Features & Capabilities](#4-core-features--capabilities)
5. [Business Logic & Workflows](#5-business-logic--workflows)
6. [Compliance & Medical Features](#6-compliance--medical-features)
7. [Technical Architecture](#7-technical-architecture)
8. [Revenue Model & Business Value](#8-revenue-model--business-value)
9. [Scalability & Growth Potential](#9-scalability--growth-potential)
10. [Security & Data Protection](#10-security--data-protection)

---

## 1. SYSTEM OVERVIEW & ARCHITECTURE

### 1.1 Platform Purpose

MED DROP is a Software-as-a-Service (SaaS) platform that digitizes and automates medical courier operations. It replaces traditional phone-based dispatch systems, paper-based tracking, and manual invoicing with a comprehensive digital solution that provides:

- **Real-time visibility** into shipment status and location
- **Automated quote generation** based on distance, service type, and market rates
- **Digital chain-of-custody** documentation with signatures and temperature logs
- **Automated billing and invoicing** with payment term management
- **Compliance tracking** for medical transportation regulations
- **Driver management** with certification and vehicle tracking
- **Multi-tenant architecture** supporting unlimited shippers and drivers

### 1.2 Technology Stack

**Frontend:**
- Next.js 14 (React framework with App Router)
- TypeScript for type safety
- Tailwind CSS with custom medical-themed design system
- Responsive, mobile-first design
- Progressive Web App (PWA) capabilities

**Backend:**
- Next.js API Routes (serverless functions)
- Prisma ORM for database management
- SQLite (development) / PostgreSQL (production-ready)
- RESTful API architecture

**Infrastructure:**
- Vercel-ready deployment configuration
- Cloud storage integration points (S3, Vercel Blob)
- Email service abstraction (Resend, SendGrid, SMTP support)
- Google Maps API integration for geocoding and distance calculation

**Security:**
- bcryptjs password hashing
- Account lockout protection
- Audit logging system
- Role-based access control (RBAC)

---

## 2. TARGET MARKET & USE CASES

### 2.1 Primary Market Segments

**Healthcare Facilities (Shippers):**
- **Clinics** - Routine lab specimen transport
- **Hospitals** - STAT and critical specimen delivery
- **Laboratories** - High-volume specimen collection and delivery
- **Dialysis Centers** - Scheduled route services
- **Imaging Centers** - Medical equipment and supplies
- **Pharmacies** - Pharmaceutical delivery
- **Government Facilities** - Compliance-focused transportation

**Independent Courier Drivers:**
- Individual contractors seeking load opportunities
- Fleet operators managing multiple vehicles
- Specialized drivers (temperature-controlled, STAT-certified)
- Part-time and full-time couriers

**Medical Courier Companies:**
- Existing courier services seeking digital transformation
- New entrants to the medical courier market
- Regional and national courier operations

### 2.2 Key Use Cases

**Use Case 1: STAT Medical Specimen Delivery**
A hospital needs to urgently transport a critical lab specimen to a reference laboratory. The system:
- Accepts STAT load request with priority flagging
- Calculates premium rate automatically
- Notifies available drivers immediately
- Provides real-time GPS tracking
- Captures temperature and chain-of-custody documentation
- Generates invoice automatically upon delivery

**Use Case 2: Scheduled Route Management**
A dialysis center requires daily scheduled pickups from multiple locations. The system:
- Supports recurring load templates
- Allows bulk load creation
- Assigns dedicated drivers to routes
- Tracks route completion and compliance
- Consolidates billing into monthly invoices

**Use Case 3: Driver Load Board**
An independent driver wants to find available loads matching their vehicle and schedule. The system:
- Displays real-time available loads
- Filters by distance, service type, and vehicle requirements
- Shows profit estimates and rate per mile
- Allows driver to accept loads directly
- Provides navigation and delivery instructions

**Use Case 4: Compliance Documentation**
A laboratory needs proof of temperature-controlled transport for regulatory compliance. The system:
- Records temperature at pickup and delivery
- Flags temperature exceptions automatically
- Captures digital signatures with timestamps
- Generates chain-of-custody reports
- Stores all documentation for 7+ years (HIPAA compliance)

---

## 3. USER TYPES & ACCESS LEVELS

### 3.1 Public Users (Unauthenticated)

**Access:**
- Homepage with service information
- Public load request form
- Public shipment tracking by tracking code
- Company information and contact details

**Limitations:**
- Cannot view shipper portal
- Cannot manage loads or view invoices
- Limited to basic tracking information

**Business Value:**
- Low-friction lead generation
- Customer self-service tracking
- Brand visibility and marketing

### 3.2 Shippers (Authenticated Healthcare Facilities)

**Access Level:** Shipper Portal (`/shipper/*`)

**Core Capabilities:**
- **Load Management:**
  - Create new load requests with multiple pickup/dropoff locations
  - View all historical and active loads
  - Filter and search loads by status, date, tracking code
  - Accept or reject quotes from drivers/admin
  - Request callback for complex loads

- **Facility Management:**
  - Save multiple pickup and delivery locations
  - Store default access notes and contact information
  - Create recurring load templates for scheduled routes
  - Quick-select saved facilities when creating loads

- **Tracking & Visibility:**
  - Real-time tracking timeline with chain-of-custody events
  - GPS location updates (if driver enables)
  - Status change notifications via email
  - View driver information and vehicle details

- **Document Management:**
  - View all documents (POD, BOL, signatures, photos)
  - Upload additional documents for own records
  - Download documents for compliance purposes
  - Filter documents by type and date

- **Billing & Invoicing:**
  - View all invoices with status tracking
  - Download invoice PDFs
  - Configure payment terms (Net-7, Net-14, Net-30)
  - Set billing contact and address
  - View payment history

- **Profile Management:**
  - Edit company information
  - Update contact details
  - Manage notification preferences
  - Change password securely

**Subscription Tiers:**
- **STANDARD:** Self-service access to load board, independent load requests, pay-per-load
- **BROKERAGE:** Dedicated dispatcher, personalized service, consolidated monthly invoicing

**Business Value:**
- Reduces phone calls and manual coordination
- Provides transparency and control
- Ensures compliance documentation
- Streamlines billing and payment

### 3.3 Drivers (Authenticated Couriers)

**Access Level:** Driver Portal (`/driver/*`)

**Core Capabilities:**
- **Load Board:**
  - View all available loads in real-time
  - Filter by distance, service type, vehicle requirements
  - See profit estimates and rate per mile calculations
  - Accept loads directly (self-assignment)
  - View load details before accepting

- **Load Management:**
  - View assigned and accepted loads
  - Update load status (pickup, in-transit, delivery)
  - Capture digital signatures at pickup and delivery
  - Record temperatures with exception flagging
  - Upload documents (photos, POD, BOL)
  - Add notes and access instructions

- **GPS Tracking:**
  - Enable real-time GPS tracking for shippers
  - Automatic location updates during transit
  - Location history for compliance verification
  - Optional feature for premium service

- **Vehicle Management:**
  - Register multiple vehicles
  - Specify vehicle type, refrigeration capabilities
  - Update vehicle information
  - Track vehicle-specific certifications

- **Profile & Compliance:**
  - Manage driver profile and bio
  - Upload compliance documents (license, insurance, UN3373, HIPAA)
  - Track certification expiration dates
  - Set minimum acceptable rate per mile
  - View driver ratings and feedback

- **Earnings & Payment:**
  - View completed loads and earnings
  - Track payment settings
  - View tax documents (W9, 1099)
  - Manage payout preferences

**Driver Status Workflow:**
- **PENDING_APPROVAL:** New driver signup, awaiting admin approval
- **AVAILABLE:** Active and available for loads
- **ON_ROUTE:** Currently delivering a load
- **OFF_DUTY:** Temporarily unavailable
- **INACTIVE:** Deactivated by admin

**Business Value:**
- Provides load opportunities and income
- Mobile-optimized for on-the-go use
- Simplifies compliance documentation
- Transparent rate and profit information

### 3.4 Admin/Staff (Authenticated Internal Users)

**Access Level:** Admin Portal (`/admin/*`)

**Core Capabilities:**
- **Load Management:**
  - View all loads across all shippers and statuses
  - Set quotes manually or use auto-quote generator
  - Assign drivers to loads
  - Update load statuses
  - Create custom tracking events
  - Cancel loads with billing rules
  - Override document locks (with audit trail)

- **Quote Management:**
  - Automated quote generation based on distance and service type
  - Manual quote override capability
  - Quote acceptance tracking
  - Rate calculation with market-based pricing
  - After-hours and urgency surcharge calculation

- **Driver Management:**
  - Approve pending driver applications
  - View all drivers with status and certifications
  - Review driver documents and compliance
  - Set driver admin privileges
  - Deactivate drivers (soft delete)
  - View driver performance metrics

- **Shipper Management:**
  - View all shipper companies and facilities
  - Assign dedicated dispatchers (BROKERAGE tier)
  - Manage shipper payment terms
  - View shipper load history
  - Export shipper data
  - Block emails (DNU list)

- **Invoice Management:**
  - Generate invoices for completed loads
  - Create batch invoices for multiple loads
  - Track invoice status (DRAFT, SENT, PAID, OVERDUE)
  - Mark invoices as paid with payment details
  - Download invoice PDFs
  - Email invoices to shippers

- **Analytics & Reporting:**
  - System-wide statistics and metrics
  - Load volume and revenue analytics
  - Driver performance reports
  - Shipper activity reports
  - Compliance tracking reports

- **Callback Queue Management:**
  - View shippers requesting callbacks
  - Prioritize callback requests
  - Assign drivers to callbacks
  - Track callback completion

**User Roles:**
- **ADMIN:** Full system access
- **DISPATCHER:** Load and driver management
- **VIEW_ONLY:** Read-only access for reporting

**Business Value:**
- Centralized operational control
- Automated workflows reduce manual work
- Comprehensive audit trail
- Data-driven decision making

---

## 4. CORE FEATURES & CAPABILITIES

### 4.1 Load Request Management

**Multi-Location Support:**
- Single or multiple pickup locations
- Single or multiple dropoff locations
- Sequential location ordering
- Location-specific ready times and deadlines
- Location-specific access notes

**Service Type Classification:**
- **STAT:** Urgent, same-day delivery (premium pricing)
- **CRITICAL_STAT:** Life-threatening urgency (highest priority)
- **ROUTINE:** Standard scheduled delivery
- **SAME_DAY:** Same-day but not urgent
- **SCHEDULED_ROUTE:** Recurring scheduled service
- **OVERFLOW:** Additional capacity needs
- **GOVERNMENT:** Government facility requirements

**Specimen & Commodity Management:**
- **UN3373_CATEGORY_B:** Biological specimens requiring UN3373 certification
- **NON_SPECIMEN_MEDICAL:** Medical supplies and equipment
- **PHARMACEUTICAL:** Pharmaceutical products
- **SUPPLIES:** General medical supplies
- **EQUIPMENT:** Medical equipment transport
- **PAPERWORK:** Document delivery
- **OTHER:** Custom commodity types

**Temperature Requirements:**
- **AMBIENT:** Room temperature
- **REFRIGERATED:** 2-8°C temperature range
- **FROZEN:** Below 0°C
- **OTHER:** Custom temperature specifications

**Load Specifications:**
- Estimated containers/quantity
- Estimated weight (kg)
- Declared value for insurance
- Priority level (NORMAL, HIGH, CRITICAL)
- Tags and labels for organization

### 4.2 Automated Quote Generation

**Rate Calculation Engine:**
- Distance calculation using Google Maps API
- Service type-based rate per mile:
  - STAT: $3.50-$4.50/mile
  - ROUTINE: $2.00-$3.00/mile
  - SAME_DAY: $2.50-$3.50/mile
- After-hours surcharge (weekends, holidays, outside business hours)
- Temperature requirement fees:
  - Refrigerated: +$15.00
  - Frozen: +$25.00
- Priority level surcharges:
  - HIGH: +15% of base rate
  - CRITICAL: +30% of base rate
- Minimum rate thresholds
- Suggested rate range (min-max) for negotiation

**Quote Features:**
- Automatic quote generation on load creation
- Manual quote override by admin
- Quote notes explaining breakdown
- Quote acceptance/rejection workflow
- Quote expiration tracking
- Driver quote submission (driver-proposed rates)

### 4.3 Real-Time Tracking System

**Tracking Event Types:**
- REQUEST_RECEIVED: Load request created
- PRICE_QUOTED: Quote generated and sent
- SHIPPER_CONFIRMED: Shipper accepted quote
- DRIVER_EN_ROUTE_PICKUP: Driver heading to pickup
- PICKED_UP: Specimen collected
- IN_TRANSIT: En route to delivery
- DELIVERED: Successfully delivered
- CANCELLED: Load cancelled
- DRIVER_DENIED: Driver declined load

**Chain-of-Custody Tracking:**
- Every event records actor (driver/admin/shipper ID)
- Actor type classification (DRIVER/ADMIN/SHIPPER/SYSTEM)
- Precise timestamps for all events
- Optional GPS coordinates for location verification
- Location text for human-readable display
- Linear status progression enforcement (cannot skip steps)

**Public Tracking:**
- UPS-style tracking interface
- Tracking code format: MED-XXXX-XX (e.g., MED-1234-AB)
- Timeline view of all events
- Status indicators and icons
- No authentication required for basic tracking

### 4.4 GPS Tracking (Premium Feature)

**Real-Time Location Updates:**
- Driver-enabled GPS tracking option
- Automatic location updates every 30-60 seconds
- Browser-based geolocation API
- Adaptive accuracy settings
- Location history storage
- Map visualization for shippers

**GPS Data Storage:**
- Latitude/longitude coordinates
- Accuracy metrics
- Heading and speed (if available)
- Timestamp for each point
- Driver ID association
- Load request association

**Use Cases:**
- Real-time shipment visibility
- Route optimization
- Delivery time estimation
- Compliance verification
- Dispute resolution

### 4.5 Digital Signature Capture

**Signature Requirements:**
- Pickup signature (default: required)
- Delivery signature (default: required)
- Electronic POD acceptable flag
- Chain-of-custody signature requirement

**Signature Capture:**
- Canvas-based signature pad
- Base64 PNG image storage
- Signer name recording
- Driver ID who captured signature (legal coverage)
- Precise timestamp recording
- Signature unavailable fallback:
  - Reason selection (device issue, signer unavailable, etc.)
  - Photo fallback option
  - Admin override capability

**Signature Storage:**
- Immutable storage (locked after delivery)
- SHA-256 hash for integrity verification
- 7+ year retention (HIPAA compliance)
- Exportable for audits

### 4.6 Temperature Monitoring

**Temperature Recording:**
- Pickup temperature (°C)
- Delivery temperature (°C)
- Precise timestamps for each reading
- Temperature range specification (min/max)
- Exception flagging:
  - Automatic flag if outside acceptable range
  - Driver notes explaining exceptions
  - Compliance documentation

**Temperature Requirements:**
- Ambient: No special requirements
- Refrigerated: 2-8°C typical range
- Frozen: Below 0°C
- Custom ranges per load

**Compliance Features:**
- Temperature log export
- Exception reporting
- Historical temperature data
- Regulatory audit support

### 4.7 Document Management

**Document Types:**
- **PROOF_OF_PICKUP:** POD at pickup location
- **PROOF_OF_DELIVERY:** POD at delivery location
- **BILL_OF_LADING:** BOL documentation
- **OTHER:** Custom document types

**Document Features:**
- Upload via file input or camera
- Base64 encoding (can migrate to cloud storage)
- SHA-256 hash for integrity
- MIME type detection
- File size tracking
- Document locking after delivery (immutability)
- Admin override with audit trail
- Document archiving (replacement tracking)

**Document Access:**
- Shipper: View all documents for own loads
- Driver: Upload and view documents for assigned loads
- Admin: Full access with override capabilities
- Public: No document access

### 4.8 Invoice & Billing System

**Payment Terms:**
- NET_7: Payment due in 7 days
- NET_14: Payment due in 14 days
- NET_30: Payment due in 30 days
- INVOICE_ONLY: No automatic due date

**Invoice Generation:**
- Automatic invoice number (INV-YYYY-XXX format)
- Due date calculation from payment terms
- Subtotal, tax, and total calculation
- Multiple loads per invoice (batch invoicing)
- PDF generation with jsPDF
- Email delivery to billing contact

**Invoice Status Workflow:**
- **DRAFT:** Created but not sent
- **SENT:** Emailed to shipper
- **PAID:** Payment received (manual update)
- **OVERDUE:** Past due date, not paid
- **CANCELLED:** Invoice voided

**Payment Tracking:**
- Payment method (ACH, CHECK, WIRE, STRIPE_ACH, OTHER)
- Payment reference (check number, transaction ID)
- Payment date recording
- Notes for payment details
- No online payment processing (invoices sent, payments processed offline)

**Optional Stripe Integration:**
- Stripe customer creation (no payment method storage)
- Stripe invoice generation
- ACH payment links via Stripe
- Webhook integration for payment status

### 4.9 Driver Load Board

**Load Display:**
- Real-time available loads
- Load details (pickup, dropoff, service type, rate)
- Distance and estimated time
- Profit estimate calculation
- Rate per mile display
- Vehicle requirements matching

**Load Filtering:**
- By service type
- By distance range
- By vehicle requirements
- By temperature requirements
- By priority level

**Load Acceptance:**
- Driver can accept loads directly
- Admin can assign loads to drivers
- Driver can decline with reason tracking
- Automatic status update on acceptance
- Notification to shipper

**Profit Estimation:**
- Calculates estimated costs (fuel, driver time, overhead)
- Shows profit margin percentage
- Compares to driver's minimum rate per mile
- Helps drivers make informed decisions

### 4.10 Facility Management

**Facility Features:**
- Multiple facilities per shipper
- Facility types (CLINIC, LAB, HOSPITAL, PHARMACY, etc.)
- Complete address information
- Contact name and phone
- Default access notes
- Quick-select in load creation

**Facility Templates:**
- Recurring load templates using saved facilities
- Ready time and deadline defaults
- Access notes pre-filled
- One-click load creation from template

### 4.11 Notification System

**Email Notifications:**
- Load status changes
- Quote sent/accepted/rejected
- Driver assigned
- Delivery confirmation
- Invoice sent
- Compliance reminders
- Customizable per shipper

**In-App Notifications:**
- Real-time notification feed
- Mark as read/unread
- Link to relevant pages
- Notification preferences
- Notification grouping

**SMS Notifications (Phase 1.2):**
- Optional SMS for critical updates
- Configurable per shipper
- Twilio integration ready

### 4.12 Callback Queue System

**Purpose:**
- Shippers can request callback for complex loads
- Prioritized queue for dispatch
- Reduces phone tag and missed calls

**Workflow:**
1. Shipper requests callback
2. Added to queue with position
3. Admin/dispatcher calls shipper
4. Load created from callback
5. Queue position updated
6. Completion tracking

**Queue Features:**
- Position tracking
- Priority levels (NORMAL, HIGH, URGENT)
- Status tracking (PENDING, CALLED, COMPLETED, CANCELLED)
- Driver assignment tracking
- Notes from dispatch

### 4.13 Analytics & Reporting

**System Statistics:**
- Total loads by status
- Revenue metrics
- Driver performance
- Shipper activity
- Load volume trends
- Compliance metrics

**Reports:**
- Load history exports
- Invoice reports
- Driver earnings reports
- Shipper activity reports
- Compliance audit reports

### 4.14 Search & Filtering

**Load Search:**
- By tracking code
- By shipper
- By driver
- By status
- By date range
- By service type
- By facility

**Advanced Filtering:**
- Multiple filter combinations
- Saved filter presets
- Export filtered results
- Real-time filter updates

---

## 5. BUSINESS LOGIC & WORKFLOWS

### 5.1 Complete Load Lifecycle

**Phase 1: Load Request Creation**

**Option A: Public Web Form**
1. User fills comprehensive load request form
2. System checks if shipper exists (by email)
3. If new shipper: Auto-creates shipper account
4. Creates facility records if new
5. Generates unique tracking code (MED-XXXX-XX)
6. Sets status: REQUESTED or QUOTE_REQUESTED
7. Sends confirmation email to shipper
8. Creates tracking event: REQUEST_RECEIVED

**Option B: Authenticated Shipper Portal**
1. Shipper logs into portal
2. Selects "Request Load"
3. Uses saved facilities or creates new
4. Fills load details
5. Submits request
6. System auto-generates quote (optional)
7. Status: REQUESTED or QUOTED

**Option C: Email-Based Request (Passive)**
1. Shipper emails load request
2. System parses email content
3. Extracts load details
4. Creates load request
5. Status: QUOTE_REQUESTED
6. Admin reviews and quotes

**Phase 2: Quote Generation**

**Automated Quote:**
1. System calculates distance (Google Maps API)
2. Determines service type rate per mile
3. Applies after-hours surcharge if applicable
4. Adds temperature fees if required
5. Applies priority surcharges
6. Calculates suggested rate range
7. Sets quote amount and notes
8. Status: QUOTED
9. Creates tracking event: PRICE_QUOTED
10. Sends email to shipper with quote

**Manual Quote:**
1. Admin reviews load request
2. Enters custom quote amount
3. Adds quote notes
4. System updates load request
5. Status: QUOTED
6. Sends email to shipper

**Phase 3: Quote Acceptance**

1. Shipper receives quote email
2. Shipper logs into portal
3. Views quote details
4. Accepts or rejects quote
5. If accepted:
   - Status: ACCEPTED or SCHEDULED
   - Creates tracking event: SHIPPER_CONFIRMED
   - Load becomes available on driver load board
   - Notifies available drivers
6. If rejected:
   - Status: DENIED
   - Admin can revise quote

**Phase 4: Driver Assignment**

**Option A: Driver Self-Acceptance**
1. Driver views load board
2. Sees available load matching criteria
3. Reviews load details and profit estimate
4. Accepts load
5. System updates:
   - Status: SCHEDULED
   - Driver ID assigned
   - Assigned timestamp
   - Creates tracking event
6. Notifies shipper of driver assignment

**Option B: Admin Assignment**
1. Admin reviews load
2. Selects driver from dropdown
3. Assigns driver
4. System updates same as Option A
5. Driver receives notification

**Option C: Driver Quote Submission**
1. Driver views load
2. Submits own quote amount
3. System records driver quote
4. Shipper reviews driver quote
5. Shipper approves or denies
6. If approved: Load assigned to driver

**Phase 5: Pickup Execution**

1. Driver navigates to pickup location
2. Driver opens load detail page
3. Driver captures pickup signature
4. Driver records pickup temperature
5. Driver checks attestation checkbox
6. Driver clicks "Confirm Pickup"
7. System updates:
   - Status: PICKED_UP
   - Pickup signature (base64 PNG)
   - Pickup signer name
   - Pickup temperature
   - Pickup timestamp
   - Pickup attestation
   - Actual pickup time
8. System checks temperature against range:
   - If out of range: Sets exception flag
   - Allows driver notes
9. Creates tracking event: PICKED_UP
10. Sends email notification to shipper

**Phase 6: In-Transit**

1. Driver updates status to IN_TRANSIT
2. System creates tracking event
3. Optional: Driver enables GPS tracking
4. System records GPS points periodically
5. Shipper can view real-time location (if enabled)

**Phase 7: Delivery Execution**

1. Driver navigates to delivery location
2. Driver captures delivery signature
3. Driver records delivery temperature
4. Driver checks delivery attestation
5. Driver clicks "Confirm Delivery"
6. System updates:
   - Status: DELIVERED
   - Delivery signature
   - Delivery signer name
   - Delivery temperature
   - Delivery timestamp
   - Delivery attestation
   - Actual delivery time
7. System checks delivery temperature:
   - If out of range: Sets exception flag
8. Creates tracking event: DELIVERED
9. Sends email notification to shipper
10. Locks documents (immutability)
11. Load ready for invoicing

**Phase 8: Completion & Invoicing**

1. Admin reviews delivered load
2. Admin generates invoice
3. System:
   - Creates invoice record
   - Generates invoice number
   - Calculates due date from payment terms
   - Links load to invoice
   - Generates PDF
4. Admin marks invoice as SENT
5. System emails invoice to billing contact
6. Status: COMPLETED (load)
7. Status: SENT (invoice)

**Phase 9: Payment Tracking**

1. Payment received (ACH, check, wire)
2. Admin marks invoice as PAID
3. System records:
   - Payment date
   - Payment method
   - Payment reference
   - Notes
4. Invoice status: PAID

### 5.2 Driver Denial Workflow

**When Driver Declines Load:**
1. Driver views load details
2. Driver selects denial reason:
   - PRICE_TOO_LOW
   - ROUTE_NOT_FEASIBLE
   - TIMING_NOT_WORKABLE
   - TOO_FAR
   - EQUIPMENT_REQUIRED
   - ALREADY_BOOKED
   - OTHER
3. Driver adds optional notes
4. System records:
   - Denial reason
   - Denial notes
   - Denial timestamp
   - Driver ID
5. Load remains available for other drivers
6. Admin can review denial reasons for insights

### 5.3 Cancellation Workflow

**Cancellation Types:**
- CLIENT_CANCELLED: Shipper cancelled
- DRIVER_NO_SHOW: Driver didn't show up
- VEHICLE_BREAKDOWN: Vehicle issue
- FACILITY_CLOSED: Facility unavailable
- WEATHER: Weather-related
- OTHER: Custom reason

**Billing Rules:**
- BILLABLE: Full charge (e.g., driver already en route)
- PARTIAL: Partial charge
- NOT_BILLABLE: No charge

**Cancellation Process:**
1. Admin or shipper initiates cancellation
2. Selects cancellation reason
3. Selects billing rule
4. System:
   - Updates status: CANCELLED
   - Records cancellation details
   - Creates tracking event: CANCELLED
   - Sends notifications
   - Handles billing according to rule

### 5.4 Recurring Load Templates

**Template Creation:**
1. Shipper creates load template
2. Specifies:
   - Service type
   - Commodity description
   - Pickup and dropoff facilities
   - Ready time and deadline
   - Access notes
3. Template saved for reuse

**Load Creation from Template:**
1. Shipper selects template
2. System pre-fills form with template data
3. Shipper can modify as needed
4. Submits load request
5. Load created with template reference

**Use Cases:**
- Daily lab runs
- Scheduled route services
- Recurring facility pickups
- Standard delivery routes

### 5.5 Auto-Driver Assignment

**Intelligent Assignment Logic:**
- Considers driver availability
- Matches vehicle requirements
- Considers driver location (deadhead distance)
- Respects driver minimum rate per mile
- Prioritizes drivers with matching certifications
- Considers driver performance ratings

**Assignment Process:**
1. Load becomes available
2. System identifies eligible drivers
3. Calculates profit estimates for each
4. Ranks drivers by suitability
5. Auto-assigns to best match (optional)
6. Or notifies drivers for self-acceptance

---

## 6. COMPLIANCE & MEDICAL FEATURES

### 6.1 HIPAA Compliance

**Data Protection:**
- Secure password hashing (bcryptjs)
- Role-based access control
- Audit logging of all data access
- Encrypted data transmission (HTTPS)
- Secure document storage
- 7+ year data retention policy

**Access Controls:**
- Shippers can only view own data
- Drivers can only view assigned loads
- Admins have full access with audit trail
- No unauthorized data sharing

**Documentation:**
- Chain-of-custody tracking
- Signature verification
- Temperature logging
- Complete audit trail

### 6.2 UN3373 Certification

**Driver Certification Tracking:**
- UN3373 certified flag per driver
- Certification expiration date tracking
- Compliance reminders before expiration
- Document upload for certification proof

**Load Requirements:**
- Specimen category classification
- UN3373 requirement flagging
- Driver matching for certified drivers only
- Compliance documentation

### 6.3 Chain-of-Custody Documentation

**Complete Audit Trail:**
- Every status change recorded with:
  - Actor ID (who performed action)
  - Actor type (DRIVER/ADMIN/SHIPPER/SYSTEM)
  - Precise timestamp
  - Optional GPS coordinates
  - Location text

**Linear Progression Enforcement:**
- Cannot skip statuses (e.g., cannot deliver without pickup)
- Status validation prevents invalid transitions
- Complete history of all changes

**Signature Chain:**
- Pickup signature with driver ID
- Delivery signature with driver ID
- Signer names recorded
- Timestamps for legal compliance
- Immutable after delivery

### 6.4 Temperature Compliance

**Temperature Monitoring:**
- Pickup temperature recording
- Delivery temperature recording
- Precise timestamps for each reading
- Acceptable range specification
- Automatic exception flagging

**Exception Handling:**
- Out-of-range detection
- Exception flagging
- Driver notes explaining exceptions
- Compliance documentation
- Regulatory audit support

**Temperature Requirements:**
- Ambient: No special handling
- Refrigerated: 2-8°C typical
- Frozen: Below 0°C
- Custom ranges per load

### 6.5 Document Integrity

**SHA-256 Hashing:**
- Every document hashed on upload
- Hash stored for integrity verification
- Can verify document hasn't been altered
- Useful for disputes and audits

**Document Locking:**
- Documents locked after delivery
- Prevents modification
- Admin override with audit trail
- Immutability for compliance

**Document Retention:**
- 7+ year retention policy
- Exportable for audits
- HIPAA-compliant storage
- Secure deletion procedures

### 6.6 Driver Attestation

**Pickup Attestation:**
- Driver checkbox confirming:
  - Specimen collected correctly
  - Temperature verified
  - Chain-of-custody maintained
- Timestamped attestation
- Legal coverage

**Delivery Attestation:**
- Driver checkbox confirming:
  - Delivered to correct location
  - Temperature maintained
  - Recipient verified
- Timestamped attestation
- Legal coverage

### 6.7 OSHA Compliance

**Driver Training Tracking:**
- HIPAA training date
- OSHA training date
- Certification expiration tracking
- Compliance reminders

**Safety Documentation:**
- Vehicle insurance tracking
- Vehicle registration
- Driver license tracking
- Emergency contact information

---

## 7. TECHNICAL ARCHITECTURE

### 7.1 Database Schema

**Core Models:**

**Shipper:**
- Company information
- Contact details
- Payment terms and billing
- Subscription tier
- Facilities (one-to-many)
- Load requests (one-to-many)
- Invoices (one-to-many)

**LoadRequest:**
- Service details
- Pickup and dropoff facilities
- Driver assignment
- Status and workflow
- Signatures and temperatures
- Quotes and pricing
- Documents (one-to-many)
- Tracking events (one-to-many)
- GPS tracking points (one-to-many)

**Driver:**
- Personal information
- Vehicle details
- Certifications
- Status
- Load requests (one-to-many)
- Vehicles (one-to-many)
- Documents (one-to-many)

**Facility:**
- Location information
- Contact details
- Access notes
- Belongs to shipper

**Invoice:**
- Billing details
- Payment tracking
- Status
- Links to load requests

**TrackingEvent:**
- Event type and description
- Actor information
- Timestamp
- Location data

**Document:**
- File storage
- Type classification
- Integrity hash
- Lock status

### 7.2 API Architecture

**RESTful API Design:**
- Next.js API Routes
- RESTful conventions
- JSON request/response
- Error handling
- Authentication middleware

**Key API Endpoints:**

**Authentication:**
- POST /api/auth/shipper/login
- POST /api/auth/shipper/signup
- POST /api/auth/driver/login
- POST /api/auth/driver/signup
- POST /api/auth/admin/login
- POST /api/auth/*/forgot-password
- POST /api/auth/*/reset-password

**Load Requests:**
- GET /api/load-requests (list)
- POST /api/load-requests (create)
- GET /api/load-requests/[id] (detail)
- PATCH /api/load-requests/[id] (update)
- POST /api/load-requests/[id]/accept (driver accept)
- POST /api/load-requests/[id]/set-quote (admin quote)
- POST /api/load-requests/[id]/auto-quote (auto quote)
- POST /api/load-requests/[id]/assign-driver (admin assign)
- POST /api/load-requests/[id]/status (status update)
- POST /api/load-requests/[id]/cancel (cancel)

**Invoices:**
- GET /api/invoices (list)
- POST /api/invoices (create)
- GET /api/invoices/[id] (detail)
- GET /api/invoices/[id]/pdf (download PDF)
- POST /api/invoices/[id]/send (email invoice)
- PATCH /api/invoices/[id] (update status)

**Drivers:**
- GET /api/drivers (list)
- GET /api/drivers/[id] (detail)
- GET /api/drivers/[id]/loads (driver's loads)
- POST /api/drivers/[id]/documents (upload)

**Shippers:**
- GET /api/shippers (list)
- GET /api/shippers/[id] (detail)
- GET /api/shippers/[id]/loads (shipper's loads)
- GET /api/shippers/[id]/facilities (facilities)

**Documents:**
- POST /api/load-requests/[id]/documents (upload)
- GET /api/load-requests/[id]/documents (list)
- DELETE /api/load-requests/[id]/documents/[docId] (delete)

**Tracking:**
- GET /api/load-requests/[id]/tracking (events)
- POST /api/load-requests/[id]/gps-tracking (GPS update)

### 7.3 Security Implementation

**Authentication:**
- bcryptjs password hashing (10 rounds)
- Secure password requirements
- Account lockout after failed attempts
- Password reset tokens with expiration
- Session management (localStorage, ready for httpOnly cookies)

**Authorization:**
- Role-based access control
- Route protection middleware
- API endpoint authorization
- Data isolation (shippers see only own data)

**Data Protection:**
- HTTPS encryption (production)
- Secure password storage
- Document integrity hashing
- Audit logging
- Soft delete for data retention

**Account Security:**
- Login attempt tracking
- Account lockout protection
- Password complexity requirements
- Email verification (optional)
- Blocked email list (DNU)

### 7.4 Email Service Architecture

**Multi-Provider Support:**
- Resend (primary)
- SendGrid (fallback)
- SMTP (Gmail, Outlook, custom)
- Mailtrap (testing)

**Email Types:**
- Load status updates
- Quote notifications
- Invoice delivery
- Password reset
- Welcome emails
- Compliance reminders

**Email Features:**
- HTML email templates
- Attachment support
- Delivery tracking
- Error handling
- Fallback providers

### 7.5 Geocoding & Distance Calculation

**Google Maps Integration:**
- Address autocomplete
- Place details lookup
- Reverse geocoding
- Distance calculation
- Route optimization

**Distance Calculation:**
- Driving distance (not straight-line)
- Estimated time calculation
- Route optimization
- Deadhead distance calculation
- Total distance including deadhead

### 7.6 File Storage

**Current Implementation:**
- Base64 encoding in database
- Suitable for development and small files
- Ready for cloud migration

**Cloud Storage Ready:**
- Vercel Blob integration points
- AWS S3 integration points
- Cloudinary support
- UploadThing support

**Document Features:**
- MIME type detection
- File size tracking
- SHA-256 hashing
- Secure URL generation

### 7.7 PDF Generation

**Invoice PDFs:**
- jsPDF library
- jspdf-autotable for tables
- Professional invoice format
- Company branding
- Line item details
- Payment terms display

**Future PDF Types:**
- Bill of Lading (BOL)
- Chain-of-custody reports
- Compliance certificates
- Driver reports

---

## 8. REVENUE MODEL & BUSINESS VALUE

### 8.1 Revenue Streams

**Transaction Fees:**
- Platform takes percentage of each load transaction
- Typical: 10-20% of load value
- Automated calculation and tracking

**Subscription Tiers:**
- **STANDARD:** Self-service, pay-per-load
- **BROKERAGE:** Monthly subscription with dedicated dispatcher
- Tier-based pricing model

**Premium Features:**
- GPS tracking (optional premium)
- Advanced analytics
- Custom integrations
- White-label options

### 8.2 Value Proposition for Shippers

**Cost Savings:**
- Reduces phone calls and manual coordination
- Automated quote generation saves time
- Transparent pricing eliminates negotiation overhead
- Consolidated invoicing reduces accounting work

**Operational Efficiency:**
- Self-service load requests (24/7)
- Real-time tracking reduces status inquiries
- Digital documentation eliminates paper
- Automated notifications reduce communication overhead

**Compliance Assurance:**
- Complete chain-of-custody documentation
- Temperature logging for regulatory compliance
- Digital signatures for legal protection
- 7+ year document retention

**Visibility & Control:**
- Real-time shipment tracking
- Complete load history
- Document access anytime
- Invoice and payment tracking

### 8.3 Value Proposition for Drivers

**Income Opportunities:**
- Access to load board 24/7
- Real-time available loads
- Transparent rate information
- Profit estimation tools

**Operational Tools:**
- Mobile-optimized interface
- Digital signature capture
- Document upload
- GPS navigation integration

**Business Management:**
- Earnings tracking
- Load history
- Performance metrics
- Tax document generation

### 8.4 Value Proposition for Courier Companies

**Digital Transformation:**
- Replaces phone-based dispatch
- Eliminates paper tracking
- Automates invoicing
- Centralizes operations

**Scalability:**
- Handles unlimited shippers and drivers
- Automated workflows reduce staff needs
- Self-service reduces support burden
- Multi-tenant architecture

**Data & Analytics:**
- Complete operational data
- Performance metrics
- Revenue tracking
- Compliance reporting

**Competitive Advantage:**
- Modern, professional platform
- Real-time tracking (industry standard)
- Compliance documentation
- Mobile-first design

### 8.5 Market Opportunity

**Market Size:**
- Medical courier market: $XX billion (growing)
- Healthcare facilities: Thousands in each region
- Independent drivers: Large pool of available couriers
- Digital transformation trend in healthcare

**Competitive Landscape:**
- Most competitors use phone-based systems
- Limited real-time tracking
- Manual invoicing
- Paper-based documentation

**MED DROP Advantages:**
- Modern, web-based platform
- Real-time tracking
- Automated workflows
- Compliance-focused
- Mobile-optimized

---

## 9. SCALABILITY & GROWTH POTENTIAL

### 9.1 Technical Scalability

**Database:**
- PostgreSQL-ready (production)
- Indexed for performance
- Optimized queries
- Connection pooling ready

**API:**
- Serverless architecture (Vercel)
- Auto-scaling
- CDN for static assets
- Edge functions for performance

**Storage:**
- Cloud storage integration ready
- Scalable file storage
- CDN for document delivery

### 9.2 Business Scalability

**Multi-Tenant Architecture:**
- Supports unlimited shippers
- Supports unlimited drivers
- Isolated data per shipper
- Shared driver pool

**Geographic Expansion:**
- No geographic limitations
- Market-specific rate configurations
- Local facility management
- Regional driver pools

**Feature Expansion:**
- Modular architecture
- API-first design
- Plugin-ready structure
- Integration points

### 9.3 Growth Features

**Automation:**
- Automated quote generation
- Auto-driver assignment (optional)
- Automated invoicing
- Automated notifications

**Self-Service:**
- Shipper self-registration
- Driver self-registration
- Self-service load requests
- Self-service tracking

**Analytics:**
- Business intelligence ready
- Performance metrics
- Revenue tracking
- Operational insights

---

## 10. SECURITY & DATA PROTECTION

### 10.1 Data Security

**Encryption:**
- HTTPS/TLS for all communications
- Password hashing (bcryptjs)
- Secure document storage
- Encrypted database connections

**Access Control:**
- Role-based access control (RBAC)
- Route protection
- API authorization
- Data isolation

**Authentication:**
- Secure password requirements
- Account lockout protection
- Password reset tokens
- Session management

### 10.2 Compliance & Auditing

**Audit Logging:**
- Complete audit trail
- All actions logged
- User tracking
- Change history

**Data Retention:**
- 7+ year retention policy
- HIPAA-compliant storage
- Exportable data
- Secure deletion procedures

**Document Integrity:**
- SHA-256 hashing
- Immutable documents
- Verification capabilities
- Legal compliance

### 10.3 Privacy Protection

**Data Isolation:**
- Shippers see only own data
- Drivers see only assigned loads
- Admin access with audit trail
- No unauthorized sharing

**HIPAA Compliance:**
- Secure data handling
- Access controls
- Audit logging
- Document retention
- Encryption

---

## CONCLUSION

MED DROP is a comprehensive, production-ready medical courier management platform that digitizes and automates the complete lifecycle of medical transportation operations. With its modern architecture, compliance-focused features, and scalable design, it provides significant value to healthcare facilities, independent drivers, and courier companies.

The platform's automated workflows, real-time tracking, digital documentation, and billing systems reduce operational overhead while ensuring regulatory compliance. Its multi-tenant architecture and self-service capabilities enable rapid scaling and growth.

For business lenders, the platform represents a scalable SaaS business with multiple revenue streams, low operational costs, and high growth potential in a large and growing market.

For potential buyers, the platform offers a complete, tested, and production-ready solution with modern technology, comprehensive features, and a clear path to market expansion.

For end users, the platform provides professional, efficient, and compliant tools that streamline operations, reduce costs, and ensure regulatory compliance in the critical medical transportation industry.

---

**Document Prepared By:** AI Assistant  
**For:** MED DROP Medical Courier Services  
**Date:** December 2024  
**Version:** 1.0





