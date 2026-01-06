# Driver Notification System

## Overview
Drivers receive in-app notifications for important events related to their loads and account. Notifications appear in the `/driver/notifications` page and can be marked as read.

## When Drivers Receive Notifications

### 1. **Shipper Request Call** ⭐ NEW
- **Trigger**: Shipper clicks "Request Call" button on load detail page
- **When**: Only when load status is `SCHEDULED`, `EN_ROUTE`, `PICKED_UP`, or `IN_TRANSIT`
- **Purpose**: Allows shipper to request contact when driver is en route and may not answer immediately
- **Notification Includes**: 
  - Shipper name and phone number
  - Load tracking code
  - Direct "Call Shipper" button
- **Why Not Redundant**: This is a time-sensitive request that needs immediate attention, separate from general load updates

### 2. **New Load Assigned**
- **Trigger**: Driver accepts a load from the load board
- **When**: Immediately after driver accepts
- **Purpose**: Confirm load assignment
- **Why Not Redundant**: Driver needs confirmation that their acceptance was successful

### 3. **Load Status Changed** (Important Statuses Only)
- **Trigger**: Load status changes to important milestones
- **When**: Status changes to `SCHEDULED`, `PICKED_UP`, `IN_TRANSIT`, `DELIVERED`, or `CANCELLED`
- **Purpose**: Keep driver informed of critical status changes
- **Why Not Redundant**: Only notifies for major milestones, not every minor update (avoids notification spam)

### 4. **Load Cancelled**
- **Trigger**: Load is cancelled by shipper, admin, or system
- **When**: Immediately when cancellation occurs
- **Purpose**: Alert driver that assigned load is no longer active
- **Why Not Redundant**: Critical information that affects driver's schedule

### 5. **Quote Approved/Rejected**
- **Trigger**: Shipper approves or rejects driver's quote
- **When**: Immediately after shipper makes decision
- **Purpose**: Inform driver of quote decision
- **Why Not Redundant**: Driver needs to know if their quote was accepted to proceed

### 6. **Document Uploaded** (by Shipper)
- **Trigger**: Shipper uploads a document to a load
- **When**: Immediately after upload
- **Purpose**: Alert driver to new documents they may need
- **Why Not Redundant**: Driver may need to review documents before pickup/delivery

## Notifications That Are NOT Sent (To Avoid Redundancy)

### ❌ Email Notifications
- Email notifications are separate from in-app notifications
- Drivers receive emails for major events, but in-app notifications are for actionable items

### ❌ Minor Status Updates
- Status changes like `QUOTED`, `QUOTE_ACCEPTED` don't trigger notifications (driver already knows)
- Only major workflow milestones trigger notifications

### ❌ Driver's Own Actions
- Driver uploading documents → No notification (they did it)
- Driver updating status → No notification (they did it)
- Driver accepting load → Notification only to confirm (not redundant because it confirms the action)

### ❌ Load Board Updates
- New loads appearing on load board → No notification (driver can see them)
- Load removed from board → No notification (driver didn't accept it)

## Notification Priority

1. **High Priority** (Action Required):
   - `SHIPPER_REQUEST_CALL` - Driver should call when safe
   - `LOAD_CANCELLED` - Driver needs to know immediately

2. **Medium Priority** (Important Updates):
   - `NEW_LOAD_ASSIGNED` - Confirmation of assignment
   - `QUOTE_APPROVED` / `QUOTE_REJECTED` - Decision on driver's quote
   - `LOAD_STATUS_CHANGED` (to DELIVERED) - Load completion

3. **Low Priority** (Informational):
   - `DOCUMENT_UPLOADED` - New document available
   - `LOAD_STATUS_CHANGED` (to SCHEDULED, PICKED_UP, IN_TRANSIT) - Status updates

## Implementation Details

### Notification Types
```typescript
type NotificationType =
  | 'SHIPPER_REQUEST_CALL'    // Shipper wants to talk
  | 'NEW_LOAD_ASSIGNED'       // Load assigned to driver
  | 'LOAD_CANCELLED'          // Load cancelled
  | 'LOAD_STATUS_CHANGED'     // Important status change
  | 'QUOTE_APPROVED'          // Driver's quote approved
  | 'QUOTE_REJECTED'          // Driver's quote rejected
  | 'DOCUMENT_UPLOADED'       // New document from shipper
```

### API Endpoints
- `GET /api/drivers/[id]/notifications` - Get all notifications
- `PATCH /api/drivers/[id]/notifications` - Mark as read
- `POST /api/load-requests/[id]/request-call` - Shipper requests call

### Notification Display
- Unread notifications are highlighted
- Clicking notification marks it as read and navigates to related page
- "Mark All Read" button for bulk actions
- Real-time updates (polling every 30 seconds recommended)

## Future Enhancements
- Push notifications for mobile apps
- SMS notifications for critical alerts (when driver is en route)
- Notification preferences (driver can choose what to receive)
- Sound/vibration for high-priority notifications

