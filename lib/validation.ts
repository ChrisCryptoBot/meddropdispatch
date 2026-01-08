// Validation Schemas using Zod
// Centralized validation for all API routes

import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'

// Common validation patterns
const emailSchema = z.string().email('Invalid email format')
const phoneSchema = z.string().min(1, 'Phone number is required')
const dateSchema = z.string().datetime().or(z.date())
const positiveNumberSchema = z.number().positive()
const nonEmptyStringSchema = z.string().min(1, 'This field is required')

// Load Request Validation
export const createLoadRequestSchema = z.object({
  // Shipper info
  email: emailSchema.optional(),
  companyName: nonEmptyStringSchema.optional(),
  contactName: nonEmptyStringSchema.optional(),
  phone: phoneSchema.optional(),
  shipperId: z.string().optional(),

  // Driver assignment (optional - can assign during creation)
  // Support both driverId and assignedDriverId field names
  driverId: z.string().optional(),
  assignedDriverId: z.string().optional(),

  // Pickup Facility
  pickupFacilityName: nonEmptyStringSchema,
  pickupAddressLine1: nonEmptyStringSchema,
  pickupAddressLine2: z.string().optional(),
  pickupCity: nonEmptyStringSchema,
  pickupState: nonEmptyStringSchema,
  pickupPostalCode: nonEmptyStringSchema,
  pickupContactName: nonEmptyStringSchema,
  pickupContactPhone: phoneSchema,
  pickupAccessNotes: z.string().optional(),

  // Dropoff Facility
  dropoffFacilityName: nonEmptyStringSchema,
  dropoffAddressLine1: nonEmptyStringSchema,
  dropoffAddressLine2: z.string().optional(),
  dropoffCity: nonEmptyStringSchema,
  dropoffState: nonEmptyStringSchema,
  dropoffPostalCode: nonEmptyStringSchema,
  dropoffContactName: nonEmptyStringSchema,
  dropoffContactPhone: phoneSchema,
  dropoffAccessNotes: z.string().optional(),

  // Load Details
  serviceType: z.enum(['STAT', 'CRITICAL_STAT', 'ROUTINE', 'SAME_DAY', 'SCHEDULED_ROUTE', 'OVERFLOW', 'GOVERNMENT', 'OTHER']),
  commodityDescription: nonEmptyStringSchema,
  specimenCategory: z.enum(['UN3373_CATEGORY_B', 'UN3373', 'NON_SPECIMEN', 'PHARMACEUTICAL', 'SUPPLIES', 'EQUIPMENT', 'PAPERWORK', 'OTHER']),
  temperatureRequirement: z.enum(['AMBIENT', 'REFRIGERATED', 'FROZEN', 'OTHER']),
  estimatedContainers: z.number().int().positive().optional(),
  estimatedWeightKg: positiveNumberSchema.optional(),
  declaredValue: positiveNumberSchema.optional(),

  // Scheduling
  readyTime: dateSchema.optional(),
  deliveryDeadline: dateSchema.optional(),
  isRecurring: z.boolean().optional(),
  directDriveRequired: z.boolean().optional(),

  // Instructions & Contact
  accessNotes: z.string().optional(),
  driverInstructions: z.string().optional(),
  preferredContactMethod: z.enum(['PHONE', 'EMAIL', 'TEXT']).optional(),

  // Compliance & Handling
  chainOfCustodyRequired: z.boolean().optional(),
  signatureRequiredAtPickup: z.boolean().optional(),
  signatureRequiredAtDelivery: z.boolean().optional(),
  electronicPodAcceptable: z.boolean().optional(),
  temperatureLoggingRequired: z.boolean().optional(),

  // Billing
  poNumber: z.string().optional(),
  priorityLevel: z.enum(['NORMAL', 'HIGH', 'CRITICAL']).optional(),
  tags: z.array(z.string()).or(z.string()).optional(), // Accept array or JSON string
  
  // Additional fields for admin/internal creation
  callbackId: z.string().optional(), // Link to callback queue
  createdVia: z.enum(['WEB_FORM', 'EMAIL', 'INTERNAL', 'DRIVER_MANUAL']).optional(),
  quotedRate: z.number().positive().optional(), // Final quoted rate (alternative to quoteAmount)
  quoteAmount: z.number().positive().optional(), // Quote amount (for compatibility)
})

export const updateLoadRequestSchema = z.object({
  // Quote fields
  quoteAmount: positiveNumberSchema.optional(),
  quoteNotes: z.string().optional(),
  driverQuoteAmount: positiveNumberSchema.optional(),
  driverQuoteNotes: z.string().optional(),
  // Status
  status: z.enum([
    'NEW',
    'REQUESTED',
    'QUOTE_REQUESTED',
    'QUOTED',
    'QUOTE_ACCEPTED',
    'DRIVER_QUOTE_PENDING',
    'DRIVER_QUOTE_SUBMITTED',
    'SCHEDULED',
    'PICKED_UP',
    'IN_TRANSIT',
    'DELIVERED',
    'CANCELLED',
    'DENIED',
  ]).optional(),
  // Load details (editable before PICKED_UP)
  serviceType: z.string().optional(),
  commodityDescription: z.string().optional(),
  specimenCategory: z.string().optional(),
  temperatureRequirement: z.string().optional(),
  estimatedContainers: z.number().int().positive().optional(),
  estimatedWeightKg: z.number().positive().optional(),
  declaredValue: z.number().positive().optional(),
  readyTime: dateSchema.optional(),
  deliveryDeadline: dateSchema.optional(),
  accessNotes: z.string().optional(),
  driverInstructions: z.string().optional(),
  preferredContactMethod: z.string().optional(),
  priorityLevel: z.enum(['NORMAL', 'HIGH', 'CRITICAL']).optional(),
  poNumber: z.string().optional(),
  // Signatures
  pickupSignature: z.string().optional(),
  pickupSignerName: z.string().optional(),
  pickupSignatureDriverId: z.string().optional(),
  deliverySignature: z.string().optional(),
  deliverySignerName: z.string().optional(),
  deliverySignatureDriverId: z.string().optional(),
  // Temperature
  pickupTemperature: z.number().optional(),
  deliveryTemperature: z.number().optional(),
  // Timing
  actualPickupTime: dateSchema.optional(),
  actualDeliveryTime: dateSchema.optional(),
  locationText: z.string().optional(),
  // Driver assignment
  driverId: z.string().optional(),
})

// Auth Validation
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

export const signupSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: nonEmptyStringSchema,
  lastName: nonEmptyStringSchema,
  phone: phoneSchema,
})

export const driverSignupSchema = signupSchema.extend({
  licenseNumber: z.string().optional(),
  vehicleType: z.string().optional(),
  vehicleMake: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehicleYear: z.number().int().positive().optional(),
  vehiclePlate: z.string().optional(),
  hasRefrigeration: z.boolean().optional(),
})

export const shipperSignupSchema = signupSchema.extend({
  companyName: nonEmptyStringSchema,
  clientType: z.enum(['CLINIC', 'LAB', 'HOSPITAL', 'PHARMACY', 'OTHER']).optional(),
})

// Create Shipper Schema (for admin use)
export const createShipperSchema = z.object({
  companyName: nonEmptyStringSchema,
  clientType: z.enum([
    'INDEPENDENT_PHARMACY',
    'CLINIC',
    'LAB',
    'DIALYSIS_CENTER',
    'IMAGING_CENTER',
    'HOSPITAL',
    'GOVERNMENT',
    'OTHER',
  ]),
  contactName: nonEmptyStringSchema,
  phone: phoneSchema,
  email: emailSchema,
})

// Driver Validation
export const updateDriverSchema = z.object({
  firstName: nonEmptyStringSchema.optional(),
  lastName: nonEmptyStringSchema.optional(),
  phone: phoneSchema.optional(),
  licenseNumber: z.string().optional(),
  licenseExpiry: dateSchema.optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: phoneSchema.optional(),
})

export const updateDriverVehicleSchema = z.object({
  vehicleType: z.string().optional(),
  vehicleMake: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehicleYear: z.number().int().positive().optional(),
  vehiclePlate: z.string().optional(),
  hasRefrigeration: z.boolean().optional(),
})

// Payment settings schema removed - MedDrop does not handle payments

// Shipper Validation
export const updateShipperSchema = z.object({
  // Payment preferences
  preferredPaymentMethod: z.enum(['CHECK', 'ACH', 'STRIPE_ACH', 'WIRE', 'OTHER']).optional(),
  achAccountNumber: z.string().optional().nullable(),
  achRoutingNumber: z.string().optional().nullable(),
  companyName: nonEmptyStringSchema.optional(),
  contactName: nonEmptyStringSchema.optional(),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  paymentTerms: z.enum(['NET_7', 'NET_14', 'NET_30', 'INVOICE_ONLY']).optional(),
  billingContactName: z.string().optional(),
  billingContactEmail: emailSchema.optional(),
  billingAddressLine1: z.string().optional(),
  billingAddressLine2: z.string().optional(),
  billingCity: z.string().optional(),
  billingState: z.string().optional(),
  billingPostalCode: z.string().optional(),
})

// Invoice Validation
export const createInvoiceSchema = z.object({
  shipperId: z.string(),
  loadRequestIds: z.array(z.string()).min(1, 'At least one load is required'),
  notes: z.string().optional(),
})

export const updateInvoiceSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  paymentMethod: z.string().optional(),
  paymentReference: z.string().optional(),
  notes: z.string().optional(),
  subtotal: positiveNumberSchema.optional(),
  tax: z.number().min(0).optional(),
  total: positiveNumberSchema.optional(),
})

// Load Template Validation
export const createLoadTemplateSchema = z.object({
  shipperId: z.string(),
  templateName: nonEmptyStringSchema,
  serviceType: z.enum(['STAT', 'SAME_DAY', 'SCHEDULED_ROUTE', 'OVERFLOW', 'GOVERNMENT']),
  commodityDescription: nonEmptyStringSchema,
  specimenCategory: z.enum(['UN3373', 'NON_SPECIMEN', 'PHARMACEUTICAL', 'OTHER']),
  temperatureRequirement: z.enum(['AMBIENT', 'REFRIGERATED', 'FROZEN', 'OTHER']),
  estimatedContainers: z.number().int().positive().optional(),
  estimatedWeightKg: positiveNumberSchema.optional(),
  declaredValue: positiveNumberSchema.optional(),
  readyTimeOffsetMinutes: z.number().int().optional(),
  deliveryDeadlineOffsetMinutes: z.number().int().optional(),
  accessNotes: z.string().optional(),
  preferredContactMethod: z.enum(['PHONE', 'EMAIL', 'TEXT']).optional(),
  pickupFacility: z.object({
    name: nonEmptyStringSchema,
    addressLine1: nonEmptyStringSchema,
    addressLine2: z.string().optional(),
    city: nonEmptyStringSchema,
    state: nonEmptyStringSchema,
    postalCode: nonEmptyStringSchema,
    contactName: z.string().optional(),
    contactPhone: phoneSchema.optional(),
    defaultAccessNotes: z.string().optional(),
    facilityType: z.string().optional(),
  }),
  dropoffFacility: z.object({
    name: nonEmptyStringSchema,
    addressLine1: nonEmptyStringSchema,
    addressLine2: z.string().optional(),
    city: nonEmptyStringSchema,
    state: nonEmptyStringSchema,
    postalCode: nonEmptyStringSchema,
    contactName: z.string().optional(),
    contactPhone: phoneSchema.optional(),
    defaultAccessNotes: z.string().optional(),
    facilityType: z.string().optional(),
  }),
})

// Status Update Validation
export const updateLoadStatusSchema = z.object({
  status: z.enum([
    'NEW',
    'REQUESTED',
    'QUOTE_REQUESTED',
    'QUOTED',
    'QUOTE_ACCEPTED',
    'DRIVER_QUOTE_PENDING',
    'DRIVER_QUOTE_SUBMITTED',
    'SCHEDULED',
    'PICKED_UP',
    'IN_TRANSIT',
    'DELIVERED',
    'CANCELLED',
    'DENIED',
  ]),
  eventLabel: z.string().optional(),
  eventDescription: z.string().optional(),
  locationText: z.string().optional(),
  // Location
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  accuracy: z.number().optional(),
  // GPS Override
  overrideGpsValidation: z.boolean().optional(),
  overrideReason: z.string().optional(),
  // Signature & Temp (for PICKED_UP/DELIVERED)
  signature: z.string().optional(),
  signerName: z.string().optional(),
  signatureUnavailableReason: z.string().optional(),
  temperature: z.number().optional(),
  temperatureImage: z.string().optional(),
})

// Quote Submission Validation
export const submitQuoteSchema = z.object({
  driverId: z.string(),
  quoteAmount: positiveNumberSchema,
  notes: z.string().optional(),
})

// Bulk Operations Validation
export const bulkActionSchema = z.object({
  action: z.enum(['update_status', 'assign_driver', 'generate_invoices', 'export_csv']),
  loadRequestIds: z.array(z.string()).min(1, 'At least one load is required'),
  status: z.string().optional(),
  driverId: z.string().optional(),
  eventLabel: z.string().optional(),
  eventDescription: z.string().optional(),
})

// Password Change Validation
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
})

// Load Action Schemas
export const denyLoadSchema = z.object({
  driverId: z.string().min(1, 'Driver ID is required'),
  reason: z.enum(['PRICE_TOO_LOW', 'ROUTE_NOT_FEASIBLE', 'TIMING_NOT_WORKABLE', 'TOO_FAR', 'EQUIPMENT_REQUIRED', 'ALREADY_BOOKED', 'OTHER']),
  notes: z.string().optional(),
})

export const cancelLoadSchema = z.object({
  cancellationReason: z.enum(['CLIENT_CANCELLED', 'DRIVER_NO_SHOW', 'VEHICLE_BREAKDOWN', 'FACILITY_CLOSED', 'WEATHER', 'OTHER']),
  cancelledBy: z.enum(['SHIPPER', 'DRIVER', 'ADMIN', 'SYSTEM']),
  cancelledById: z.string().optional(),
  cancellationBillingRule: z.enum(['BILLABLE', 'PARTIAL', 'NOT_BILLABLE']).optional(),
  notes: z.string().optional(),
})

export const acceptLoadSchema = z.object({
  driverId: z.string().min(1, 'Driver ID is required'),
  vehicleId: z.string().min(1, 'Vehicle ID is required'),
  gpsTrackingEnabled: z.boolean().optional().default(false), // Optional: driver can choose to enable location tracking
})

export const acceptQuoteSchema = z.object({})

export const rejectDriverQuoteSchema = z.object({
  shipperId: z.string().min(1, 'Shipper ID is required'),
  rejectionNotes: z.string().optional(),
})

export const approveDriverQuoteSchema = z.object({
  shipperId: z.string().min(1, 'Shipper ID is required'),
})

export const assignDriverSchema = z.object({
  driverId: z.string().min(1, 'Driver ID is required'),
})

// Helper function to validate request body
export async function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<{ success: true; data: T } | { success: false; errors: z.ZodError }> {
  try {
    // SECURITY: Sanitize input before validation
    const sanitizedData = sanitizeObject(data)
    const validated = await schema.parseAsync(sanitizedData)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error }
    }
    throw error
  }
}

/**
 * Recursively sanitize all string fields in an object or array
 */
function sanitizeObject(data: unknown): unknown {
  if (typeof data === 'string') {
    // Use the sanitizeInput from edge-case-validations if available, 
    // but avoiding circular dependency might be tricky if validation.ts is imported there.
    // Ideally we import { sanitizeInput } from './edge-case-validations'
    // But edge-case-validations imports ValidationError from errors? 
    // Check circular dep. If risk, use local sanitization or import from a utils file.
    // For now, let's lazy load or just do basic trim/sanitize here or duplicate logic safely.
    // Actually, edge-case-validations is high-level. validation.ts is low-level?
    // Let's assume we can import it.
    // Wait, I can't import easily here without checking. 
    // I'll use a dynamic require or just duplicate the simple DOMPurify call for safety from circular deps.
    // Or better, move sanitizeInput to a shared 'utils' or 'security' file.
    // For this context, I'll rely on isomorphic-dompurify directly here too.
    return DOMPurify.sanitize(data.trim())
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeObject(item))
  }

  if (data !== null && typeof data === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      result[key] = sanitizeObject(value)
    }
    return result
  }

  return data
}

// Format Zod errors for API response
export function formatZodErrors(error: z.ZodError): {
  message: string
  errors: Array<{ field: string; message: string }>
} {
  const formattedErrors = error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }))

  return {
    message: 'Validation failed',
    errors: formattedErrors,
  }
}

