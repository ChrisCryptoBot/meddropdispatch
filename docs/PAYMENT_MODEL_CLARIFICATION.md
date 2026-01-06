# Payment Model Clarification - FINAL

## ✅ CONFIRMED: MedDrop Does NOT Handle Payments

**MedDrop is a scheduling and tracking platform only.**
- ✅ Load scheduling/matching
- ✅ GPS tracking
- ✅ Document management
- ✅ Status updates
- ❌ NO invoicing
- ❌ NO payment processing
- ❌ NO payouts

---

## Payment Flow (Outside MedDrop)

### Customer → Driver (Direct)
- Drivers invoice customers directly
- NET_30 terms (or whatever they negotiate)
- Payment handled outside MedDrop
- MedDrop is NOT involved in billing/payment

---

## What This Means for the Codebase

### ❌ Remove/Deprecate:
1. **Invoice System** (`Invoice` model, `/api/invoices/*`)
   - MedDrop doesn't invoice anyone
   - Can keep for tracking purposes (optional) OR remove entirely

2. **Payout System** (`Payout` model, `/api/drivers/[id]/payouts`)
   - MedDrop doesn't pay drivers
   - Remove entirely

3. **Driver Payment Settings** (`/api/drivers/[id]/payment-settings`)
   - Bank account info not needed (MedDrop doesn't pay drivers)
   - Tax info not needed (drivers handle their own taxes)
   - **OR** repurpose: "How do you want customers to pay you?" (informational only)

4. **Shipper Payment Terms** (`Shipper.paymentTerms`)
   - Not relevant (MedDrop doesn't invoice)
   - Remove or keep for informational purposes

### ✅ Keep:
- Load scheduling
- GPS tracking
- Document management
- Status updates
- Driver/shipper matching

---

## Driver Payments Page - What Should It Do?

**Option A: Remove Entirely**
- Delete `app/driver/payments/page.tsx`
- Remove payment-related navigation

**Option B: Repurpose as "Billing Info"**
- Show driver's billing information (for customers to pay them)
- No payment processing, just informational
- "How customers can pay you" (ACH, check, etc.)

**Option C: Keep for Future**
- Hide/disable for now
- Keep infrastructure for potential future features

---

## Recommendation

**Remove payment processing infrastructure:**
1. Remove `Payout` model (or mark as deprecated)
2. Remove `/api/drivers/[id]/payouts` routes
3. Remove driver payment settings (bank account, tax info)
4. Keep `Invoice` model optional (for tracking completed loads, but no billing)
5. Update driver payments page to be informational only OR remove it

---

## Next Steps

1. **Confirm**: Should we remove all payment infrastructure?
2. **Driver Payments Page**: Remove or repurpose?
3. **Invoice System**: Remove or keep for tracking only?
