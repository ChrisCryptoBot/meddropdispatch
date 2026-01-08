import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateTrackingCode } from '@/lib/tracking'
import { sendLoadStatusEmail, sendNewLoadNotification } from '@/lib/email'
import { getTrackingUrl } from '@/lib/utils'
import type { LoadRequestFormData } from '@/lib/types'
import { createErrorResponse, withErrorHandling, ValidationError, ConflictError } from '@/lib/errors'
import { createLoadRequestSchema, validateRequest, formatZodErrors } from '@/lib/validation'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { shouldBlockDuplicateLoad } from '@/lib/duplicate-detector'
import {
  validateLocationData,
  validateCommodityRequirements,
  validateAccountCreation,
  validateNoDuplicateLoad,
} from '@/lib/edge-case-validations'
import { getAuthSession } from '@/lib/auth-session'

/**
 * POST /api/load-requests
 * Create a new load request from the public form
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(request)
    } catch (error) {
      return createErrorResponse(error)
    }

    try {
      const rawData = await req.json()

      // Validate request body
      const validation = await validateRequest(createLoadRequestSchema, rawData)
      if (!validation.success) {
        const formatted = formatZodErrors(validation.errors)
        return NextResponse.json(
          {
            error: 'ValidationError',
            message: formatted.message,
            errors: formatted.errors,
            timestamp: new Date().toISOString(),
          },
          { status: 400 }
        )
      }

      const data = validation.data as any

      // Extract callbackId if provided (for linking callback queue to load)
      const callbackId = (rawData as any).callbackId || null

      // EDGE CASE VALIDATIONS - Section 1: Load Request Creation
      try {
        // 1.2 Location & Address Validation
        await validateLocationData(data as any)

        // 1.5 Multi-Location & Commodity Validation
        validateCommodityRequirements(
          data.specimenCategory,
          data.temperatureRequirement,
          data.declaredValue
        )
      } catch (validationError: any) {
        if (validationError instanceof ValidationError || validationError instanceof ConflictError) {
          return NextResponse.json(
            {
              error: validationError.name,
              message: validationError.message,
              code: validationError.code,
              timestamp: new Date().toISOString(),
            },
            { status: validationError.statusCode }
          )
        }
        throw validationError
      }

      // VALIDATE REQUIRED FIELDS - Return specific errors for missing fields
      const missingFields: string[] = []
      const invalidFields: { field: string; issue: string }[] = []

      // Required fields for facility creation
      if (!data.pickupFacilityName || data.pickupFacilityName.trim() === '') {
        missingFields.push('Pickup Facility Name')
      }
      if (!data.pickupAddressLine1 || data.pickupAddressLine1.trim() === '') {
        missingFields.push('Pickup Address Line 1')
      }
      if (!data.pickupCity || data.pickupCity.trim() === '') {
        missingFields.push('Pickup City')
      }
      if (!data.pickupState || data.pickupState.trim() === '') {
        missingFields.push('Pickup State')
      }
      if (!data.pickupPostalCode || data.pickupPostalCode.trim() === '') {
        missingFields.push('Pickup Postal Code')
      }
      if (!data.pickupContactName || data.pickupContactName.trim() === '') {
        missingFields.push('Pickup Contact Name')
      }
      if (!data.pickupContactPhone || data.pickupContactPhone.trim() === '') {
        missingFields.push('Pickup Contact Phone')
      }

      if (!data.dropoffFacilityName || data.dropoffFacilityName.trim() === '') {
        missingFields.push('Dropoff Facility Name')
      }
      if (!data.dropoffAddressLine1 || data.dropoffAddressLine1.trim() === '') {
        missingFields.push('Dropoff Address Line 1')
      }
      if (!data.dropoffCity || data.dropoffCity.trim() === '') {
        missingFields.push('Dropoff City')
      }
      if (!data.dropoffState || data.dropoffState.trim() === '') {
        missingFields.push('Dropoff State')
      }
      if (!data.dropoffPostalCode || data.dropoffPostalCode.trim() === '') {
        missingFields.push('Dropoff Postal Code')
      }
      if (!data.dropoffContactName || data.dropoffContactName.trim() === '') {
        missingFields.push('Dropoff Contact Name')
      }
      if (!data.dropoffContactPhone || data.dropoffContactPhone.trim() === '') {
        missingFields.push('Dropoff Contact Phone')
      }

      // Required fields for load request
      if (!data.serviceType || data.serviceType.trim() === '') {
        missingFields.push('Service Type')
      }
      if (!data.commodityDescription || data.commodityDescription.trim() === '') {
        missingFields.push('Commodity Description')
      }
      if (!data.specimenCategory || data.specimenCategory.trim() === '') {
        missingFields.push('Specimen Category')
      }
      if (!data.temperatureRequirement || data.temperatureRequirement.trim() === '') {
        missingFields.push('Temperature Requirement')
      }

      // Validate email format if provided (basic check only)
      if (data.email && !data.email.includes('@')) {
        invalidFields.push({ field: 'Email', issue: 'Email must contain @ symbol' })
      }

      // Phone numbers - no validation needed (any format accepted, driver can look up if needed)
      // Removed strict phone validation per user request - keep it simple

      // State validation - keep simple (just check if provided, accept any format)
      // Removed strict state format validation - accept any state format

      // Return validation errors if any
      if (missingFields.length > 0 || invalidFields.length > 0) {
        let errorMessage = 'Validation failed: '
        if (missingFields.length > 0) {
          errorMessage += `Missing required fields: ${missingFields.join(', ')}. `
        }
        if (invalidFields.length > 0) {
          errorMessage += `Invalid fields: ${invalidFields.map(f => `${f.field} (${f.issue})`).join(', ')}.`
        }

        return NextResponse.json(
          {
            error: 'Validation Error',
            message: errorMessage.trim(),
            missingFields,
            invalidFields,
            details: `Please check the following: ${missingFields.length > 0 ? `Missing: ${missingFields.join(', ')}` : ''} ${invalidFields.length > 0 ? `Invalid: ${invalidFields.map(f => f.field).join(', ')}` : ''}`.trim()
          },
          { status: 400 }
        )
      }

      // Find or create shipper first (needed for tracking code generation)
      // AUTHORIZATION CHECK (Phase 0): If authenticated as shipper, force shipperId to match
      // This prevents Shipper A from creating loads for Shipper B
      const session = await getAuthSession(req as NextRequest)
      if (session && session.userType === 'shipper') {
        if (data.shipperId && data.shipperId !== session.userId) {
          return NextResponse.json(
            { error: 'AuthorizationError', message: 'You cannot create loads for other shippers' },
            { status: 403 }
          )
        }
        // Force shipperId to match session
        data.shipperId = session.userId
      }

      let shipper
      if (data.shipperId) {
        // If shipperId is provided (from authenticated shipper request), try to find it
        shipper = await prisma.shipper.findUnique({
          where: { id: data.shipperId },
          select: {
            id: true,
            companyName: true,
            shipperCode: true,
            clientType: true,
            contactName: true,
            phone: true,
            email: true,
          }
        })

        // If shipperId lookup fails, fall back to email lookup or create from form data
        if (!shipper && data.email) {
          shipper = await prisma.shipper.findFirst({
            where: { email: data.email.toLowerCase() },
            select: {
              id: true,
              companyName: true,
              shipperCode: true,
              clientType: true,
              contactName: true,
              phone: true,
              email: true,
            }
          })
        }
      }

      // If still no shipper found, try email lookup first
      if (!shipper && data.email) {
        shipper = await prisma.shipper.findFirst({
          where: { email: data.email.toLowerCase() },
          select: {
            id: true,
            companyName: true,
            shipperCode: true,
            clientType: true,
            contactName: true,
            phone: true,
            email: true,
          }
        })

        // EDGE CASE: Ensure shipper has a shipperCode (client ID) - generate if missing
        if (shipper && !shipper.shipperCode) {
          try {
            const { ensureShipperCode } = await import('@/lib/shipper-code')
            const shipperCode = await ensureShipperCode(shipper.id)
            
            // Refresh shipper data to get updated code
            shipper = await prisma.shipper.findUnique({
              where: { id: shipper.id },
              select: {
                id: true,
                companyName: true,
                shipperCode: true,
                clientType: true,
                contactName: true,
                phone: true,
                email: true,
              }
            }) || shipper
            
            // If refresh didn't work, manually set the code
            if (shipper && !shipper.shipperCode) {
              shipper = { ...shipper, shipperCode }
            }
          } catch (codeError) {
            console.error('Error ensuring shipper code:', codeError)
            // Continue with existing shipper even if code generation fails
          }
        }
      }

      // Track if shipper is new (will be created)
      let isNewShipper = false

      // If still no shipper, create one from form data (make sure we have required fields)
      if (!shipper) {
        // Validate required fields
        if (!data.companyName || !data.email || !data.contactName || !data.phone) {
          return NextResponse.json(
            {
              error: 'Missing required information',
              message: 'Company name, email, contact name, and phone are required to create a shipper account.',
              details: 'Please ensure all company information fields are filled in.'
            },
            { status: 400 }
          )
        }

        isNewShipper = true // Mark as new shipper

        // Check if email is blocked (DNU list)
        try {
          const blockedEmail = await prisma.blockedEmail.findUnique({
            where: { email: data.email.toLowerCase() },
          })

          if (blockedEmail && blockedEmail.isActive) {
            return NextResponse.json(
              {
                error: 'Email address is blocked',
                message: 'This email address has been blocked and cannot be used to create an account. Please contact support if you believe this is an error.',
              },
              { status: 403 }
            )
          }
        } catch (error) {
          // If BlockedEmail model doesn't exist yet (Prisma client not regenerated), skip the check
          console.warn('BlockedEmail check skipped - model may not be available yet:', error)
        }

        // Generate unique shipperCode using utility function (ensures uniqueness and handles edge cases)
        const { generateShipperCode } = await import('@/lib/shipper-code')
        const shipperCode = await generateShipperCode(data.companyName)

        // EDGE CASE VALIDATION: 1.4 Account Creation Edge Cases
        try {
          await validateAccountCreation(data.email.toLowerCase(), 'shipper')
        } catch (accountError) {
          if (accountError instanceof ValidationError || accountError instanceof ConflictError) {
            return NextResponse.json(
              {
                error: accountError.name,
                message: accountError.message,
                code: accountError.code,
                timestamp: new Date().toISOString(),
              },
              { status: accountError.statusCode }
            )
          }
          throw accountError
        }

        try {
          shipper = await prisma.shipper.create({
            data: {
              companyName: data.companyName,
              shipperCode: shipperCode, // Auto-generate from company name
              clientType: ((rawData as any).clientType) || 'OTHER',
              contactName: data.contactName,
              phone: data.phone,
              email: data.email.toLowerCase(),
            }
          })
        } catch (createError: any) {
          console.error('Error creating shipper:', createError)

          // If unique constraint on shipperCode failed, try one more time with timestamp
          if (createError?.code === 'P2002' && createError?.meta?.target?.includes('shipperCode')) {
            const timestamp = Date.now().toString().slice(-4)
            const cleanName = (data.companyName || 'SHIPPER').replace(/[^A-Za-z0-9]/g, '').toUpperCase()
            const baseCode = cleanName.substring(0, 4) || 'SHIP'
            const fallbackCode = `${baseCode.substring(0, 2)}${timestamp}`.substring(0, 4)

            try {
              shipper = await prisma.shipper.create({
                data: {
                  companyName: data.companyName,
                  shipperCode: fallbackCode,
                  clientType: ((rawData as any).clientType) || 'OTHER',
                  contactName: data.contactName,
                  phone: data.phone,
                  email: data.email.toLowerCase(),
                }
              })
            } catch (retryError) {
              // If still fails, try to find existing by email
              if (data.email) {
                shipper = await prisma.shipper.findFirst({
                  where: { email: data.email.toLowerCase() }
                })
              }

              if (!shipper) {
                throw retryError
              }
            }
          }
          // If email already exists, find the existing shipper
          else if (createError?.code === 'P2002' && createError?.meta?.target?.includes('email')) {
            if (data.email) {
              shipper = await prisma.shipper.findFirst({
                where: { email: data.email.toLowerCase() }
              })
            }

            if (!shipper) {
              throw createError
            }
          } else {
            // For other errors, try to find existing by email
            if (data.email) {
              shipper = await prisma.shipper.findFirst({
                where: { email: data.email.toLowerCase() }
              })
            }

            if (!shipper) {
              throw createError
            }
          }
        }
      }

      // Final check - if we still don't have a shipper, return error
      if (!shipper) {
        return NextResponse.json(
          {
            error: 'Unable to create or find shipper account',
            message: 'There was a problem processing your company information. Please check that all required fields are filled correctly.',
            details: 'Ensure company name, email, contact name, and phone are provided.'
          },
          { status: 500 }
        )
      }

      // Ensure shipper has a shipperCode before generating tracking code
      // Refresh shipper to get latest data including shipperCode
      let finalShipper = await prisma.shipper.findUnique({
        where: { id: shipper.id },
        select: {
          id: true,
          companyName: true,
          shipperCode: true,
          email: true,
          contactName: true,
        }
      })

      if (!finalShipper) {
        return NextResponse.json(
          {
            error: 'Shipper not found after creation',
            message: 'There was a problem retrieving the shipper information.',
            details: 'Please try again or contact support.'
          },
          { status: 500 }
        )
      }

      // EDGE CASE: Final validation - ensure shipper has a shipperCode before load creation
      if (!finalShipper.shipperCode || finalShipper.shipperCode.trim() === '' || finalShipper.shipperCode === null) {
        try {
          const { ensureShipperCode } = await import('@/lib/shipper-code')
          const shipperCode = await ensureShipperCode(finalShipper.id)
          
          // Refresh to get updated shipper with code
          finalShipper = await prisma.shipper.findUnique({
            where: { id: finalShipper.id },
            select: {
              id: true,
              companyName: true,
              shipperCode: true,
              email: true,
              contactName: true,
            }
          }) || finalShipper
          
          // If still no code after ensure, throw error (this should never happen)
          if (!finalShipper.shipperCode) {
            throw new Error('Failed to generate shipperCode')
          }
        } catch (codeError) {
          console.error('Error ensuring shipper code in final validation:', codeError)
          return NextResponse.json(
            {
              error: 'Missing Client ID',
              message: 'Unable to generate client ID for shipper. Please contact support.',
              details: 'A client ID is required to create a load request.'
            },
            { status: 500 }
          )
        }
      }

      // Final validation: Ensure shipperCode exists (should be guaranteed by ensureShipperCode above)
      if (!finalShipper.shipperCode || finalShipper.shipperCode.trim() === '' || finalShipper.shipperCode === null) {
        return NextResponse.json(
          {
            error: 'Missing Client ID',
            message: 'Shipper does not have a client ID. This should not happen. Please contact support.',
            details: 'A client ID is required to create a load request.'
          },
          { status: 500 }
        )
      }

      // Now generate tracking code with guaranteed shipperCode
      const publicTrackingCode = await generateTrackingCode(finalShipper.id)

      // Create or find pickup facility
      let pickupFacility = await prisma.facility.findFirst({
        where: {
          shipperId: finalShipper.id,
          name: data.pickupFacilityName,
          addressLine1: data.pickupAddressLine1,
          city: data.pickupCity,
          state: data.pickupState,
        }
      })

      if (!pickupFacility) {
        pickupFacility = await prisma.facility.create({
          data: {
            shipperId: finalShipper.id,
            name: data.pickupFacilityName,
            facilityType: ((rawData as any).pickupFacilityType) || 'OTHER', // Default to 'OTHER' if not provided
            addressLine1: data.pickupAddressLine1,
            addressLine2: data.pickupAddressLine2 || null,
            city: data.pickupCity,
            state: data.pickupState.toUpperCase(),
            postalCode: data.pickupPostalCode,
            contactName: data.pickupContactName,
            contactPhone: data.pickupContactPhone,
            defaultAccessNotes: data.pickupAccessNotes || null,
          }
        })
      }

      // Create or find dropoff facility
      let dropoffFacility = await prisma.facility.findFirst({
        where: {
          shipperId: finalShipper.id,
          name: data.dropoffFacilityName,
          addressLine1: data.dropoffAddressLine1,
          city: data.dropoffCity,
          state: data.dropoffState,
        }
      })

      if (!dropoffFacility) {
        dropoffFacility = await prisma.facility.create({
          data: {
            shipperId: finalShipper.id,
            name: data.dropoffFacilityName,
            facilityType: ((rawData as any).dropoffFacilityType) || 'OTHER', // Default to 'OTHER' if not provided
            addressLine1: data.dropoffAddressLine1,
            addressLine2: data.dropoffAddressLine2 || null,
            city: data.dropoffCity,
            state: data.dropoffState.toUpperCase(),
            postalCode: data.dropoffPostalCode,
            contactName: data.dropoffContactName,
            contactPhone: data.dropoffContactPhone,
            defaultAccessNotes: data.dropoffAccessNotes || null,
          }
        })
      }

      // Check if driver is assigned and validate
      // Support both driverId and assignedDriverId field names (for admin/internal creation)
      let assignedDriverId: string | null = null
      const driverIdToCheck = data.driverId || (rawData as any).assignedDriverId
      if (driverIdToCheck) {
        // Verify driver exists and is active
        const assignedDriver = await prisma.driver.findUnique({
          where: { id: driverIdToCheck },
          select: { id: true, status: true },
        })

        if (assignedDriver) {
          assignedDriverId = assignedDriver.id
          // If driver is assigned, set status to SCHEDULED instead of REQUESTED
          // This means the load is pre-assigned and ready to go
        }
      }

      // Check for duplicate loads before creating
      const overrideDuplicate = (rawData as any).overrideDuplicate as boolean | undefined
      const duplicateCheck = await shouldBlockDuplicateLoad(
        {
          shipperId: finalShipper.id,
          pickupFacilityId: pickupFacility.id,
          dropoffFacilityId: dropoffFacility.id,
          readyTime: data.readyTime ? new Date(data.readyTime) : null,
          deliveryDeadline: data.deliveryDeadline ? new Date(data.deliveryDeadline) : null,
          serviceType: data.serviceType,
        },
        overrideDuplicate || false
      )

      // Block exact duplicates unless override is provided
      if (duplicateCheck.shouldBlock) {
        return NextResponse.json(
          {
            error: 'DuplicateLoad',
            message: duplicateCheck.result.message || 'A duplicate load request was detected',
            duplicateLoadId: duplicateCheck.result.duplicateLoadId,
            duplicateTrackingCode: duplicateCheck.result.duplicateTrackingCode,
            similarity: duplicateCheck.result.similarity,
            requiresOverride: true,
          },
          { status: 409 } // 409 Conflict
        )
      }

      // Warn about near duplicates but allow creation
      if (duplicateCheck.result.isDuplicate && duplicateCheck.result.similarity === 'near' && !overrideDuplicate) {
        // Log warning but don't block
        console.warn('Near-duplicate load detected but allowed:', {
          newLoad: {
            shipperId: finalShipper.id,
            pickupFacilityId: pickupFacility.id,
            dropoffFacilityId: dropoffFacility.id,
          },
          duplicateLoadId: duplicateCheck.result.duplicateLoadId,
          duplicateTrackingCode: duplicateCheck.result.duplicateTrackingCode,
        })
      }

      // Determine createdVia - allow INTERNAL for admin/internal creation
      const createdVia = (rawData as any).createdVia || 'WEB_FORM'
      const validCreatedVia = ['WEB_FORM', 'EMAIL', 'INTERNAL', 'DRIVER_MANUAL'].includes(createdVia) ? createdVia : 'WEB_FORM'
      
      // Determine initial status - INTERNAL/DRIVER_MANUAL loads start as SCHEDULED if driver assigned, otherwise REQUESTED
      let initialStatus = 'REQUESTED'
      if (assignedDriverId) {
        initialStatus = 'SCHEDULED'
      } else if (validCreatedVia === 'INTERNAL' || validCreatedVia === 'DRIVER_MANUAL') {
        // Admin/internal loads without driver assignment start as REQUESTED (will need quote/assignment)
        initialStatus = 'REQUESTED'
      }

      // Create load request
      const loadRequest = await prisma.loadRequest.create({
        data: {
          publicTrackingCode,
          shipperId: finalShipper.id,
          pickupFacilityId: pickupFacility.id,
          dropoffFacilityId: dropoffFacility.id,
          serviceType: data.serviceType as any,
          commodityDescription: data.commodityDescription,
          specimenCategory: data.specimenCategory as any,
          temperatureRequirement: data.temperatureRequirement as any,
          estimatedContainers: data.estimatedContainers ? parseInt(data.estimatedContainers.toString()) : null,
          // Weight is already in kg from the form
          estimatedWeightKg: data.estimatedWeightKg ? parseFloat(data.estimatedWeightKg.toString()) : null,
          declaredValue: data.declaredValue ? parseFloat(data.declaredValue.toString()) : null,
          readyTime: data.readyTime ? new Date(data.readyTime) : null,
          deliveryDeadline: data.deliveryDeadline ? new Date(data.deliveryDeadline) : null,
          accessNotes: data.accessNotes || data.notes || null, // Support both field names
          preferredContactMethod: data.preferredContactMethod as any,
          status: initialStatus,
          createdVia: validCreatedVia,
          driverId: assignedDriverId, // Assign driver if provided (can be from assignedDriverId field)
          assignedAt: assignedDriverId ? new Date() : null, // Set assignment timestamp
          // Compliance & Handling fields
          chainOfCustodyRequired: data.chainOfCustodyRequired === true || data.chainOfCustodyRequired === 'true',
          signatureRequiredAtPickup: data.signatureRequiredAtPickup !== false && data.signatureRequiredAtPickup !== 'false',
          signatureRequiredAtDelivery: data.signatureRequiredAtDelivery !== false && data.signatureRequiredAtDelivery !== 'false',
          electronicPodAcceptable: data.electronicPodAcceptable !== false && data.electronicPodAcceptable !== 'false',
          temperatureLoggingRequired: data.temperatureLoggingRequired === true || data.temperatureLoggingRequired === 'true',
          driverInstructions: data.driverInstructions || null,
          // Billing & Internal Ops
          poNumber: data.poNumber || null,
          priorityLevel: (data.priorityLevel as any) || 'NORMAL',
          tags: data.tags ? (typeof data.tags === 'string' ? data.tags : JSON.stringify(data.tags)) : null,
          // Scheduling options
          isRecurring: data.isRecurring === true || data.isRecurring === 'true',
          directDriveRequired: data.directDriveRequired === true || data.directDriveRequired === 'true',
          // Quoted rate (if provided during creation)
          quoteAmount: data.quotedRate || data.quoteAmount ? parseFloat((data.quotedRate || data.quoteAmount).toString()) : null,
        }
      })

      // Handle multiple locations if provided
      const locations = (rawData as any).locations as Array<{
        locationType: 'PICKUP' | 'DROPOFF'
        sequence: number
        facilityName: string
        facilityType: string
        addressLine1: string
        addressLine2?: string
        city: string
        state: string
        postalCode: string
        contactName: string
        contactPhone: string
        accessNotes?: string
        readyTime?: string
      }> | undefined

      if (locations && Array.isArray(locations) && locations.length > 0) {
        // Group locations by type and sort by sequence
        const pickupLocations = locations
          .filter(loc => loc.locationType === 'PICKUP')
          .sort((a, b) => a.sequence - b.sequence)

        const dropoffLocations = locations
          .filter(loc => loc.locationType === 'DROPOFF')
          .sort((a, b) => a.sequence - b.sequence)

        // Create facilities and LoadRequestLocation records for each location
        for (const loc of locations) {
          // Find or create facility
          let facility = await prisma.facility.findFirst({
            where: {
              shipperId: finalShipper.id,
              name: loc.facilityName,
              addressLine1: loc.addressLine1,
              city: loc.city,
              state: loc.state,
            }
          })

          if (!facility) {
            facility = await prisma.facility.create({
              data: {
                shipperId: finalShipper.id,
                name: loc.facilityName,
                facilityType: (loc.facilityType as any) || 'OTHER',
                addressLine1: loc.addressLine1,
                addressLine2: loc.addressLine2 || null,
                city: loc.city,
                state: loc.state.toUpperCase(),
                postalCode: loc.postalCode,
                contactName: loc.contactName,
                contactPhone: loc.contactPhone,
                defaultAccessNotes: loc.accessNotes || null,
              }
            })
          }

          // Create LoadRequestLocation record
          await prisma.loadRequestLocation.create({
            data: {
              loadRequestId: loadRequest.id,
              facilityId: facility.id,
              locationType: loc.locationType,
              sequence: loc.sequence,
              readyTime: loc.readyTime ? new Date(loc.readyTime) : null,
              accessNotes: loc.accessNotes || null,
            }
          })
        }
      }

      // Create initial tracking event
      if (assignedDriverId) {
        // If driver is assigned, create SCHEDULED event
        await prisma.trackingEvent.create({
          data: {
            loadRequestId: loadRequest.id,
            code: 'SCHEDULED',
            label: 'Load Scheduled',
            description: 'Your delivery has been scheduled and assigned to a driver. Tracking is now available.',
            locationText: `${pickupFacility.city}, ${pickupFacility.state}`,
            actorType: 'ADMIN', // Assigned by admin/system
            actorId: null,
          }
        })
      } else {
        // If no driver assigned, create REQUEST_RECEIVED event
        await prisma.trackingEvent.create({
          data: {
            loadRequestId: loadRequest.id,
            code: 'REQUEST_RECEIVED',
            label: 'Scheduling Request Received',
            description: 'Your scheduling request has been received. If we can service this request, a driver will call shortly to confirm details and pricing.',
            locationText: `${pickupFacility.city}, ${pickupFacility.state}`,
            actorType: 'SYSTEM', // Auto-generated by system
            actorId: null, // No human actor for system events
          }
        })
      }

      // Get driver and vehicle info if assigned
      let driverInfo = null
      if (assignedDriverId) {
        const assignedDriver = await prisma.driver.findUnique({
          where: { id: assignedDriverId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        })

        if (assignedDriver) {
          // Get vehicle info if vehicleId is set
          let vehicleInfo = null
          if (loadRequest.vehicleId) {
            const vehicle = await prisma.vehicle.findUnique({
              where: { id: loadRequest.vehicleId },
              select: {
                vehicleType: true,
                vehicleMake: true,
                vehicleModel: true,
                vehiclePlate: true,
                nickname: true,
              },
            })
            if (vehicle) {
              vehicleInfo = {
                type: vehicle.vehicleType,
                make: vehicle.vehicleMake,
                model: vehicle.vehicleModel,
                plate: vehicle.vehiclePlate,
                nickname: vehicle.nickname,
              }
            }
          }

          driverInfo = {
            name: `${assignedDriver.firstName} ${assignedDriver.lastName}`,
            phone: assignedDriver.phone,
            email: assignedDriver.email,
            vehicle: vehicleInfo,
          }
        }
      }

      // If shipper is new, send welcome email FIRST, then load confirmation
      if (isNewShipper) {
        const { sendShipperWelcomeEmail } = await import('@/lib/email')
        await sendShipperWelcomeEmail({
          to: finalShipper.email,
          companyName: finalShipper.companyName,
          contactName: finalShipper.contactName,
          email: finalShipper.email,
        })
      }

      // Send enhanced load confirmation email
      const trackingUrl = getTrackingUrl(publicTrackingCode)
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

      // Use enhanced load confirmation email with driver info and GPS tracking
      const { sendLoadConfirmationEmail } = await import('@/lib/email')
      await sendLoadConfirmationEmail({
        to: finalShipper.email,
        companyName: finalShipper.companyName,
        trackingCode: publicTrackingCode,
        loadDetails: {
          pickupFacility: {
            name: pickupFacility.name,
            addressLine1: pickupFacility.addressLine1,
            city: pickupFacility.city,
            state: pickupFacility.state,
            postalCode: pickupFacility.postalCode,
          },
          dropoffFacility: {
            name: dropoffFacility.name,
            addressLine1: dropoffFacility.addressLine1,
            city: dropoffFacility.city,
            state: dropoffFacility.state,
            postalCode: dropoffFacility.postalCode,
          },
          serviceType: loadRequest.serviceType,
          commodityDescription: loadRequest.commodityDescription,
          readyTime: loadRequest.readyTime,
          deliveryDeadline: loadRequest.deliveryDeadline,
          driverName: driverInfo?.name || null,
        },
        driverInfo: driverInfo ? {
          name: driverInfo.name,
          phone: driverInfo.phone,
          email: driverInfo.email,
          vehicle: driverInfo.vehicle,
        } : undefined,
        gpsTrackingEnabled: loadRequest.gpsTrackingEnabled || false,
        rateInfo: loadRequest.quoteAmount ? {
          quoteAmount: loadRequest.quoteAmount,
        } : loadRequest.ratePerMile ? {
          ratePerMile: loadRequest.ratePerMile,
          totalDistance: loadRequest.totalDistance,
        } : undefined,
        baseUrl,
      })

      // Send notification to internal team
      await sendNewLoadNotification({
        loadId: loadRequest.id,
        trackingCode: publicTrackingCode,
        companyName: finalShipper.companyName,
        serviceType: data.serviceType,
        pickupCity: pickupFacility.city,
        dropoffCity: dropoffFacility.city,
      })

      // Link callback to load if callbackId was provided
      if (callbackId) {
        try {
          await prisma.callbackQueue.update({
            where: { id: callbackId },
            data: {
              loadRequestId: loadRequest.id,
              status: 'COMPLETED',
              completedAt: new Date(),
            },
          })
          console.log(`[Callback Linked] Callback ${callbackId} linked to load ${loadRequest.id}`)
        } catch (callbackError) {
          // Don't fail the load creation if callback linking fails
          console.error('Error linking callback to load:', callbackError)
        }
      }

      // Log for debugging
      console.log(`[Load Request Created] ID: ${loadRequest.id}, Tracking: ${publicTrackingCode}, Shipper: ${finalShipper.id}, Status: ${loadRequest.status}`)

      return NextResponse.json({
        success: true,
        trackingCode: publicTrackingCode,
        loadId: loadRequest.id,
        shipperId: finalShipper.id, // Include for verification
      }, { status: 201 })
    } catch (error) {
      console.error('Error creating load request:', error)

      // Extract detailed error message with specific field information
      let errorMessage = 'Failed to create load request'
      let details = ''
      let specificField = ''

      if (error instanceof Error) {
        const errorStr = error.message || ''

        // Handle Prisma validation errors - extract field name
        if (errorStr.includes('Argument') && errorStr.includes('is missing')) {
          const match = errorStr.match(/Argument `(\w+)` is missing/)
          if (match) {
            specificField = match[1]
            // Map Prisma field names to user-friendly names
            const fieldMap: Record<string, string> = {
              'pickupFacilityId': 'Pickup Facility',
              'dropoffFacilityId': 'Dropoff Facility',
              'serviceType': 'Service Type',
              'commodityDescription': 'Commodity Description',
              'specimenCategory': 'Specimen Category',
              'temperatureRequirement': 'Temperature Requirement',
              'shipperId': 'Shipper Information',
              'facilityType': 'Facility Type'
            }
            const friendlyName = fieldMap[specificField] || specificField
            errorMessage = `Missing required field: ${friendlyName}`
            details = `The field "${friendlyName}" is required but was not provided. Please fill in this field and try again.`
          }
        }
        // Handle Prisma unique constraint errors - extract which field
        else if (errorStr.includes('Unique constraint failed')) {
          // Try to extract field name from constraint error
          const constraintMatch = errorStr.match(/Unique constraint failed on the fields: `(\w+)`/i)
          if (constraintMatch) {
            specificField = constraintMatch[1]
            errorMessage = `Duplicate ${specificField}: This value already exists`
            details = `A record with this ${specificField} already exists. Please use a different value.`
          } else {
            errorMessage = 'A record with this information already exists'
            details = 'Please check that you are not creating a duplicate facility or load request.'
          }
        }
        // Handle Prisma invalid value errors
        else if (errorStr.includes('Invalid') || errorStr.includes('invalid')) {
          // Try to extract field and value
          const invalidMatch = errorStr.match(/Invalid.*?(\w+).*?value/i)
          if (invalidMatch) {
            specificField = invalidMatch[1]
            errorMessage = `Invalid value for field: ${specificField}`
            details = `The value provided for "${specificField}" is not valid. ${errorStr.split('Invalid')[1]?.split('\n')[0] || ''}`
          } else {
            // Try to find field name in the error
            const fieldMatch = errorStr.match(/`(\w+)`/i)
            if (fieldMatch) {
              specificField = fieldMatch[1]
              errorMessage = `Invalid data in field: ${specificField}`
              details = errorStr.split('Invalid')[1]?.split('\n')[0]?.trim() || errorStr
            } else {
              errorMessage = 'Invalid data provided'
              details = errorStr.split('Invalid')[1]?.split('\n')[0]?.trim() || errorStr
            }
          }
        }
        // Handle foreign key constraint errors
        else if (errorStr.includes('Foreign key constraint') || errorStr.includes('Foreign key')) {
          errorMessage = 'Invalid reference: Related record not found'
          details = 'One of the selected options (shipper, facility, etc.) does not exist. Please refresh the page and try again.'
        }
        // Handle other Prisma errors
        else if (errorStr.includes('prisma') || errorStr.includes('Prisma')) {
          // Generic Prisma error - try to extract useful info
          errorMessage = 'Database error occurred'
          details = errorStr.length > 200 ? errorStr.substring(0, 200) + '...' : errorStr
        }
        // Generic error with details
        else {
          errorMessage = 'Unable to process your request'
          details = errorStr.length > 300 ? errorStr.substring(0, 300) + '...' : errorStr
        }
      }

      return NextResponse.json(
        {
          error: errorMessage,
          message: details || errorMessage,
          field: specificField || undefined,
          details: error instanceof Error ? error.message : 'Unknown error occurred'
        },
        { status: 500 }
      )
    }
  })(request)
}
