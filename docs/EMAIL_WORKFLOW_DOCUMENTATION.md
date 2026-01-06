# Complete Email Workflow Documentation

## Overview
This document outlines all emails sent throughout the complete end-to-end load workflow, from initial load creation to final delivery and invoicing.

---

## Email Types & Timeline

### 1. **Welcome Emails** (Account Creation)

#### Shipper Welcome Email
- **When:** 
  - When a new shipper signs up via `/api/auth/shipper/signup`
  - When a new shipper is created during load request submission (if shipper doesn't exist)
- **Recipient:** New shipper
- **Function:** `sendShipperWelcomeEmail()`
- **Content:** Welcome message, account credentials, portal access instructions

#### Driver Welcome Email
- **When:** When a new driver signs up via `/api/auth/driver/signup`
- **Recipient:** New driver
- **Function:** `sendDriverWelcomeEmail()`
- **Content:** Welcome message, account credentials, portal access instructions

---

### 2. **Load Creation Emails**

#### Load Confirmation Email (Shipper)
- **When:** 
  - When a load is created via public form (`/api/load-requests`)
  - When a driver creates a manual load (`/api/load-requests/driver-manual`)
  - When a quote is set for a load (`/api/load-requests/[id]/set-quote`)
- **Recipient:** Shipper
- **Function:** `sendLoadConfirmationEmail()`
- **Content:** 
  - Load details (pickup, dropoff, service type)
  - Driver information (if assigned)
  - Rate information (if available)
  - GPS tracking link (if enabled)
  - UPS-style tracking link
  - Links to sign up/log in to portal
- **Special:** If shipper is new, welcome email is sent FIRST, then this confirmation email

#### Driver Confirmation Email
- **When:** When a driver creates a manual load and assigns it to another driver
- **Recipient:** Assigned driver (if different from creator)
- **Function:** `sendDriverConfirmationEmail()`
- **Content:** 
  - Load details
  - Shipper information
  - Rate information
  - Links to driver portal

#### New Load Notification (Internal)
- **When:** When a load is created via public form
- **Recipient:** Internal team (dispatch@meddrop.com)
- **Function:** `sendNewLoadNotification()`
- **Content:** 
  - New load alert
  - Tracking code
  - Company name
  - Service type
  - Pickup/dropoff cities

---

### 3. **Load Status Update Emails**

#### Load Status Email (Shipper)
- **When:** 
  - **Every time** load status is updated via `/api/load-requests/[id]/status`
  - When shipper approves driver quote (`/api/load-requests/[id]/approve-driver-quote`)
  - When shipper accepts a load (`/api/load-requests/[id]/accept-shipper`)
- **Recipient:** Shipper
- **Function:** `sendLoadStatusEmail()`
- **Content:** 
  - Current status and label
  - Driver name (if assigned)
  - Pickup/dropoff addresses
  - ETA (if available)
  - Quote amount (if available)
  - Tracking link
- **Statuses Triggered:** All status changes (REQUESTED, QUOTED, SCHEDULED, EN_ROUTE, PICKED_UP, IN_TRANSIT, DELIVERED, etc.)

#### Driver Load Status Email
- **When:** When load status changes to key workflow points
- **Recipient:** Driver
- **Function:** `sendDriverLoadStatusEmail()`
- **Content:** 
  - Status update
  - Shipper company name
  - Pickup/dropoff addresses
  - Ready time and delivery deadline
  - Link to driver portal
- **Statuses Triggered:** EN_ROUTE, PICKED_UP, IN_TRANSIT, DELIVERED

---

### 4. **Driver Acceptance Emails**

#### Driver Accepted Notification (Shipper)
- **When:** When driver accepts a load via `/api/load-requests/[id]/accept`
- **Recipient:** Shipper
- **Function:** `sendDriverAcceptedNotification()` (currently placeholder)
- **Content:** 
  - Driver name and phone
  - Notification that driver will call
  - Tracking link

#### Load Scheduled Notification
- **When:** When driver accepts a load (load becomes SCHEDULED)
- **Recipient:** Both shipper and driver
- **Function:** `sendLoadScheduledNotification()` (currently placeholder)
- **Content:** 
  - Confirmation that load is scheduled
  - Pickup/dropoff addresses
  - Ready time and delivery deadline
  - Tracking links

---

### 5. **Delivery Completion Email**

#### Delivery Congratulations Email (with Invoice)
- **When:** When load status is changed to DELIVERED via `/api/load-requests/[id]/status`
- **Recipient:** Shipper
- **Function:** `sendDeliveryCongratulationsEmail()`
- **Content:** 
  - Delivery confirmation
  - Delivery time
  - Recipient name (if available)
  - Invoice PDF attachment
  - Invoice number and total amount
  - Tracking link
- **Special:** 
  - Invoice is auto-generated when status becomes DELIVERED
  - Invoice status is updated to 'SENT' when email is sent
  - Invoice appears on shipper's invoice page immediately

---

### 6. **Invoice Emails**

#### Invoice Email
- **When:** When invoice is manually sent via `/api/invoices/[id]/send`
- **Recipient:** Shipper
- **Function:** `sendInvoiceEmail()` (from `lib/invoicing.ts`)
- **Content:** 
  - Invoice PDF attachment
  - Invoice number
  - Invoice date and due date
  - Total amount
  - Payment instructions
- **Note:** This is separate from the delivery email invoice attachment

---

### 7. **Account Management Emails**

#### Forgot Password Email
- **When:** When driver requests password reset via `/api/auth/driver/forgot-password`
- **Recipient:** Driver
- **Function:** `sendForgotPasswordEmail()`
- **Content:** 
  - Username (email)
  - Temporary password
  - Instructions to change password

---

## Complete Workflow Timeline

### Scenario: New Shipper Creates Load → Driver Accepts → Load Delivered

1. **Load Created** (via public form)
   - ✅ Shipper Welcome Email (if new shipper)
   - ✅ Load Confirmation Email (to shipper)
   - ✅ New Load Notification (to internal team)

2. **Driver Accepts Load**
   - ✅ Driver Accepted Notification (to shipper) - *placeholder*
   - ✅ Load Scheduled Notification (to shipper & driver) - *placeholder*
   - ✅ Load Status Email (to shipper) - status: SCHEDULED
   - ✅ Driver Load Status Email (to driver) - status: SCHEDULED

3. **Status Updates** (as driver progresses)
   - ✅ Load Status Email (to shipper) - status: EN_ROUTE
   - ✅ Driver Load Status Email (to driver) - status: EN_ROUTE
   - ✅ Load Status Email (to shipper) - status: PICKED_UP
   - ✅ Driver Load Status Email (to driver) - status: PICKED_UP
   - ✅ Load Status Email (to shipper) - status: IN_TRANSIT
   - ✅ Driver Load Status Email (to driver) - status: IN_TRANSIT

4. **Load Delivered**
   - ✅ Invoice auto-generated
   - ✅ Delivery Congratulations Email (to shipper) with invoice PDF
   - ✅ Invoice status updated to 'SENT'
   - ✅ Load Status Email (to shipper) - status: DELIVERED
   - ✅ Driver Load Status Email (to driver) - status: DELIVERED

---

## Email Summary Table

| Email Type | Recipient | Trigger | Function | Status |
|------------|-----------|---------|----------|--------|
| Shipper Welcome | Shipper | New account | `sendShipperWelcomeEmail()` | ✅ Active |
| Driver Welcome | Driver | New account | `sendDriverWelcomeEmail()` | ✅ Active |
| Load Confirmation | Shipper | Load created | `sendLoadConfirmationEmail()` | ✅ Active |
| Driver Confirmation | Driver | Manual load assigned | `sendDriverConfirmationEmail()` | ✅ Active |
| New Load Notification | Internal | Load created | `sendNewLoadNotification()` | ✅ Active |
| Load Status Update | Shipper | Status change | `sendLoadStatusEmail()` | ✅ Active |
| Driver Status Update | Driver | Key statuses | `sendDriverLoadStatusEmail()` | ✅ Active |
| Driver Accepted | Shipper | Driver accepts | `sendDriverAcceptedNotification()` | ⚠️ Placeholder |
| Load Scheduled | Both | Load scheduled | `sendLoadScheduledNotification()` | ⚠️ Placeholder |
| Delivery Congratulations | Shipper | Load delivered | `sendDeliveryCongratulationsEmail()` | ✅ Active |
| Invoice Email | Shipper | Manual send | `sendInvoiceEmail()` | ✅ Active |
| Forgot Password | Driver | Password reset | `sendForgotPasswordEmail()` | ✅ Active |

---

## Notes

- **Placeholder Functions:** Some email functions (`sendDriverAcceptedNotification`, `sendLoadScheduledNotification`) are currently placeholders and only log to console. These should be implemented for complete functionality.

- **Email Failures:** Most email sending is wrapped in try-catch blocks to prevent load creation/updates from failing if email sending fails. Emails are logged but don't block the workflow.

- **Invoice Integration:** Invoices are automatically generated when a load is marked as DELIVERED and are attached to the delivery congratulations email. The invoice status is updated to 'SENT' when the email is successfully sent.

- **GPS Tracking:** Load confirmation emails include GPS tracking links if the driver has enabled location tracking.

- **New Shipper Flow:** If a shipper is new (created during load submission), they receive a welcome email FIRST, followed by the load confirmation email.

---

## Total Email Count per Complete Workflow

For a typical load from creation to delivery:
- **Shipper receives:** 7-9 emails (welcome if new, confirmation, status updates, delivery with invoice)
- **Driver receives:** 4-5 emails (status updates at key points)
- **Internal team receives:** 1 email (new load notification)

**Total: 12-15 emails per complete load workflow**

