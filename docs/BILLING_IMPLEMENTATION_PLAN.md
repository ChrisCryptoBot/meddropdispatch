# Medical Courier Billing System - Implementation Plan

## ✅ Correct Approach for Healthcare Vendors

**Core Principle:** Invoices + ACH, NOT payment processing

---

## 📋 Phase 1: Invoice-Only Billing System

### Database Schema Updates

#### 1. Add Payment Terms to Shipper Model
```prisma
model Shipper {
  // ... existing fields
  paymentTerms String @default("NET_14") // NET_7, NET_14, NET_30, INVOICE_ONLY
  stripeCustomerId String? // Optional - only if using Stripe ACH
  achDetails String? // Stored offline/encrypted - bank account for ACH
  billingContactName String?
  billingContactEmail String?
  billingAddressLine1 String?
  billingAddressLine2 String?
  billingCity String?
  billingState String?
  billingPostalCode String?
}
```

#### 2. Create Invoice Model
```prisma
model Invoice {
  id String @id @default(cuid())
  invoiceNumber String @unique // e.g., "INV-2024-001"
  loadRequestId String? // Optional - can invoice multiple loads
  
  // Billing Details
  shipperId String
  invoiceDate DateTime @default(now())
  dueDate DateTime // Based on payment terms
  subtotal Float
  tax Float @default(0)
  total Float
  
  // Status Tracking
  status String @default("DRAFT") // DRAFT, SENT, PAID, OVERDUE, CANCELLED
  sentAt DateTime?
  paidAt DateTime?
  paymentMethod String? // "ACH", "CHECK", "WIRE", "OTHER"
  paymentReference String? // Check number, ACH confirmation, etc.
  
  // Optional Stripe Integration
  stripeInvoiceId String? // If using Stripe Invoicing
  
  // Relations
  shipper Shipper @relation(fields: [shipperId], references: [id])
  loadRequests LoadRequest[] // Many-to-many if needed
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([shipperId])
  @@index([status])
  @@index([dueDate])
  @@index([invoiceNumber])
}
```

#### 3. Add Invoice Reference to LoadRequest
```prisma
model LoadRequest {
  // ... existing fields
  invoiceId String? // Link to invoice when billed
  invoicedAt DateTime? // When invoice was generated
  
  // ... relations
  invoice Invoice? @relation(fields: [invoiceId], references: [id])
}
```

---

## 🎯 Implementation Features

### ✅ What TO Build

#### 1. Payment Terms Management
- **Shipper Settings Page:**
  - Select payment terms: Net-7, Net-14, Net-30, Invoice Only
  - Billing contact information
  - Billing address
  - NO payment method storage

#### 2. Invoice Generation
- **Manual Invoice Creation:**
  - Admin/driver marks load as "Ready to Invoice"
  - Generate invoice PDF (or Stripe invoice)
  - Email invoice to billing contact
  - Track invoice number, date, due date

#### 3. Invoice Tracking Dashboard
- **Shipper Portal:**
  - View all invoices
  - Filter by status (Sent, Paid, Overdue)
  - Download invoice PDFs
  - View payment history

- **Admin/Driver Portal:**
  - See all invoices across clients
  - Mark invoices as paid
  - Track overdue invoices
  - Generate aging reports

#### 4. Payment Status Tracking
- **Statuses:**
  - `DRAFT` - Invoice created, not sent
  - `SENT` - Invoice emailed to client
  - `PAID` - Payment received (marked manually)
  - `OVERDUE` - Past due date, not paid
  - `CANCELLED` - Invoice cancelled/voided

#### 5. Optional Stripe ACH Invoicing
- **If you want Stripe:**
  - Create Stripe Customer (not payment method)
  - Generate Stripe Invoice via API
  - Stripe emails invoice with ACH link
  - Webhook to track when paid via Stripe
  - Manual tracking for non-Stripe payments

---

## ❌ What NOT to Build

- ❌ COD (Check on Delivery) - Drivers never handle money
- ❌ Card on file storage - Healthcare facilities don't provide this
- ❌ Prepayment flows - Not standard in healthcare
- ❌ Payment checkout pages - Invoices are sent, not paid on-site
- ❌ Automatic payment collection - Most pay via their AP systems
- ❌ Driver payment collection interface - Drivers deliver, don't collect

---

## 📄 Invoice Generation Flow

### After Delivery Completion:

1. **Load Status = DELIVERED**
2. **Admin/Driver Action:** "Generate Invoice"
3. **System:**
   - Calculate total (quote amount + any adjustments)
   - Determine due date (invoice date + payment terms)
   - Generate invoice number (INV-YYYY-NNN)
   - Create Invoice record
   - Link to LoadRequest
   - Generate PDF (or Stripe invoice)
   - Email to billing contact
   - Set status = SENT

### Payment Received:

1. **You receive payment** (ACH, check, etc.)
2. **Admin Action:** Mark invoice as PAID
3. **System:**
   - Update invoice status = PAID
   - Record payment date
   - Optionally record payment method/reference
   - Update LoadRequest if needed

---

## 🔧 Technical Implementation

### Phase 1.1: Database Schema (1-2 hours)
- Update Prisma schema
- Run migration
- Update TypeScript types

### Phase 1.2: Payment Terms UI (2-3 hours)
- Add payment terms to shipper settings
- Add billing contact fields
- Validation and save

### Phase 1.3: Invoice Model & API (3-4 hours)
- Invoice CRUD API routes
- Invoice number generation
- Due date calculation
- Status management

### Phase 1.4: Invoice Generation (4-6 hours)
- PDF generation library (react-pdf or similar)
- Invoice template
- Manual invoice creation UI
- Email sending

### Phase 1.5: Invoice Tracking Dashboard (3-4 hours)
- Shipper invoice list page
- Admin invoice list page
- Filtering and search
- Status indicators

### Phase 1.6: Optional Stripe Integration (4-6 hours)
- Stripe customer creation
- Stripe invoice API integration
- Webhook handler for payment updates
- Sync with database

---

## 📊 Recommended Libraries

- **PDF Generation:** `@react-pdf/renderer` or `pdfkit`
- **Invoice Numbering:** Custom format (INV-YYYY-NNN)
- **Date Calculations:** `date-fns` (already likely installed)
- **Stripe (Optional):** `stripe` package

---

## 🎯 Priority Order

1. **Start Simple:**
   - Payment terms per shipper
   - Manual invoice creation
   - Basic tracking dashboard

2. **Add Automation:**
   - Auto-generate invoice on delivery
   - Auto-calculate due dates
   - Email notifications

3. **Add Optional Stripe:**
   - Only if clients request it
   - ACH invoicing only
   - Webhook tracking

---

## ✅ Success Metrics

- Can set payment terms per client
- Can generate invoice after delivery
- Can track invoice status
- Can view invoice history
- Clients can download invoices
- No payment processing required

---

## 📝 Notes

- **Most hospitals will still:** Upload invoice to their AP system and pay via ACH separately
- **This is normal and expected** - your system provides visibility, not payment processing
- **Stripe is optional** - start without it, add later if needed
- **Focus on:** Professional invoices, clear due dates, easy tracking

