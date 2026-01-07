# Backend-Frontend Gap Audit Report
**Date:** 2025-01-07  
**Status:** Complete audit of API endpoints vs Frontend UI

## Summary
This report identifies backend API endpoints that exist but do not have corresponding frontend UI components or pages.

---

## 🔴 HIGH PRIORITY (Business-Critical Missing UI)

### 1. Invoice Adjustments
- **Endpoint:** `POST /api/invoices/[id]/adjustments`
- **Purpose:** Create invoice adjustments (credits, debits, disputes, corrections)
- **Current Status:** ❌ No frontend UI
- **Impact:** Cannot handle invoice disputes or corrections through UI
- **Recommended Location:** `/admin/invoices/[id]` or `/driver/business/invoices/[id]`
- **Priority:** HIGH - Critical for financial operations

### 2. Invoice Batch Generation
- **Endpoint:** `POST /api/invoices/batch`
- **Purpose:** Generate invoices for multiple completed loads at once
- **Current Status:** ❌ No frontend UI
- **Impact:** Admins must create invoices one-by-one instead of batch processing
- **Recommended Location:** `/admin/invoices` - Add "Batch Generate" button
- **Priority:** HIGH - Efficiency critical for operations

### 3. Load Notes Management
- **Endpoints:** 
  - `GET /api/load-requests/[id]/notes`
  - `POST /api/load-requests/[id]/notes`
  - `PATCH /api/load-requests/[id]/notes/[noteId]`
  - `DELETE /api/load-requests/[id]/notes/[noteId]`
- **Purpose:** Add internal/external notes to loads for communication
- **Current Status:** ✅ HAS UI - `LoadNotes` component used in `/admin/loads/[id]`
- **Missing:** ⚠️ Not used in `/driver/loads/[id]` or `/shipper/loads/[id]`
- **Recommended Location:** Add `LoadNotes` component to driver and shipper load detail pages
- **Priority:** MEDIUM - Extend existing UI to other portals

### 4. Load Restore (Soft Delete Recovery)
- **Endpoint:** `POST /api/load-requests/[id]/restore`
- **Purpose:** Restore soft-deleted load requests
- **Current Status:** ❌ No frontend UI
- **Impact:** Cannot recover accidentally deleted loads
- **Recommended Location:** `/admin/loads` - Add "Deleted Loads" filter/view
- **Priority:** HIGH - Data recovery critical

### 5. Driver/Shipper Restore
- **Endpoints:**
  - `POST /api/drivers/[id]/restore`
  - `POST /api/shippers/[id]/restore`
- **Purpose:** Restore soft-deleted accounts
- **Current Status:** ❌ No frontend UI
- **Impact:** Cannot recover deleted accounts
- **Recommended Location:** `/admin/drivers` and `/admin/shippers` - Add "Deleted" filter/view
- **Priority:** HIGH - Account recovery critical

### 6. Shipper Notification Preferences
- **Endpoints:**
  - `GET /api/shippers/[id]/notification-preferences`
  - `PATCH /api/shippers/[id]/notification-preferences`
- **Purpose:** Manage email/SMS/in-app notification preferences per shipper
- **Current Status:** ⚠️ Partial - UI exists in `/shipper/settings` but uses localStorage instead of API
- **Impact:** Preferences not persisted to database, lost on logout
- **Recommended Location:** Update `/shipper/settings` to use API endpoints instead of localStorage
- **Priority:** HIGH - Data persistence critical

### 7. Facility Management (CRUD)
- **Endpoints:**
  - `GET /api/facilities/[id]`
  - `PATCH /api/facilities/[id]`
  - `DELETE /api/facilities/[id]`
- **Purpose:** Edit/delete saved facilities
- **Current Status:** ⚠️ Partial - Delete uses `/api/shippers/[id]/facilities?facilityId=`, but edit uses different endpoint
- **Impact:** Edit functionality may not use standard facility API
- **Recommended Location:** Verify `/shipper/facilities` uses proper facility endpoints
- **Priority:** MEDIUM - Verify implementation consistency

---

## 🟡 MEDIUM PRIORITY (Operational Efficiency)

### 8. Auto-Quote Feature
- **Endpoints:**
  - `GET /api/load-requests/[id]/auto-quote` (preview)
  - `POST /api/load-requests/[id]/auto-quote` (apply)
- **Purpose:** Automated quote generation based on distance/rate calculations
- **Current Status:** ❌ No frontend UI
- **Impact:** Admins must manually calculate quotes
- **Recommended Location:** `/admin/loads/[id]` - Add "Auto-Quote" button
- **Priority:** MEDIUM - Efficiency improvement

### 9. Auto-Assign Driver Feature
- **Endpoints:**
  - `GET /api/load-requests/[id]/auto-assign-driver` (preview)
  - `POST /api/load-requests/[id]/auto-assign-driver` (assign)
- **Purpose:** Automated driver assignment based on location/availability
- **Current Status:** ❌ No frontend UI
- **Impact:** Admins must manually select drivers
- **Recommended Location:** `/admin/loads/[id]` - Add "Auto-Assign" button
- **Priority:** MEDIUM - Efficiency improvement

### 10. Load Bulk Operations
- **Endpoint:** `POST /api/load-requests/bulk`
- **Purpose:** Bulk status updates, driver assignments, cancellations
- **Current Status:** ❌ No frontend UI
- **Impact:** Cannot perform bulk actions on multiple loads
- **Recommended Location:** `/admin/loads` - Add bulk selection checkboxes
- **Priority:** MEDIUM - Efficiency for large operations

### 11. Convert Quote to Load
- **Endpoint:** `POST /api/load-requests/[id]/convert-to-load`
- **Purpose:** Convert QUOTE_REQUESTED to SCHEDULED after phone confirmation
- **Current Status:** ❌ No frontend UI
- **Impact:** Workflow gap in quote-to-load conversion
- **Recommended Location:** `/admin/loads/[id]` - Add "Convert to Load" button
- **Priority:** MEDIUM - Workflow completion

### 12. Shipper Data Export
- **Endpoint:** `GET /api/shippers/[id]/export?type=loads|documents|chain-of-custody|all`
- **Purpose:** Export shipper data (loads, documents, chain-of-custody logs)
- **Current Status:** ❌ No frontend UI
- **Impact:** Shippers cannot export their data for records
- **Recommended Location:** `/shipper/settings` - Add "Export Data" button
- **Priority:** MEDIUM - Compliance and data portability

### 13. Blocked Emails Management
- **Endpoints:**
  - `GET /api/blocked-emails`
  - `POST /api/blocked-emails`
  - `PATCH /api/blocked-emails/[id]`
  - `DELETE /api/blocked-emails/[id]`
- **Purpose:** Manage blocked email addresses (spam prevention)
- **Current Status:** ❌ No frontend UI
- **Impact:** Cannot manage blocked emails through UI
- **Recommended Location:** `/admin` - Add "Blocked Emails" page
- **Priority:** MEDIUM - Spam management

---

## 🟢 LOW PRIORITY (Nice-to-Have / Future Features)

### 14. Driver Payment Settings API
- **Status:** ⚠️ API endpoint may not exist (file not found)
- **Current Frontend:** `/driver/payments` exists but may not be fully connected
- **Priority:** LOW - Verify if endpoint exists

### 15. Driver Payouts API
- **Status:** ⚠️ API endpoint may not exist (file not found)
- **Current Frontend:** `/driver/payments` has "Payout History" tab (placeholder)
- **Priority:** LOW - Future feature

### 16. Driver Tax Documents API
- **Status:** ⚠️ API endpoint may not exist (file not found)
- **Priority:** LOW - Future feature

### 17. Load Templates (Full CRUD)
- **Endpoints:**
  - `GET /api/load-templates`
  - `POST /api/load-templates`
  - `GET /api/load-templates/[id]`
  - `PATCH /api/load-templates/[id]`
  - `DELETE /api/load-templates/[id]`
- **Current Status:** ⚠️ Partial - Templates can be created/used but not fully managed
- **Impact:** Cannot edit or delete templates
- **Priority:** LOW - Template management enhancement

---

## ✅ ENDPOINTS WITH FRONTEND (Verified)

These endpoints have corresponding frontend UI:
- ✅ Invoice Send (`/api/invoices/[id]/send`) - Used in `/admin/invoices`
- ✅ Load Request Call (`/api/load-requests/[id]/request-call`) - Used in `/shipper/loads/[id]`
- ✅ Load Deny (`/api/load-requests/[id]/deny`) - Used in `/driver/dashboard`
- ✅ Load Approve/Reject Driver Quote - Used in `/shipper/loads/[id]`
- ✅ Load Submit Quote - Used in `/driver/dashboard`
- ✅ Callback Queue - Full UI in `/driver/callback-queue`
- ✅ Route Optimization - Used in `/driver/dashboard`
- ✅ Compliance Reminders - Used in `/admin/compliance`
- ✅ Driver Ratings - Used in `/driver/profile`
- ✅ Load Drafts - Used in `/driver/manual-load`
- ✅ Load Templates (Create/Use) - Used in `/shipper/templates`
- ✅ Shipper DNU - Used in `/admin/shippers` and `/driver/shippers/[id]`

---

## 📋 RECOMMENDED IMPLEMENTATION ORDER

### Phase 1 (Critical - Immediate)
1. Invoice Adjustments UI
2. Load Notes Management UI
3. Shipper Notification Preferences UI
4. Facility Management (Edit/Delete)

### Phase 2 (High Value - Next Sprint)
5. Invoice Batch Generation UI
6. Load/Driver/Shipper Restore UI
7. Auto-Quote Feature UI
8. Auto-Assign Driver Feature UI

### Phase 3 (Efficiency - Future)
9. Load Bulk Operations UI
10. Convert Quote to Load UI
11. Shipper Data Export UI
12. Blocked Emails Management UI

---

## 🔍 NOTES

- **System Endpoints (No UI Needed):**
  - Cron jobs (`/api/cron/*`) - Automated background tasks
  - Webhooks (`/api/webhooks/*`) - External system integration
  - Health checks (`/api/health`) - System monitoring
  - Debug/Test endpoints (`/api/test/*`, `/api/debug/*`) - Development only

- **Partial Implementations:**
  - Some endpoints have partial UI (e.g., templates can be created but not edited)
  - Some endpoints are called but UI may be incomplete (e.g., payment settings)

- **Fleet Management:**
  - All fleet endpoints have frontend UI in `/driver/business` (Team tab)
  - Recently updated with Tier 2.11 Admin permissions

---

**Total Missing UI:** 13-17 endpoints (depending on payment/tax document endpoints existence)  
**Critical Missing:** 7 endpoints  
**Medium Priority:** 6 endpoints  
**Low Priority:** 4 endpoints

