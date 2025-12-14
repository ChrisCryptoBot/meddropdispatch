# MED DROP Footer Pages - Context & Content Guide

**Purpose:** This document provides comprehensive context for Claude AI to author professional footer pages for MED DROP, including About, Contact Support, Privacy Policy, and Terms of Service.

---

## COMPANY OVERVIEW

### Company Identity
- **Name:** MED DROP
- **Tagline:** "Medical Courier Services Done Right"
- **Mission:** Secure, compliant transportation for medical specimens, pharmaceuticals, and healthcare supplies
- **Brand Values:** Secure. Compliant. Reliable.
- **Industry:** Medical Courier & Logistics Services
- **Target Market:** Healthcare facilities, laboratories, pharmacies, hospitals, clinics, dialysis centers, imaging centers, government healthcare agencies

### Core Value Proposition
MED DROP provides professional medical courier services with:
- Real-time tracking
- Digital signatures
- Temperature monitoring
- UN3373 certified handling
- Chain-of-custody documentation
- HIPAA-compliant operations
- Professional driver network
- 24/7 availability for urgent medical needs

---

## SERVICES & FEATURES

### Service Types Offered
1. **STAT** - Critical/urgent medical courier services with immediate pickup and same-day delivery
2. **SAME_DAY** - Same-day delivery for time-sensitive medical shipments
3. **SCHEDULED_ROUTE** - Planned, recurring routes for regular medical deliveries
4. **OVERFLOW** - Additional capacity for existing routes
5. **GOVERNMENT** - Specialized services for government healthcare agencies

### Specimen Categories Handled
- **UN3373_CATEGORY_B** - Biological substances, Category B (most common)
- **NON_SPECIMEN_MEDICAL** - Medical supplies, equipment, non-biological materials
- **PHARMACEUTICAL_NON_CONTROLLED** - Prescription medications (non-controlled substances)
- **OTHER** - Other medical materials as needed

### Temperature Requirements
- **AMBIENT** - Room temperature
- **REFRIGERATED** - 2-8°C (cold chain)
- **FROZEN** - Below 0°C
- **OTHER** - Custom temperature requirements

### Client Types Served
- Independent Pharmacies
- Clinics
- Laboratories
- Dialysis Centers
- Imaging Centers
- Hospitals
- Government Healthcare Agencies
- Other Healthcare Facilities

---

## PLATFORM FEATURES

### For Shippers (Clients)
1. **Load Request System**
   - Callback queue system - shippers join queue, see their position, receive callback from dispatch
   - Drivers handle all load input during phone call (shippers cannot directly input load details)
   - Automatic shipper creation if new company
   - Welcome emails for new shippers
   - Load confirmation emails with driver info and tracking links

2. **Load Management**
   - Dashboard with all loads
   - Real-time tracking with UPS-style timeline
   - GPS tracking (if driver enables location sharing)
   - Status updates and notifications
   - Quote acceptance/rejection
   - Load deletion (permanent removal)

3. **Facilities Management**
   - Save frequently used pickup/delivery locations
   - Auto-populate facility information
   - Facility details: address, contact, access notes, facility type

4. **Document Management**
   - View all documents (Proof of Pickup, Proof of Delivery, Bill of Lading)
   - Download documents
   - Document filtering and search

5. **Billing & Invoices**
   - View all invoices
   - Payment terms (Net-7, Net-14, Net-30)
   - Invoice status tracking (DRAFT, SENT, PAID, OVERDUE)
   - Download invoice PDFs

6. **Driver Rating System**
   - Rate drivers after delivery (1-5 stars)
   - Provide feedback
   - "Would recommend" checkbox

### For Drivers
1. **Load Board**
   - View all available loads
   - Accept/deny loads
   - Quote submission
   - Smart route optimization
   - GPS location tracking toggle (optional)

2. **Load Management**
   - My Loads view (accepted loads only)
   - Load detail pages
   - Status updates (PICKED_UP, IN_TRANSIT, DELIVERED)
   - Signature capture (pickup and delivery)
   - Temperature recording
   - Document upload

3. **Earnings & Payments**
   - Earnings dashboard with statistics
   - Per-load earnings breakdown
   - Payment settings (ACH, bank account info)
   - Tax information (SSN/EIN, W-9)
   - Payout preferences

4. **Shipper Management**
   - View all shippers
   - Detailed shipper profiles
   - Edit shipper information
   - View shipper loads
   - Deactivate/DNU (Do Not Use) shippers

5. **Vehicle Management**
   - Add/edit vehicles
   - Vehicle types: SEDAN, SUV, VAN, SPRINTER, BOX_TRUCK, REFRIGERATED
   - Vehicle details: make, model, year, plate, nickname
   - Active/inactive status

6. **Documents**
   - View all documents from assigned loads
   - Document filtering and search
   - Document deletion (if not locked)

### Compliance Features
1. **Chain-of-Custody**
   - Complete audit trail of all status changes
   - Actor tracking (who performed action, when, where)
   - Linear status progression enforcement
   - GPS location tracking (optional)

2. **Digital Signatures**
   - Pickup signatures with signer name
   - Delivery signatures with signer name
   - Stored securely in database

3. **Temperature Monitoring**
   - Temperature recording at pickup
   - Temperature recording at delivery
   - Temperature exception handling
   - Min/max temperature range validation

4. **Document Management**
   - Proof of Pickup (POP)
   - Proof of Delivery (POD)
   - Bill of Lading (BOL)
   - Document locking (prevents deletion after delivery)
   - Document upload by drivers and shippers

5. **Tracking Events**
   - Complete timeline of load lifecycle
   - Status changes with timestamps
   - Location information
   - Actor information (driver/admin/shipper)

---

## TECHNICAL PLATFORM DETAILS

### Technology Stack
- **Frontend:** Next.js 14 (App Router), React, TypeScript
- **Backend:** Next.js API Routes, Prisma ORM
- **Database:** SQLite (development), PostgreSQL-ready (production)
- **Authentication:** Email/password with bcryptjs hashing
- **Styling:** Tailwind CSS with custom medical-themed design system
- **Email Service:** Resend API
- **Maps:** Google Maps API (Places, Geocoding, Distance Matrix)
- **Document Storage:** Base64 encoding in database (can migrate to S3/Cloud Storage)

### Design System
- **Primary Color:** Medical Blue (#2563eb)
- **Accent Color:** Medical Teal (#14b8a6)
- **Success Color:** Medical Green (#22c55e)
- **Urgent Color:** Medical Red (#ef4444)
- **Design Style:** Glass morphism with medical-themed color tints
- **Typography:** Fluid responsive typography with gradient text effects

### Security Features
- Password hashing with bcryptjs
- Protected API routes
- Session management with localStorage
- Role-based access control (Shipper, Driver, Admin)
- Secure document storage
- Audit logging for compliance

---

## WORKFLOW & OPERATIONS

### Load Lifecycle
1. **Request Phase**
   - Shipper joins callback queue
   - Dispatch calls shipper
   - Driver inputs load details during phone call
   - Load created with status REQUESTED or SCHEDULED

2. **Quote Phase** (if applicable)
   - Admin/Driver provides quote
   - Shipper accepts/rejects quote
   - Status changes to QUOTE_ACCEPTED or DENIED

3. **Scheduling Phase**
   - Driver assigned to load
   - Status: SCHEDULED
   - GPS tracking can be enabled by driver

4. **Pickup Phase**
   - Driver en route to pickup
   - Status: EN_ROUTE
   - Driver arrives and picks up
   - Status: PICKED_UP
   - Signature captured
   - Temperature recorded (if applicable)
   - Documents uploaded

5. **Transit Phase**
   - Status: IN_TRANSIT
   - Real-time GPS tracking (if enabled)
   - Temperature monitoring (if applicable)

6. **Delivery Phase**
   - Driver arrives at delivery location
   - Status: DELIVERED
   - Signature captured
   - Temperature recorded (if applicable)
   - Documents uploaded

7. **Completion Phase**
   - Status: COMPLETED
   - Invoice generated
   - Shipper can rate driver
   - All documents locked

### Callback Queue System
- Shippers request callback to book loads
- Queue position displayed in real-time
- Auto-updates every 10 seconds
- Dispatch calls shippers in order
- Drivers input all load information during call
- Shippers cannot directly input load details

---

## DATA & PRIVACY

### Data Collection
**Shipper Data:**
- Company name, contact information
- Billing information
- Facility addresses
- Load request details
- Payment information

**Driver Data:**
- Personal information (name, email, phone)
- Vehicle information
- Payment/banking information (for payouts)
- Tax information (SSN/EIN)
- Location data (if GPS tracking enabled)

**Load Data:**
- Pickup/delivery locations
- Service specifications
- Tracking events
- Signatures
- Temperature readings
- Documents

### Data Retention
- **All records retained for 7 years** from date of completion/delivery
- Includes: load requests, tracking events, signatures, temperatures, documents, invoices
- Financial records may be retained longer per tax/accounting requirements
- Data exportable upon request

### Data Security
- Secure password hashing
- Protected API routes
- Role-based access control
- Secure document storage
- Audit logging
- HIPAA-compliant operations (access controls, secure storage)

### HIPAA Compliance
- MED DROP does not typically store Protected Health Information (PHI)
- Maintains access controls on all records
- Audit logs for document access
- Secure storage of all compliance documents
- Chain-of-custody documentation

---

## BILLING & PAYMENTS

### Payment Terms
- **Net-7** - Payment due within 7 days
- **Net-14** - Payment due within 14 days
- **Net-30** - Payment due within 30 days
- **INVOICE_ONLY** - Invoice-only, no automatic payment

### Invoice System
- Automatic invoice generation for delivered loads
- Invoice statuses: DRAFT, SENT, PAID, OVERDUE
- PDF download available
- Payment tracking
- Billing contact management

### Driver Payments
- ACH payments to driver bank accounts
- Payment settings configuration
- Tax information collection (W-9)
- Payout preferences (frequency, minimum)

---

## CONTACT & SUPPORT

### Support Channels
- **Email:** support@meddrop.com (primary)
- **Phone:** Available 24/7 for urgent medical courier needs
- **Callback Queue:** For load booking requests
- **In-App Support:** Support page in shipper/driver dashboards

### Support Availability
- **24/7** for urgent medical courier needs
- Business hours for general inquiries
- Response time: Typically within 24 hours for email

### Support Topics
- Load booking and scheduling
- Tracking inquiries
- Billing and invoice questions
- Technical support
- Account management
- Compliance questions
- Data export requests

---

## LEGAL & COMPLIANCE

### Regulatory Compliance
- **UN3373 Certification** - Handles Category B biological substances
- **HIPAA Compliance** - Secure handling of healthcare-related information
- **Chain-of-Custody** - Complete audit trail for all shipments
- **Temperature Control** - Monitored temperature-sensitive shipments
- **Documentation** - Comprehensive proof of delivery and pickup

### Service Guarantees
- Professional driver network
- Real-time tracking
- Digital signatures
- Temperature monitoring
- Compliance documentation
- Secure handling

### Liability & Insurance
- Professional liability coverage
- Cargo insurance
- Driver background checks
- Vehicle requirements
- Compliance with medical courier regulations

### Cancellation Policy
- Client cancellations
- Driver no-shows
- Vehicle breakdowns
- Facility closures
- Weather-related cancellations
- Billing rules: BILLABLE, PARTIAL, NOT_BILLABLE

---

## USER AGREEMENTS & POLICIES

### Account Responsibilities
**Shippers:**
- Provide accurate company and contact information
- Maintain secure account credentials
- Provide accurate load information during callback
- Pay invoices according to payment terms
- Comply with medical courier regulations

**Drivers:**
- Maintain accurate profile and vehicle information
- Provide secure payment/banking information
- Comply with all medical courier regulations
- Maintain vehicle in good condition
- Complete deliveries as assigned
- Enable GPS tracking if selected

### Prohibited Activities
- Providing false information
- Unauthorized access to accounts
- Violation of medical courier regulations
- Failure to maintain compliance standards
- Misuse of platform features

### Account Termination
- Violation of terms of service
- Non-payment of invoices
- Compliance violations
- Fraudulent activity
- Account deactivation by admin

### Data Rights
- Right to access personal data
- Right to request data export
- Right to request data deletion (subject to retention policy)
- Right to update account information
- Right to opt-out of certain communications

---

## CONTENT TONE & STYLE

### Writing Style
- **Professional** - Medical/healthcare industry appropriate
- **Clear** - Easy to understand for all user types
- **Comprehensive** - Cover all important details
- **Compliant** - Legal and regulatory language where needed
- **User-Friendly** - Accessible to both technical and non-technical users

### Key Messaging Points
- Security and compliance are paramount
- Professional medical courier services
- Technology-enabled but human-centered
- 24/7 availability for urgent needs
- Complete transparency and tracking
- HIPAA-compliant operations
- Chain-of-custody documentation

### Medical Industry Context
- Emphasize compliance and regulatory adherence
- Highlight security and privacy protections
- Stress professional handling of medical materials
- Mention certifications (UN3373)
- Reference temperature control and monitoring
- Emphasize chain-of-custody documentation

---

## FOOTER PAGE REQUIREMENTS

### About MED DROP Page
**Should Include:**
- Company mission and values
- Services offered
- Key features and capabilities
- Target market and client types
- Compliance and certifications
- Technology platform overview
- Why choose MED DROP
- Company tagline and brand values

### Contact Support Page
**Should Include:**
- Primary contact methods (email, phone)
- Support availability (24/7 for urgent needs)
- Support topics covered
- Response time expectations
- Callback queue information
- In-app support options
- Emergency contact procedures
- Business hours (if applicable)

### Privacy Policy Page
**Should Include:**
- Data collection practices
- Data usage and sharing
- Data retention policy (7 years)
- Data security measures
- HIPAA compliance information
- User rights (access, export, deletion)
- Cookie/tracking policy
- Third-party services
- Contact for privacy inquiries
- Updates to privacy policy

### Terms of Service Page
**Should Include:**
- Service description
- User account responsibilities
- Acceptable use policy
- Payment terms and billing
- Cancellation and refund policy
- Liability limitations
- Insurance coverage
- Compliance requirements
- Account termination policy
- Dispute resolution
- Governing law
- Updates to terms
- Contact for legal inquiries

---

## ADDITIONAL CONTEXT

### Brand Voice
- Professional yet approachable
- Trustworthy and reliable
- Technology-forward but human-centered
- Compliance-focused
- Service-oriented

### Target Audience
- Healthcare facility administrators
- Laboratory managers
- Pharmacy managers
- Hospital logistics coordinators
- Medical courier drivers
- Healthcare compliance officers

### Competitive Advantages
- Real-time GPS tracking
- Digital signatures
- Temperature monitoring
- Complete chain-of-custody
- Professional driver network
- 24/7 availability
- HIPAA-compliant
- UN3373 certified
- Modern technology platform
- Comprehensive documentation

---

## TECHNICAL IMPLEMENTATION NOTES

### Current Footer Links (from homepage)
- About MED DROP
- Contact Support
- Privacy Policy
- Terms of Service

### Page Structure Recommendations
- Use medical-themed design system (glass-primary, glass-accent)
- Maintain consistent header with logo
- Use medical blue/teal color scheme
- Include footer navigation
- Mobile-responsive design
- Accessible markup

### Content Format
- Clear headings and sections
- Bullet points for lists
- Professional language
- Legal accuracy where required
- User-friendly explanations
- Contact information clearly displayed

---

**END OF CONTEXT DOCUMENT**

This document provides all necessary context for Claude AI to author professional, accurate, and comprehensive footer pages that reflect MED DROP's services, features, compliance requirements, and brand identity.

