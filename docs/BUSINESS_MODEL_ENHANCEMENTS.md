# MED DROP Business Model Enhancements

## Phase 1: Critical Safety & Quality Gates (IMMEDIATE)

### 1.1 Driver PENDING_APPROVAL Status Implementation

**Current State:**
- Driver model only supports: `AVAILABLE`, `ON_ROUTE`, `OFF_DUTY`, `INACTIVE`
- Signup defaults to `AVAILABLE` (immediate access)
- No approval workflow exists

**Required Changes:**

#### A. Database Schema Update
```prisma
// Update DriverStatus enum comment:
// DriverStatus: PENDING_APPROVAL, AVAILABLE, ON_ROUTE, OFF_DUTY, INACTIVE

// Update default:
status String @default("PENDING_APPROVAL") // DriverStatus enum
```

#### B. Signup Flow Update
- Change signup API to set `status: 'PENDING_APPROVAL'`
- Require license and insurance upload during signup (document gating)
- Show "Account Pending Approval" message after signup

#### C. Login & Access Control
- Check driver status on login
- If `PENDING_APPROVAL`: Show approval pending screen (can't access load board)
- If `AVAILABLE`: Normal dashboard access
- Add admin approval endpoint: `POST /api/admin/drivers/[id]/approve`

#### D. UI Components Needed
1. **Pending Approval Screen** (`app/driver/pending-approval/page.tsx`)
   - Message: "Your account is pending admin approval"
   - Show uploaded documents status
   - Contact support link

2. **Admin Approval Queue** (`app/admin/driver-approvals/page.tsx`)
   - List of pending drivers
   - View documents (license, insurance)
   - Approve/Reject buttons
   - Rejection reason field

#### E. Shipper Default Status
- Change shipper signup to `isActive: false`
- Require admin activation before they can request loads
- Add "Business Verification" workflow

---

## Phase 2: Brokerage Package (Premium Service Tier)

### 2.1 Concept Overview

**Brokerage Package = Dedicated Dispatcher Service**

Instead of shippers calling and getting any available driver:
- Premium shippers get a **dedicated dispatcher**
- Dispatcher handles ALL their transportation needs
- Dispatcher assigns drivers based on relationships, preferences, and route optimization
- Higher service level = higher margins

### 2.2 Implementation Plan

#### A. Database Schema Additions

```prisma
// Add to Shipper model:
brokeragePackage Boolean @default(false)
dedicatedDispatcherId String? // User ID of assigned dispatcher
packageStartDate DateTime?
packageEndDate DateTime?
monthlyPackageFee Float? // Monthly fee for brokerage package

// Add to User model (for dispatchers):
assignedShippers Shipper[] @relation("DedicatedDispatcher")
```

#### B. Service Tiers

1. **Standard Tier** (Current Model)
   - Shipper requests loads via web form
   - Loads go to general load board
   - Any available driver can quote/accept
   - Automated matching

2. **Brokerage Package** (New Premium Tier)
   - Dedicated dispatcher assigned
   - Dispatcher receives all load requests first
   - Dispatcher can:
     - Assign to preferred drivers
     - Build multi-load routes
     - Negotiate rates directly
     - Provide white-glove service
   - Higher pricing/margins
   - Priority support

#### C. Workflow Differences

**Standard Flow:**
```
Shipper → Request Load → Load Board → Drivers Quote → Shipper Accepts → Driver Assigned
```

**Brokerage Package Flow:**
```
Shipper → Request Load → Dedicated Dispatcher → Dispatcher Assigns Driver → Load Scheduled
```

#### D. UI/UX Changes

1. **Shipper Dashboard**
   - If `brokeragePackage: true`:
     - Show "Dedicated Dispatcher" card with dispatcher contact info
     - "Request Load" button goes to dispatcher (not general board)
     - Show package benefits/features

2. **Dispatcher Dashboard** (Enhanced)
   - "My Assigned Shippers" section
   - Load request queue for assigned shippers
   - Driver assignment interface
   - Route optimization tools

3. **Admin Panel**
   - Package management
   - Assign dispatchers to shippers
   - Package pricing/billing

### 2.3 Benefits

- **Higher Margins**: Premium pricing for premium service
- **Better Service**: Dedicated attention = happier enterprise clients
- **Driver Relationships**: Dispatchers build relationships with preferred drivers
- **Scalability**: Can charge premium without scaling dispatcher headcount linearly
- **Differentiation**: Enterprise feature that competitors may not offer

### 2.4 Pricing Model Options

1. **Monthly Retainer**: Fixed monthly fee + per-load charges
2. **Volume-Based**: Discounted per-load rate with minimum commitment
3. **Hybrid**: Base monthly fee + reduced per-load rate

---

## Phase 3: Future Enhancements (6-12 Months)

### 3.1 Route Optimization Dashboard
- Multi-load route builder
- Earnings calculator for route combinations
- Driver preference learning

### 3.2 Driver Certification Program
- HIPAA, UN3373 training modules
- Certified driver badge
- Premium load access for certified drivers

### 3.3 Predictive Scheduling
- ML-based load prediction
- Pre-booking for recurring routes
- Reduced empty miles

---

## Implementation Priority

### Immediate (Week 1-2)
1. ✅ Add PENDING_APPROVAL status to schema
2. ✅ Update signup to default to PENDING_APPROVAL
3. ✅ Add document gating (require license/insurance on signup)
4. ✅ Create pending approval UI screen
5. ✅ Add admin approval workflow

### Short-term (Month 1-2)
1. Brokerage package schema additions
2. Dispatcher assignment UI
3. Premium shipper dashboard features
4. Package management admin panel

### Medium-term (Month 3-6)
1. Route optimization tools
2. Driver preference learning
3. Enhanced dispatcher dashboard

---

## Technical Considerations

### Database Migration Strategy
- Add PENDING_APPROVAL status without breaking existing drivers
- Migration script to keep existing drivers as AVAILABLE
- New signups default to PENDING_APPROVAL

### Backward Compatibility
- Existing drivers remain AVAILABLE (grandfathered)
- Existing shippers remain isActive: true (grandfathered)
- New signups follow new approval workflow

### Security & Access Control
- Middleware to check driver status on protected routes
- Admin-only endpoints for approval actions
- Audit logging for approval/rejection actions





