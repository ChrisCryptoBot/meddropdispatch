# Load Creation Page Audit & Upgrade Plan

## 1. File Locations

### Main Load Creation Form
- **File:** `app/driver/manual-load/page.tsx`
- **API Endpoint:** `app/api/load-requests/driver-manual/route.ts`
- **Validation Schema:** `lib/validation.ts` (createLoadRequestSchema)
- **Database Schema:** `prisma/schema.prisma` (LoadRequest model)
- **Rate Calculator:** `components/features/RateCalculator.tsx`

### Current Interface/Schema
- **TypeScript Types:** `lib/types.ts` (LoadRequestFormData)
- **Zod Schema:** `lib/validation.ts` (createLoadRequestSchema)
- **Prisma Model:** `prisma/schema.prisma` (LoadRequest)

---

## 2. Field Audit: Present vs Missing

### A. Basic Load Info ✅ PARTIALLY PRESENT

| Field | Status | Current Implementation | Notes |
|-------|--------|----------------------|-------|
| Service type | ✅ PRESENT | `serviceType` enum: STAT, SAME_DAY, SCHEDULED_ROUTE, OVERFLOW, GOVERNMENT, OTHER | Missing: CRITICAL_STAT, ROUTINE |
| Commodity/description | ✅ PRESENT | `commodityDescription` (free text) | ✅ Complete |
| Specimen category | ✅ PRESENT | `specimenCategory`: UN3373, NON_SPECIMEN, PHARMACEUTICAL, OTHER | Missing: UN3373_CATEGORY_B, SUPPLIES, EQUIPMENT, PAPERWORK |
| Temperature requirement | ✅ PRESENT | `temperatureRequirement`: AMBIENT, REFRIGERATED, FROZEN, OTHER | ✅ Complete |
| One-time vs recurring | ❌ MISSING | Not in schema or form | **NEEDS ADDITION** |

### B. Scheduling ✅ PARTIALLY PRESENT

| Field | Status | Current Implementation | Notes |
|-------|--------|----------------------|-------|
| Pickup date/time | ✅ PRESENT | `readyTime` (DateTime) | ⚠️ Timezone handling not explicit |
| Delivery date/time | ✅ PRESENT | `deliveryDeadline` (DateTime) | ⚠️ Timezone handling not explicit |
| Direct drive required? | ❌ MISSING | Not in schema or form | **NEEDS ADDITION** |

### C. Locations ✅ PRESENT

| Field | Status | Current Implementation | Notes |
|-------|--------|----------------------|-------|
| Pickup location name | ✅ PRESENT | `pickupFacilityName` | ✅ Complete |
| Pickup address | ✅ PRESENT | `pickupAddressLine1`, `pickupCity`, `pickupState`, `pickupPostalCode` | ✅ Complete |
| Pickup contact name | ✅ PRESENT | `pickupContactName` | ✅ Complete |
| Pickup contact phone | ✅ PRESENT | `pickupContactPhone` | ✅ Complete |
| Pickup access notes | ✅ PRESENT | `pickupAccessNotes` | ✅ Complete |
| Delivery location name | ✅ PRESENT | `dropoffFacilityName` | ✅ Complete |
| Delivery address | ✅ PRESENT | `dropoffAddressLine1`, `dropoffCity`, `dropoffState`, `dropoffPostalCode` | ✅ Complete |
| Delivery contact name | ✅ PRESENT | `dropoffContactName` | ✅ Complete |
| Delivery contact phone | ✅ PRESENT | `dropoffContactPhone` | ✅ Complete |
| Delivery access notes | ✅ PRESENT | `dropoffAccessNotes` | ✅ Complete |

### D. Distance & Deadhead Inputs ✅ PARTIALLY PRESENT

| Field | Status | Current Implementation | Notes |
|-------|--------|----------------------|-------|
| Driver starting location | ✅ PRESENT | `deadheadStartingLocation` (String) | ✅ Complete |
| Use current hub/home base | ⚠️ PARTIAL | Rate Calculator has "Use Current Location" button | Could add explicit "hub" option |
| deadhead_miles | ✅ PRESENT | `deadheadDistance` (Float) | ✅ Complete |
| loaded_miles | ⚠️ PARTIAL | `autoCalculatedDistance` (pickup to dropoff) | Could be clearer |
| total_miles | ✅ PRESENT | `totalDistance` (Float) | ✅ Complete |

### E. Compliance & Handling ❌ MOSTLY MISSING

| Field | Status | Current Implementation | Notes |
|-------|--------|----------------------|-------|
| Chain-of-custody required? | ❌ MISSING | Not in schema or form | **NEEDS ADDITION** |
| Signature required at pickup? | ⚠️ PARTIAL | `pickupSignature` exists but no flag | **NEEDS ADDITION** |
| Signature required at delivery? | ⚠️ PARTIAL | `deliverySignature` exists but no flag | **NEEDS ADDITION** |
| Electronic POD acceptable? | ❌ MISSING | Not in schema or form | **NEEDS ADDITION** |
| Special handling notes | ⚠️ PARTIAL | `accessNotes` exists but not specific | Could use existing field |
| Temperature logging required? | ⚠️ PARTIAL | Temperature fields exist but no flag | **NEEDS ADDITION** |

### F. Billing / Client ⚠️ PARTIALLY PRESENT

| Field | Status | Current Implementation | Notes |
|-------|--------|----------------------|-------|
| Client/account name | ✅ PRESENT | Shipper selection exists | ✅ Complete |
| Billing contact name | ⚠️ PARTIAL | In Shipper model, not in form | **NEEDS ADDITION TO FORM** |
| Billing contact email | ⚠️ PARTIAL | In Shipper model, not in form | **NEEDS ADDITION TO FORM** |
| PO or reference number | ❌ MISSING | Not in schema or form | **NEEDS ADDITION** |
| Payment terms | ⚠️ PARTIAL | In Shipper model, not in form | **NEEDS ADDITION TO FORM** |

### G. Internal Ops Fields ❌ MOSTLY MISSING

| Field | Status | Current Implementation | Notes |
|-------|--------|----------------------|-------|
| Priority level | ❌ MISSING | Not in schema or form | **NEEDS ADDITION** |
| Driver instructions | ⚠️ PARTIAL | `accessNotes` could serve this | Could use existing or add specific |
| Tags/labels | ❌ MISSING | Not in schema or form | **NEEDS ADDITION** |

---

## 3. Data Model & Validation Alignment Issues

### Current Schema Gaps:
1. ❌ Missing `isRecurring` boolean field
2. ❌ Missing `directDriveRequired` boolean field
3. ❌ Missing `chainOfCustodyRequired` boolean field
4. ❌ Missing `signatureRequiredAtPickup` boolean field
5. ❌ Missing `signatureRequiredAtDelivery` boolean field
6. ❌ Missing `electronicPodAcceptable` boolean field
7. ❌ Missing `temperatureLoggingRequired` boolean field
8. ❌ Missing `poNumber` string field
9. ❌ Missing `priorityLevel` enum field
10. ❌ Missing `tags` array field (or JSON field)
11. ⚠️ `serviceType` enum missing CRITICAL_STAT, ROUTINE
12. ⚠️ `specimenCategory` enum missing SUPPLIES, EQUIPMENT, PAPERWORK

### Validation Schema Gaps:
- Same as above - validation schema needs to match Prisma schema

---

## 4. Rate Calculator Integration ✅ GOOD

The Rate Calculator currently uses:
- ✅ `serviceType` (for STAT multipliers)
- ✅ `temperatureRequirement` (available but not used yet)
- ✅ Distance fields (`deadheadDistance`, `totalDistance`)
- ✅ `pickupAddress` and `dropoffAddress` (for calculation)

**Recommendation:** Rate Calculator should also consider:
- Chain-of-custody flag (adds compliance fee)
- After-hours flag (if readyTime/deliveryDeadline outside business hours)
- Direct drive requirement (may affect pricing)

---

## 5. Implementation Plan

### Phase 1: Schema Updates
1. Update Prisma schema with missing fields
2. Create migration
3. Update TypeScript types

### Phase 2: Validation Updates
1. Update Zod schemas
2. Add validation rules (required/optional, max lengths)

### Phase 3: Form Updates
1. Add missing form sections
2. Add field validation messages
3. Organize into logical sections

### Phase 4: API Updates
1. Update driver-manual API endpoint
2. Handle all new fields
3. Ensure proper defaults

### Phase 5: Rate Calculator Enhancement
1. Add compliance fee calculation
2. Add after-hours detection
3. Update profit estimation

---

## Summary

**Present:** ~60% of required fields
**Missing:** ~40% of required fields (mostly compliance, billing, and internal ops fields)

**Priority Additions:**
1. Compliance flags (chain-of-custody, signature requirements, temperature logging)
2. Recurring flag
3. Direct drive flag
4. PO number
5. Priority level
6. Enhanced service type and specimen category enums


