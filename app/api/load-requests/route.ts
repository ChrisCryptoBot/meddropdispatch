import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateTrackingCode } from '@/lib/tracking'
import { sendLoadStatusEmail, sendNewLoadNotification } from '@/lib/email'
import { getTrackingUrl } from '@/lib/utils'
import type { LoadRequestFormData } from '@/lib/types'
import { createErrorResponse, withErrorHandling } from '@/lib/errors'
import { createLoadRequestSchema, validateRequest, formatZodErrors } from '@/lib/validation'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * POST /api/load-requests
 * Create a new load request from the public form
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(async (req: NextRequest) => {
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(req)
    } catch (error) {
      return createErrorResponse(error)
    }

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

    const data = validation.data

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
      
      // If shipper exists but doesn't have a shipperCode, generate one
      if (shipper && !shipper.shipperCode) {
        const cleanName = (shipper.companyName || 'SHIPPER').replace(/[^A-Za-z0-9]/g, '').toUpperCase()
        let baseCode = cleanName.substring(0, 4)
        if (baseCode.length < 3) {
          baseCode = baseCode.padEnd(3, 'X')
        }
        
        let shipperCode = baseCode
        let attempts = 0
        while (attempts < 50) {
          const existing = await prisma.shipper.findUnique({
            where: { shipperCode },
            select: { id: true }
          })
          
          if (!existing) {
            break
          }
          
          attempts++
          const timestamp = Date.now().toString().slice(-4)
          shipperCode = `${baseCode.substring(0, 2)}${timestamp}`.substring(0, 4)
        }
        
        // Update shipper with generated code
        try {
          shipper = await prisma.shipper.update({
            where: { id: shipper.id },
            data: { shipperCode },
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
        } catch (updateError) {
          console.error('Error updating shipper code:', updateError)
          // Continue with existing shipper even if code update fails, but set the code locally
          shipper = { ...shipper, shipperCode }
        }
      }
    }

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

      // Auto-generate shipper code from company name - ensure uniqueness
      const cleanName = (data.companyName || 'SHIPPER').replace(/[^A-Za-z0-9]/g, '').toUpperCase()
      let baseCode = cleanName.substring(0, 4)
      if (baseCode.length < 3) {
        baseCode = baseCode.padEnd(3, 'X')
      }
      
      // Generate unique shipperCode - try base code first, then add numbers
      let shipperCode = baseCode
      let attempts = 0
      const maxAttempts = 100
      
      while (attempts < maxAttempts) {
        // Check if this code already exists
        const existing = await prisma.shipper.findUnique({
          where: { shipperCode },
          select: { id: true }
        })
        
        if (!existing) {
          // Code is available, use it
          break
        }
        
        // Code exists, try next variation
        attempts++
        if (attempts === 1) {
          // First attempt: try with number suffix
          shipperCode = `${baseCode.substring(0, Math.max(2, baseCode.length - 1))}${attempts}`
        } else {
          shipperCode = `${baseCode.substring(0, Math.max(2, baseCode.length - 1))}${attempts}`
        }
      }
      
      // If we couldn't find a unique code after max attempts, use timestamp-based fallback
      if (attempts >= maxAttempts) {
        const timestamp = Date.now().toString().slice(-4)
        shipperCode = `${baseCode.substring(0, 2)}${timestamp}`.substring(0, 4)
      }
      
      try {
        shipper = await prisma.shipper.create({
          data: {
            companyName: data.companyName,
            shipperCode: shipperCode, // Auto-generate from company name
            clientType: (data.clientType as any) || 'OTHER',
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
          const fallbackCode = `${baseCode.substring(0, 2)}${timestamp}`.substring(0, 4)
          
          try {
            shipper = await prisma.shipper.create({
              data: {
                companyName: data.companyName,
                shipperCode: fallbackCode,
                clientType: (data.clientType as any) || 'OTHER',
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
    
    // Generate shipperCode if missing - with multiple fallbacks to ensure it always works
    if (!finalShipper.shipperCode || finalShipper.shipperCode.trim() === '' || finalShipper.shipperCode === null) {
      const cleanName = (finalShipper.companyName || 'SHIPPER').replace(/[^A-Za-z0-9]/g, '').toUpperCase()
      let baseCode = cleanName.substring(0, 4)
      if (baseCode.length < 3) {
        baseCode = baseCode.padEnd(3, 'X')
      }
      
      let shipperCode = baseCode
      let attempts = 0
      const maxAttempts = 50
      
      // Try to find unique code
      while (attempts < maxAttempts) {
        try {
          const existing = await prisma.shipper.findUnique({
            where: { shipperCode },
            select: { id: true }
          })
          
          if (!existing || existing.id === finalShipper.id) {
            break
          }
          
          attempts++
          if (attempts < 10) {
            shipperCode = `${baseCode.substring(0, Math.max(2, baseCode.length - 1))}${attempts}`
          } else {
            // Use timestamp for uniqueness
            const timestamp = Date.now().toString().slice(-4)
            shipperCode = `${baseCode.substring(0, 2)}${timestamp}`.substring(0, 4)
            break
          }
        } catch (findError) {
          // If lookup fails, use timestamp-based code
          const timestamp = Date.now().toString().slice(-4)
          shipperCode = `${baseCode.substring(0, 2)}${timestamp}`.substring(0, 4)
          break
        }
      }
      
      // Final fallback - guaranteed unique timestamp-based code
      if (!shipperCode || shipperCode.trim() === '') {
        const timestamp = Date.now().toString().slice(-6)
        shipperCode = `SH${timestamp}`.substring(0, 4)
      }
      
      // Update shipper with code - with retry logic
      let updateSuccess = false
      for (let retry = 0; retry < 3; retry++) {
        try {
          finalShipper = await prisma.shipper.update({
            where: { id: finalShipper.id },
            data: { shipperCode },
            select: {
              id: true,
              companyName: true,
              shipperCode: true,
              email: true,
            }
          })
          updateSuccess = true
          break
        } catch (updateError: any) {
          console.error(`Error updating shipper code (attempt ${retry + 1}):`, updateError)
          
          // If unique constraint violation, generate new code
          if (updateError?.code === 'P2002') {
            const timestamp = Date.now().toString().slice(-6)
            shipperCode = `SH${timestamp}${retry}`.substring(0, 4)
          } else if (retry === 2) {
            // Last attempt failed - use generated code anyway
            finalShipper = { ...finalShipper, shipperCode }
            console.warn('Using locally generated shipperCode due to update failure')
          }
        }
      }
      
      // Ensure we have a shipperCode even if update failed
      if (!finalShipper.shipperCode || finalShipper.shipperCode.trim() === '') {
        finalShipper = { ...finalShipper, shipperCode }
      }
    }
    
    // Double-check we have shipperCode before proceeding
    if (!finalShipper.shipperCode || finalShipper.shipperCode.trim() === '' || finalShipper.shipperCode === null) {
      // Last resort fallback
      const timestamp = Date.now().toString().slice(-6)
      finalShipper = { ...finalShipper, shipperCode: `SH${timestamp}`.substring(0, 4) }
      console.warn('Using emergency fallback shipperCode')
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
          facilityType: (data.pickupFacilityType as any) || 'OTHER', // Default to 'OTHER' if not provided
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
          facilityType: (data.dropoffFacilityType as any) || 'OTHER', // Default to 'OTHER' if not provided
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
        accessNotes: data.accessNotes || null,
        preferredContactMethod: data.preferredContactMethod as any,
        status: 'REQUESTED',
        createdVia: 'WEB_FORM',
      }
    })

    // Create initial tracking event (SYSTEM-generated)
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

    // Send confirmation email to shipper
    const trackingUrl = getTrackingUrl(publicTrackingCode)
    await sendLoadStatusEmail({
      to: finalShipper.email,
      trackingCode: publicTrackingCode,
      companyName: finalShipper.companyName,
      status: 'REQUESTED',
      statusLabel: 'Scheduling Request Received',
      trackingUrl,
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
}
