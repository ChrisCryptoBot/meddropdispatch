# Payment Infrastructure Removal Plan

## ✅ Confirmed: MedDrop Does NOT Handle Payments

MedDrop is a **scheduling and tracking platform only**.
- No invoicing
- No payment processing  
- No payouts

---

## Files to Remove/Deprecate

### 1. Driver Payment Routes ❌
- `app/api/drivers/[id]/payment-settings/route.ts` - Remove (MedDrop doesn't pay drivers)
- `app/api/drivers/[id]/payouts/route.ts` - Remove (MedDrop doesn't pay drivers)

### 2. Driver Payment Pages ❌
- `app/driver/payments/page.tsx` - Remove or repurpose
- `app/driver/earnings/page.tsx` - Review (might keep for tracking completed loads)

### 3. Database Models (Optional - Keep for Future?)
- `Payout` model - Remove or deprecate
- `Invoice` model - Keep for tracking only? (no billing)
- `Driver.paymentMethod`, `bankName`, `accountNumber`, etc. - Remove
- `Shipper.paymentTerms` - Remove or keep informational

### 4. Invoice System (Keep for Tracking Only?)
- `app/api/invoices/*` - Keep but mark as "tracking only, no billing"
- `lib/invoicing.ts` - Review and update comments

---

## Recommended Actions

### Immediate (Remove):
1. ✅ Remove driver payment settings routes
2. ✅ Remove driver payouts routes  
3. ✅ Remove driver payments page
4. ✅ Remove payment-related navigation links

### Optional (Keep for Tracking):
1. ⚠️ Keep Invoice model for tracking completed loads (no billing)
2. ⚠️ Keep earnings page but repurpose (show completed loads, not payments)

### Database Migration Needed:
1. Remove `Payout` table (or mark deprecated)
2. Remove payment fields from `Driver` model
3. Remove `paymentTerms` from `Shipper` model (or keep informational)

---

## Next Steps

1. **Confirm**: Remove all payment infrastructure?
2. **Earnings Page**: Remove or repurpose to show completed loads only?
3. **Invoice System**: Remove entirely or keep for load tracking?










