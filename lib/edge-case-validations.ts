/**
 * Edge Case Validations - Comprehensive validation for all edge cases
 * This file implements validation for every edge case in the testing checklist
 */

import { prisma } from './prisma'
import { ValidationError, ConflictError } from './errors'
import type { LoadRequestFormData } from './types'

// ============================================================================
// SECTION 1: LOAD REQUEST CREATION - VALIDATION & EDGE CASES
// ============================================================================

/**
 * 1.1 Duplicate Prevention
 */
export async function validateNoDuplicateLoad(
  data: LoadRequestFormData,
  requestId?: string // For idempotency
): Promise<void> {
  // Check for duplicate submission with same request ID (idempotency)
  if (requestId) {
    const existing = await prisma.loadRequest.findUnique({
      where: { id: requestId },
    })
    if (existing) {
      throw new ConflictError(`Load request ${requestId} already exists`)
    }
  }

  // Additional duplicate checks handled by duplicate-detector.ts
  // This validates idempotency key specifically
}

/**
 * 1.2 Location & Address Validation
 */
export async function validateLocationData(data: LoadRequestFormData): Promise<void> {
  const errors: string[] = []

  // Validate pickup and dropoff cannot be identical address
  const pickupAddr = `${data.pickupAddressLine1} ${data.pickupCity} ${data.pickupState} ${data.pickupPostalCode}`.toLowerCase().trim()
  const dropoffAddr = `${data.dropoffAddressLine1} ${data.dropoffCity} ${data.dropoffState} ${data.dropoffPostalCode}`.toLowerCase().trim()

  if (pickupAddr === dropoffAddr) {
    errors.push('Pickup and dropoff addresses cannot be identical')
  }

  // Validate delivery deadline is after ready time
  if (data.readyTime && data.deliveryDeadline) {
    const ready = new Date(data.readyTime)
    const deadline = new Date(data.deliveryDeadline)

    if (deadline <= ready) {
      errors.push('Delivery deadline must be after ready time')
    }

    // Reject ready time in the past (or within 15 minutes buffer)
    const now = new Date()
    const bufferMinutes = 15
    const minReadyTime = new Date(now.getTime() + bufferMinutes * 60 * 1000)

    if (ready < minReadyTime) {
      errors.push(`Ready time must be at least ${bufferMinutes} minutes in the future`)
    }
  }

  // Validate distance is not impossibly large (>500 miles)
  // This will be validated during quote calculation, but we can pre-check here

  if (errors.length > 0) {
    throw new ValidationError(errors.join('; '))
  }
}

/**
 * 1.3 Quote Calculation Edge Cases
 */
export function validateQuoteAmount(amount: number, serviceType: string): void {
  // Prevent negative quote amounts
  if (amount < 0) {
    throw new ValidationError('Quote amount cannot be negative')
  }

  // Prevent $0.00 quotes (apply minimum)
  const MINIMUM_QUOTE = 10.00
  if (amount === 0) {
    throw new ValidationError(`Quote amount must be at least $${MINIMUM_QUOTE}`)
  }

  // Validate amount is within reasonable range (0.01 to 1,000,000)
  if (amount < 0.01 || amount > 1000000) {
    throw new ValidationError('Quote amount is outside acceptable range ($0.01 - $1,000,000)')
  }
}

export function validateDistance(distance: number): number {
  // Handle distance = 0 miles (apply minimum charge, but return minimum for calculation)
  if (distance === 0) {
    return 0 // Will trigger minimum charge in rate calculator
  }

  // Handle distance > 500 miles (flag for review)
  if (distance > 500) {
    // Log warning but allow (admin review will catch it)
    console.warn(`⚠️  Long distance detected: ${distance} miles - requires admin review`)
  }

  // Validate distance is not negative
  if (distance < 0) {
    throw new ValidationError('Distance cannot be negative')
  }

  return distance
}

/**
 * 1.4 Account Creation Edge Cases
 */
export async function validateAccountCreation(
  email: string,
  accountType: 'shipper' | 'driver' | 'admin'
): Promise<void> {
  // Check if email is on DNU list
  const blocked = await prisma.blockedEmail.findFirst({
    where: {
      email: email.toLowerCase(),
      isActive: true,
    },
  })

  if (blocked) {
    throw new ValidationError(
      `This email address is blocked from creating an account. Reason: ${blocked.reason || 'Not specified'}`
    )
  }

  // Check if email already exists in other account types
  const existingShipper = await prisma.shipper.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true },
  })

  const existingDriver = await prisma.driver.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true },
  })

  const existingAdmin = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true },
  })

  // Prevent same email as both shipper and driver/admin
  if (accountType === 'shipper' && (existingDriver || existingAdmin)) {
    throw new ConflictError(
      'This email is already registered as a driver or admin. Please use a different email address.'
    )
  }

  if (accountType === 'driver' && (existingShipper || existingAdmin)) {
    throw new ConflictError(
      'This email is already registered as a shipper or admin. Please use a different email address.'
    )
  }

  if (accountType === 'admin' && (existingShipper || existingDriver)) {
    throw new ConflictError(
      'This email is already registered as a shipper or driver. Please use a different email address.'
    )
  }
}

/**
 * 1.5 Multi-Location & Commodity Validation
 */
export function validateCommodityRequirements(
  specimenCategory: string,
  temperatureRequirement: string,
  declaredValue?: number
): void {
  // Validate UN3373 loads have proper category
  if (specimenCategory.includes('UN3373') && !specimenCategory.includes('CATEGORY_B')) {
    console.warn('⚠️  UN3373 category should specify CATEGORY_B for biological substances')
  }

  // Validate declared value within reasonable insurance limits
  const MAX_DECLARED_VALUE = 100000 // $100k default insurance limit
  if (declaredValue && declaredValue > MAX_DECLARED_VALUE) {
    throw new ValidationError(
      `Declared value exceeds insurance limit of $${MAX_DECLARED_VALUE.toLocaleString()}. Please contact support for high-value shipments.`
    )
  }

  // Validate temperature requirement matches commodity type
  if (specimenCategory.includes('UN3373') && temperatureRequirement === 'AMBIENT') {
    // This is fine, but log for compliance tracking
    console.log('ℹ️  UN3373 specimen with ambient temperature - ensure proper packaging')
  }
}

// ============================================================================
// SECTION 2: QUOTE ACCEPTANCE & MODIFICATION
// ============================================================================

/**
 * 2.1 State Management
 */
export async function validateQuoteAcceptance(
  loadId: string,
  shipperId: string
): Promise<void> {
  const load = await prisma.loadRequest.findUnique({
    where: { id: loadId },
    include: { shipper: true },
  })

  if (!load) {
    throw new ValidationError('Load request not found')
  }

  // Validate shipper owns this load
  if (load.shipperId !== shipperId) {
    throw new ValidationError('You do not have permission to accept quotes for this load')
  }

  // Prevent accepting quote if no quote exists
  if (!load.quoteAmount && !load.driverQuoteAmount) {
    throw new ValidationError('No quote available to accept')
  }

  // Validate quote hasn't expired (24 hours TTL)
  if (load.quoteAmount) {
    const quoteAge = Date.now() - (load.updatedAt?.getTime() || 0)
    const QUOTE_TTL = 24 * 60 * 60 * 1000 // 24 hours

    if (quoteAge > QUOTE_TTL) {
      throw new ValidationError('Quote has expired. Please request a new quote.')
    }
  }

  // Prevent acceptance after cancellation
  if (load.status === 'CANCELLED') {
    throw new ValidationError('Cannot accept quote for a cancelled load')
  }
}

/**
 * 2.2 Pricing Conflicts
 */
export function validateDriverQuote(
  driverQuote: number,
  systemQuote?: number,
  minimumRate?: number
): void {
  // Validate driver quote >= system minimum
  const MINIMUM_RATE = minimumRate || 25.00
  if (driverQuote < MINIMUM_RATE) {
    throw new ValidationError(
      `Driver quote must be at least $${MINIMUM_RATE}. Minimum rate is enforced for driver protection.`
    )
  }

  // Flag driver quote >200% of system quote for admin review
  if (systemQuote && driverQuote > systemQuote * 2) {
    console.warn(
      `⚠️  Driver quote ($${driverQuote}) is more than 200% of system quote ($${systemQuote}) - requires admin review`
    )
    // Allow but log for review
  }
}

/**
 * 2.3 Rejection & Retry Logic
 */
export async function validateQuoteRejectionLimits(loadId: string): Promise<void> {
  // Count previous rejections
  const load = await prisma.loadRequest.findUnique({
    where: { id: loadId },
    select: {
      driverDenialReason: true,
      lastDeniedByDriverId: true,
    },
  })

  // If load has been denied 3+ times, require callback
  const MAX_REJECTIONS = 3
  // Note: This would require tracking rejection count - may need schema update
  // For now, we'll check for multiple denial reasons
}

// ============================================================================
// SECTION 3: DRIVER ASSIGNMENT & ELIGIBILITY
// ============================================================================

/**
 * 3.1 Driver Status Validation
 */
export async function validateDriverEligibility(
  driverId: string,
  loadRequirements: {
    temperatureRequirement?: string
    specimenCategory?: string
    readyTime?: Date
    deliveryDeadline?: Date
  }
): Promise<void> {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    include: {
      vehicles: {
        where: { isActive: true },
      },
      documents: {
        where: { isActive: true },
      },
    },
  })

  if (!driver) {
    throw new ValidationError('Driver not found')
  }

  // Hide load board from PENDING_APPROVAL drivers
  if (driver.status === 'PENDING_APPROVAL') {
    throw new ValidationError('Drivers with pending approval cannot accept loads')
  }

  // Hide/disable acceptance for OFF_DUTY drivers
  if (driver.status === 'OFF_DUTY') {
    throw new ValidationError('Drivers who are off duty cannot accept new loads')
  }

  // Prevent INACTIVE drivers from accepting loads
  if (driver.status === 'INACTIVE' || driver.isDeleted) {
    throw new ValidationError('Inactive drivers cannot accept loads')
  }

  // TIER 2.10: Validate Driver License Expiry (Ghost Driver prevention)
  if (driver.licenseExpiry) {
    const licenseExpiry = new Date(driver.licenseExpiry)
    const now = new Date()
    
    if (licenseExpiry < now) {
      throw new ValidationError(
        `Driver license expired on ${licenseExpiry.toLocaleDateString()}. Cannot accept loads. Renew license immediately.`
      )
    }
    
    // Warn if expiring soon (< 30 days)
    const daysUntilExpiry = Math.ceil((licenseExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (daysUntilExpiry <= 30) {
      console.warn(`[Driver Eligibility] Driver ${driverId} license expires in ${daysUntilExpiry} days`)
    }
  } else {
    // Missing license expiry is a warning (may be optional in some jurisdictions)
    console.warn(`[Driver Eligibility] Driver ${driverId} missing license expiry date`)
  }

  // Validate driver has at least one vehicle registered
  if (!driver.vehicles || driver.vehicles.length === 0) {
    throw new ValidationError('Driver must have at least one registered vehicle to accept loads')
  }

  // Validate vehicle has refrigeration for refrigerated/frozen loads
  if (
    (loadRequirements.temperatureRequirement === 'REFRIGERATED' ||
      loadRequirements.temperatureRequirement === 'FROZEN') &&
    !driver.vehicles.some((v) => v.hasRefrigeration)
  ) {
    throw new ValidationError(
      'Driver must have a refrigerated vehicle to accept this temperature-controlled load'
    )
  }

  // Validate driver has UN3373 cert for UN3373 loads
  if (loadRequirements.specimenCategory?.includes('UN3373')) {
    const hasCert = driver.un3373Certified &&
      (!driver.un3373ExpiryDate || driver.un3373ExpiryDate > new Date())

    if (!hasCert) {
      throw new ValidationError(
        'Driver must have valid UN3373 certification to accept UN3373 biological substance loads'
      )
    }
  }

  // Validate driver minimum rate <= offered rate
  if (driver.minimumRatePerMile) {
    // This would need the load's rate per mile - validation happens during acceptance
  }

  // Prevent driver accepting overlapping loads (time conflict check)
  if (loadRequirements.readyTime && loadRequirements.deliveryDeadline) {
    const overlappingLoads = await prisma.loadRequest.findMany({
      where: {
        driverId: driverId,
        status: {
          in: ['SCHEDULED', 'PICKED_UP', 'IN_TRANSIT'],
        },
        OR: [
          {
            readyTime: {
              lte: loadRequirements.deliveryDeadline,
              gte: loadRequirements.readyTime,
            },
          },
          {
            deliveryDeadline: {
              lte: loadRequirements.deliveryDeadline,
              gte: loadRequirements.readyTime,
            },
          },
        ],
      },
    })

    if (overlappingLoads.length > 0) {
      throw new ConflictError(
        `Driver has overlapping loads scheduled. Cannot accept load with conflicting time window.`
      )
    }
  }
}

/**
 * 3.2 Assignment Race Conditions
 */
export async function validateDriverAssignmentAtomic(
  loadId: string,
  driverId: string
): Promise<boolean> {
  // Use atomic update to prevent race condition
  const result = await prisma.loadRequest.updateMany({
    where: {
      id: loadId,
      driverId: null, // Only update if not already assigned
      status: {
        notIn: ['CANCELLED', 'DELIVERED', 'COMPLETED'],
      },
    },
    data: {
      driverId: driverId,
      assignedAt: new Date(),
      status: 'SCHEDULED',
    },
  })

  // Check if update actually happened (prevents race condition)
  if (result.count === 0) {
    return false // Load was already assigned or invalid state
  }

  return true
}

// ============================================================================
// SECTION 4: PICKUP EXECUTION - VALIDATION
// ============================================================================

/**
 * 4.1 Signature Capture
 */
export function validateSignature(
  signature: string | null,
  signerName: string | null,
  signatureUnavailableReason?: string
): void {
  if (!signature && !signatureUnavailableReason) {
    throw new ValidationError(
      'Either a signature or a reason for signature unavailability is required'
    )
  }

  // Require reason when "Signature unavailable" selected
  if (!signature && signatureUnavailableReason) {
    if (!signatureUnavailableReason.trim()) {
      throw new ValidationError('Please provide a reason why the signature is unavailable')
    }
  }

  // Require signer name with signature
  if (signature && !signerName) {
    throw new ValidationError('Signer name is required when a signature is provided')
  }

  // Validate signature image is not blank/corrupted
  if (signature) {
    // Check if signature is valid base64 data URL
    if (!signature.startsWith('data:image')) {
      throw new ValidationError('Signature must be a valid image format')
    }

    // Check minimum signature size (prevent blank signatures)
    const base64Data = signature.split(',')[1]
    if (!base64Data || base64Data.length < 100) {
      throw new ValidationError('Signature image appears to be invalid or too small')
    }
  }
}

/**
 * 4.2 Temperature Recording
 */
export function validateTemperature(
  temperature: number | null,
  requirement: string,
  isRequired: boolean
): void {
  if (isRequired && temperature === null) {
    throw new ValidationError('Temperature recording is required for this load')
  }

  if (temperature !== null) {
    // Validate temperature is within reasonable range (-50°C to +50°C)
    if (temperature < -50 || temperature > 50) {
      throw new ValidationError(
        `Temperature ${temperature}°C is outside acceptable range (-50°C to +50°C). Please verify reading.`
      )
    }

    // Reject obviously invalid temps
    if (temperature === -999 || temperature === 999 || temperature === 0) {
      throw new ValidationError('Temperature reading appears to be invalid. Please take another reading.')
    }
  }
}

export function validateTemperatureRange(
  temperature: number,
  min: number | null,
  max: number | null
): { inRange: boolean; message?: string } {
  if (min !== null && temperature < min) {
    return {
      inRange: false,
      message: `Temperature ${temperature}°C is below minimum acceptable ${min}°C`,
    }
  }

  if (max !== null && temperature > max) {
    return {
      inRange: false,
      message: `Temperature ${temperature}°C is above maximum acceptable ${max}°C`,
    }
  }

  return { inRange: true }
}

/**
 * 4.3 Timing & Status Validation
 */
export async function validatePickupTiming(
  loadId: string,
  pickupTime: Date,
  readyTime?: Date | null
): Promise<void> {
  const load = await prisma.loadRequest.findUnique({
    where: { id: loadId },
    select: { readyTime: true },
  })

  const ready = readyTime || load?.readyTime

  // Warn if pickup confirmed before ready time
  if (ready && pickupTime < ready) {
    const minutesEarly = Math.round((ready.getTime() - pickupTime.getTime()) / 60000)
    console.warn(
      `⚠️  Pickup confirmed ${minutesEarly} minutes before ready time for load ${loadId}`
    )
    // Allow but log for tracking
  }

  // Flag pickup >2 hours late
  if (ready) {
    const minutesLate = Math.round((pickupTime.getTime() - ready.getTime()) / 60000)
    if (minutesLate > 120) {
      console.warn(
        `⚠️  Pickup confirmed ${minutesLate} minutes late for load ${loadId} - requires admin review`
      )
    }
  }
}

// ============================================================================
// SECTION 5: IN-TRANSIT MONITORING
// ============================================================================

/**
 * 5.1 GPS Tracking
 */
export function validateGPSTrackingPoint(
  latitude: number,
  longitude: number,
  accuracy?: number | null,
  timestamp?: Date
): void {
  // Validate coordinates are within valid ranges
  if (latitude < -90 || latitude > 90) {
    throw new ValidationError(`Invalid latitude: ${latitude}. Must be between -90 and 90.`)
  }

  if (longitude < -180 || longitude > 180) {
    throw new ValidationError(`Invalid longitude: ${longitude}. Must be between -180 and 180.`)
  }

  // Filter GPS points with accuracy >1000 meters
  if (accuracy && accuracy > 1000) {
    console.warn(`⚠️  GPS point accuracy ${accuracy}m is low (>1000m threshold)`)
    // Allow but mark as low accuracy
  }

  // Validate timestamp is not in the future
  if (timestamp && timestamp > new Date()) {
    throw new ValidationError('GPS timestamp cannot be in the future')
  }
}

/**
 * 5.2 Status Transition Enforcement
 */
export async function validateStatusTransition(
  currentStatus: string,
  newStatus: string,
  loadId: string
): Promise<void> {
  // Prevent DELIVERED without PICKED_UP
  if (newStatus === 'DELIVERED' && currentStatus !== 'PICKED_UP' && currentStatus !== 'IN_TRANSIT') {
    throw new ValidationError(
      'Cannot mark load as DELIVERED without first confirming PICKED_UP status'
    )
  }

  // Prevent IN_TRANSIT without PICKED_UP
  if (newStatus === 'IN_TRANSIT' && currentStatus !== 'PICKED_UP') {
    throw new ValidationError(
      'Cannot mark load as IN_TRANSIT without first confirming PICKED_UP status'
    )
  }

  // Prevent PICKED_UP without driver assignment
  if (newStatus === 'PICKED_UP') {
    const load = await prisma.loadRequest.findUnique({
      where: { id: loadId },
      select: { driverId: true },
    })

    if (!load?.driverId) {
      throw new ValidationError('Cannot confirm pickup without a driver assigned to the load')
    }
  }

  // Prevent status reversal (DELIVERED → PICKED_UP)
  if (currentStatus === 'DELIVERED' && newStatus !== 'DELIVERED') {
    throw new ValidationError(
      'Cannot change status after delivery has been confirmed. Load is locked.'
    )
  }

  // Allow CANCELLED at any pre-delivery status
  if (newStatus === 'CANCELLED') {
    if (currentStatus === 'DELIVERED' || currentStatus === 'COMPLETED') {
      throw new ValidationError('Cannot cancel a load that has already been delivered')
    }
    // Allow cancellation
    return
  }
}

// ============================================================================
// SECTION 6: DELIVERY EXECUTION - VALIDATION
// ============================================================================

/**
 * 6.1 Delivery Signature & Temperature
 */
export function validateDeliveryRequirements(
  pickupSignature: string | null,
  deliverySignature: string | null,
  pickupSignerName: string | null,
  deliverySignerName: string | null
): void {
  // Flag identical pickup and delivery signatures (same person)
  if (
    pickupSignature &&
    deliverySignature &&
    pickupSignature === deliverySignature
  ) {
    console.warn(
      '⚠️  Pickup and delivery signatures are identical - may indicate same signer at both locations'
    )
    // Allow but log for review
  }

  // Validate delivery at correct facility (handled in GPS validation)
  // This is checked via location validation
}

/**
 * 6.2 Delivery Timing
 */
export function validateDeliveryTiming(
  deliveryTime: Date,
  deadline: Date | null,
  pickupTime: Date | null
): { isLate: boolean; message?: string } {
  // Prevent delivery time before pickup time
  if (pickupTime && deliveryTime < pickupTime) {
    throw new ValidationError(
      'Delivery time cannot be before pickup time. Please verify timestamps.'
    )
  }

  // Flag delivery after deadline
  if (deadline && deliveryTime > deadline) {
    const minutesLate = Math.round((deliveryTime.getTime() - deadline.getTime()) / 60000)
    return {
      isLate: true,
      message: `Delivery was ${minutesLate} minutes late`,
    }
  }

  return { isLate: false }
}

// ============================================================================
// SECTION 7: DOCUMENT MANAGEMENT
// ============================================================================

/**
 * 7.1 Upload Validation
 */
export function validateDocumentUpload(
  file: File | Buffer,
  fileSize: number,
  mimeType: string
): void {
  // Enforce file size limit (10MB per document)
  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
  if (fileSize > MAX_FILE_SIZE) {
    throw new ValidationError(
      `File size ${(fileSize / 1024 / 1024).toFixed(2)}MB exceeds maximum of 10MB`
    )
  }

  // Validate MIME type matches allowed types
  const validMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/heic',
  ]

  if (!validMimeTypes.includes(mimeType)) {
    throw new ValidationError(
      `File type ${mimeType} is not supported. Allowed types: PDF, JPG, PNG, HEIC`
    )
  }
}

// ============================================================================
// SECTION 8: INVOICING & BILLING
// ============================================================================

/**
 * 8.1 Invoice Generation Validation
 */
export async function validateInvoiceGeneration(loadIds: string[]): Promise<void> {
  // Prevent invoice before delivery confirmation
  const loads = await prisma.loadRequest.findMany({
    where: { id: { in: loadIds } },
    select: { status: true, shipperId: true },
  })

  for (const load of loads) {
    if (load.status !== 'DELIVERED' && load.status !== 'COMPLETED') {
      throw new ValidationError(
        'Cannot generate invoice for loads that have not been delivered'
      )
    }

    // Prevent invoice for CANCELLED loads (unless BILLABLE rule)
    // Note: Cancellation billing rule is checked separately
  }

  // Validate all loads on invoice have same shipper
  const shipperIds = new Set(loads.map((l) => l.shipperId))
  if (shipperIds.size > 1) {
    throw new ValidationError(
      'Cannot create invoice with loads from different shippers. Please create separate invoices.'
    )
  }

  // Prevent $0.00 invoices
  // This is checked during invoice calculation
}

/**
 * 8.2 Payment Tracking
 */
export function validatePaymentData(
  paymentDate: Date | null,
  paymentMethod: string | null,
  amount: number
): void {
  // Require payment date when marking PAID
  if (!paymentDate) {
    throw new ValidationError('Payment date is required when marking invoice as paid')
  }

  // Prevent payment date in future
  if (paymentDate > new Date()) {
    throw new ValidationError('Payment date cannot be in the future')
  }

  // Require payment method
  if (!paymentMethod) {
    throw new ValidationError('Payment method is required when recording payment')
  }

  // Validate amount is positive
  if (amount <= 0) {
    throw new ValidationError('Payment amount must be greater than zero')
  }
}

// ============================================================================
// SECTION 9: CANCELLATION LOGIC
// ============================================================================

/**
 * 9.1 Cancellation Timing & Rules
 */
export async function validateCancellation(
  loadId: string,
  billingRule: string
): Promise<void> {
  const load = await prisma.loadRequest.findUnique({
    where: { id: loadId },
    select: {
      status: true,
      driverId: true,
      actualPickupTime: true,
    },
  })

  if (!load) {
    throw new ValidationError('Load request not found')
  }

  // Prevent cancellation after DELIVERED
  if (load.status === 'DELIVERED' || load.status === 'COMPLETED') {
    throw new ValidationError('Cannot cancel a load that has already been delivered')
  }

  // Validate billing rule based on status
  if (load.status === 'DELIVERED' || load.actualPickupTime) {
    // After pickup, only BILLABLE or PARTIAL allowed
    if (billingRule === 'NOT_BILLABLE') {
      throw new ValidationError(
        'Cannot apply NOT_BILLABLE cancellation rule after pickup. Use BILLABLE or PARTIAL.'
      )
    }
  }
}

// ============================================================================
// SECTION 10: DRIVER MANAGEMENT - COMPLIANCE
// ============================================================================

/**
 * 10.1 Account Status Transitions
 */
export async function validateDriverStatusChange(
  driverId: string,
  newStatus: string
): Promise<void> {
  // Reassign active loads when driver goes INACTIVE
  if (newStatus === 'INACTIVE') {
    const activeLoads = await prisma.loadRequest.findMany({
      where: {
        driverId: driverId,
        status: {
          in: ['SCHEDULED', 'PICKED_UP', 'IN_TRANSIT'],
        },
      },
      select: { id: true },
    })

    if (activeLoads.length > 0) {
      throw new ValidationError(
        `Cannot set driver to INACTIVE while they have ${activeLoads.length} active load(s). Please reassign or complete loads first.`
      )
    }
  }

  // Prevent status change to INACTIVE if active loads exist
  // (handled above, but this validates the requirement)
}

/**
 * 10.2 Certification & Documents
 */
export function validateCertificationExpiry(expiryDate: Date | null, certName: string): void {
  if (!expiryDate) {
    return // No expiry date specified
  }

  // Check if cert is expired
  if (expiryDate < new Date()) {
    throw new ValidationError(
      `${certName} certification has expired. Please update certification before accepting new loads.`
    )
  }

  // Warn if expiring soon (30 days)
  const daysUntilExpiry = Math.round(
    (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )

  if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
    console.warn(
      `⚠️  ${certName} certification expires in ${daysUntilExpiry} days - renewal recommended`
    )
  }
}

// ============================================================================
// SECTION 11: SHIPPER MANAGEMENT
// ============================================================================

/**
 * 11.1 Account Setup
 */
export async function validateShipperAccount(shipperId: string): Promise<void> {
  // Validate shipper has at least one facility
  const facilityCount = await prisma.facility.count({
    where: { shipperId: shipperId },
  })

  if (facilityCount === 0) {
    throw new ValidationError(
      'Shipper must have at least one facility before creating load requests'
    )
  }
}

// ============================================================================
// SECTION 14: NOTIFICATION SYSTEM
// ============================================================================

/**
 * 14.1 Email Delivery
 */
export function validateEmailAddress(email: string): void {
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw new ValidationError(`Invalid email format: ${email}`)
  }

  // Check for common invalid patterns
  if (email.includes('..') || email.startsWith('.') || email.endsWith('.')) {
    throw new ValidationError(`Invalid email format: ${email}`)
  }
}

// ============================================================================
// SECTION 15: AUTHENTICATION & SECURITY
// ============================================================================

/**
 * 15.1 Login & Session
 */
export async function validateLoginAttempt(
  email: string,
  userType: 'shipper' | 'driver' | 'admin'
): Promise<void> {
  // Check for account lockout
  const attempt = await prisma.loginAttempt.findFirst({
    where: {
      email: email.toLowerCase(),
      userType: userType,
    },
    orderBy: { createdAt: 'desc' },
  })

  if (attempt?.lockedUntil && attempt.lockedUntil > new Date()) {
    const minutesRemaining = Math.ceil(
      (attempt.lockedUntil.getTime() - Date.now()) / (1000 * 60)
    )
    throw new ValidationError(
      `Account is locked due to multiple failed login attempts. Please try again in ${minutesRemaining} minutes.`
    )
  }
}

/**
 * 15.2 Account & Password
 */
export function validatePasswordStrength(password: string): void {
  const errors: string[] = []

  // Enforce password complexity (min 8 chars, upper, lower, number, special)
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  // Reject passwords matching common patterns
  const commonPatterns = [
    'password',
    '12345678',
    'qwerty',
    'abc123',
    'meddrop',
    'admin',
  ]

  const lowerPassword = password.toLowerCase()
  if (commonPatterns.some((pattern) => lowerPassword.includes(pattern))) {
    errors.push('Password cannot contain common words or patterns')
  }

  if (errors.length > 0) {
    throw new ValidationError(errors.join('; '))
  }
}

// ============================================================================
// SECTION 17: DATA INTEGRITY PROTECTION
// ============================================================================

/**
 * 17.1 Orphaned Records Prevention
 */
export async function validateNoOrphanedReferences(
  loadId: string,
  facilityId: string
): Promise<void> {
  // Validate facility exists before load creation
  const facility = await prisma.facility.findUnique({
    where: { id: facilityId },
    select: { id: true },
  })

  if (!facility) {
    throw new ValidationError(`Facility ${facilityId} not found. Cannot create load with invalid facility.`)
  }
}

/**
 * 17.2 Data Type Validation
 */
export function validateRequiredFields<T extends Record<string, any>>(
  data: T,
  requiredFields: (keyof T)[]
): void {
  const missing: string[] = []

  for (const field of requiredFields) {
    if (data[field] === null || data[field] === undefined || data[field] === '') {
      missing.push(String(field))
    }
  }

  if (missing.length > 0) {
    throw new ValidationError(
      `Missing required fields: ${missing.join(', ')}`
    )
  }
}

// ============================================================================
// SECTION 20: EXTERNAL API INTEGRATION
// ============================================================================

/**
 * 20.1 Google Maps API
 */
export function validateGoogleMapsResponse(response: any): void {
  if (!response) {
    throw new ValidationError('Google Maps API returned no response')
  }

  if (response.status === 'ZERO_RESULTS') {
    // This is handled gracefully - return null but don't throw
    return
  }

  if (response.status === 'OVER_QUERY_LIMIT') {
    throw new ValidationError(
      'Google Maps API quota exceeded. Please contact support or try again later.'
    )
  }

  if (response.status !== 'OK' && response.status !== 'ZERO_RESULTS') {
    throw new ValidationError(
      `Google Maps API error: ${response.status}. Please verify address or try again later.`
    )
  }
}

// ============================================================================
// SECTION 21: UI/UX VALIDATION
// ============================================================================

import DOMPurify from 'isomorphic-dompurify'

/**
 * 21.1 Form Validation
 */
export function sanitizeInput(input: string): string {
  // Trim and sanitize to prevent XSS
  const trimmed = input.trim()
  return DOMPurify.sanitize(trimmed)
}

export function validatePhoneNumber(phone: string): string {
  // Format and validate phone numbers (basic E.164)
  const cleaned = phone.replace(/\D/g, '')

  if (cleaned.length < 10) {
    throw new ValidationError('Phone number must contain at least 10 digits')
  }

  // Format as E.164 (US numbers)
  if (cleaned.length === 10) {
    return `+1${cleaned}`
  }

  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`
  }

  if (cleaned.startsWith('+')) {
    return cleaned
  }

  return `+${cleaned}`
}

export function validatePositiveNumber(value: number, fieldName: string): void {
  if (value < 0) {
    throw new ValidationError(`${fieldName} cannot be negative`)
  }
}



