# Rate Calculator Upgrade - DFW Market Rates

## ✅ Completed Changes

### 1. New Rate Structure (Per-Mile Based)
**File:** `lib/constants.ts`

**Rate Per Mile by Service Type:**
- **ROUTINE:** $1.75 - $2.25 per mile (target: $2.00)
  - Minimum threshold: $1.60/mi (below this = losing money)
- **STAT:** $2.50 - $3.50 per mile (target: $3.00)
- **CRITICAL_STAT:** $3.75 - $5.00+ per mile (target: $4.50)
- **SAME_DAY/SCHEDULED_ROUTE/OVERFLOW/GOVERNMENT/OTHER:** Default to ROUTINE rates

### 2. After-Hours/Weekend/Holiday Surcharge
**File:** `lib/rate-calculator.ts`

**Surcharge Options:**
- **Per-mile:** +$0.25 - $0.75 per mile (target: $0.50)
- **Flat fee:** +$20 - $40 (target: $30)
- **Logic:** Use flat fee for distances < 50 miles, per-mile for longer distances

**Detection:**
- Business hours: 8 AM - 6 PM, Monday-Friday
- Weekends: Saturday & Sunday
- Federal holidays: New Year's, Independence Day, Christmas, etc.

### 3. Updated Rate Calculation Function
**File:** `lib/rate-calculator.ts`

**New Function Signature:**
```typescript
calculateRate(
  distance: number,
  serviceType: string = 'ROUTINE',
  readyTime?: Date | string | null,
  deliveryDeadline?: Date | string | null
): CalculatedRate
```

**Changes:**
- Uses per-mile rates directly (no base rate + multiplier)
- Automatically detects after-hours/weekend/holiday
- Applies appropriate surcharge
- Returns rate per mile in breakdown

### 4. Updated API Endpoints
**Files:**
- `app/api/load-requests/calculate-rate-simple/route.ts`
- `app/api/load-requests/[id]/calculate-rate-with-deadhead/route.ts`
- `app/api/load-requests/[id]/calculate-rate/route.ts`
- `app/api/webhooks/email/route.ts`

**Changes:**
- All endpoints now pass `readyTime` and `deliveryDeadline` to `calculateRate()`
- After-hours detection happens automatically

### 5. Updated Type Definitions
**File:** `lib/types.ts`

**Added to CalculatedRate.breakdown:**
- `afterHoursSurcharge?: number` - After-hours surcharge amount
- `ratePerMile?: number` - Calculated rate per mile

---

## 📊 Rate Examples

### Example 1: Routine Load (50 miles, business hours)
- Service: ROUTINE
- Distance: 50 miles
- Rate: 50 × $2.00 = **$100.00**
- Range: $87.50 - $112.50

### Example 2: STAT Load (30 miles, business hours)
- Service: STAT
- Distance: 30 miles
- Rate: 30 × $3.00 = **$90.00**
- Range: $75.00 - $105.00

### Example 3: Critical STAT (20 miles, after-hours)
- Service: CRITICAL_STAT
- Distance: 20 miles
- Base: 20 × $4.50 = $90.00
- After-hours: $30.00 (flat fee, < 50 miles)
- Total: **$120.00**
- Range: $105.00 - $140.00

### Example 4: Routine Load (100 miles, weekend)
- Service: ROUTINE
- Distance: 100 miles
- Base: 100 × $2.00 = $200.00
- After-hours: 100 × $0.50 = $50.00 (per-mile, > 50 miles)
- Total: **$250.00**
- Range: $225.00 - $275.00

---

## 🎯 DFW Market Alignment

The new rates align with DFW market expectations:
- ✅ STAT: ~$3/mi (matches market)
- ✅ Routine: ~$2/mi (matches market)
- ✅ After-hours/weekend surcharges standard
- ✅ Critical STAT premium pricing

---

## 🔄 Backward Compatibility

- Legacy `BASE_RATE`, `PER_MILE_RATE`, and `SERVICE_MULTIPLIERS` still exist for compatibility
- Old code using `calculateRate()` without timing parameters will default to business hours
- Service types automatically map: SAME_DAY → ROUTINE, etc.

---

## 📝 Next Steps

1. **Test Rate Calculations:**
   - Verify routine loads calculate correctly
   - Verify STAT loads use premium rates
   - Verify after-hours detection works
   - Verify surcharges apply correctly

2. **Update UI Display:**
   - Show rate per mile prominently
   - Display after-hours indicator if applicable
   - Show breakdown including surcharges

3. **Optional Enhancements:**
   - Add driver override for after-hours detection
   - Add custom holiday calendar
   - Add timezone support for accurate after-hours detection


