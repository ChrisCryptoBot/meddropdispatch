// Automated Quote Generator
// Generates quotes for load requests based on distance, service type, and other factors

import { prisma } from './prisma'
import { calculateDistance } from './distance-calculator'
import { calculateRate, isAfterHours } from './rate-calculator'
import { RATE_CONFIG } from './constants'

export interface QuoteGenerationResult {
  quoteAmount: number
  quoteNotes: string
  breakdown: {
    distance: number
    baseRate: number
    serviceTypeMultiplier: number
    temperatureFee: number
    urgencyFee: number
    afterHoursSurcharge: number
    total: number
  }
  suggestedRange: {
    min: number
    max: number
  }
}

/**
 * Generate automated quote for a load request
 */
export async function generateAutoQuote(
  loadRequestId: string
): Promise<QuoteGenerationResult> {
  // Get load request with facilities
  const loadRequest = await prisma.loadRequest.findUnique({
    where: { id: loadRequestId },
    include: {
      pickupFacility: true,
      dropoffFacility: true,
    },
  })

  if (!loadRequest) {
    throw new Error('Load request not found')
  }

  // Build addresses for distance calculation
  const pickupAddress = [
    loadRequest.pickupFacility.addressLine1,
    loadRequest.pickupFacility.addressLine2,
    loadRequest.pickupFacility.city,
    loadRequest.pickupFacility.state,
    loadRequest.pickupFacility.postalCode,
  ]
    .filter(Boolean)
    .join(', ')

  const dropoffAddress = [
    loadRequest.dropoffFacility.addressLine1,
    loadRequest.dropoffFacility.addressLine2,
    loadRequest.dropoffFacility.city,
    loadRequest.dropoffFacility.state,
    loadRequest.dropoffFacility.postalCode,
  ]
    .filter(Boolean)
    .join(', ')

  // Calculate distance
  const distanceResult = await calculateDistance(pickupAddress, dropoffAddress)
  
  if (!distanceResult.success || distanceResult.distance === 0) {
    // Fallback: Use coordinates if available, or estimate
    let distance = 0
    if (loadRequest.autoCalculatedDistance) {
      distance = loadRequest.autoCalculatedDistance
    } else {
      // Very rough estimate: assume 10 miles if we can't calculate
      distance = 10
    }
    
    return {
      quoteAmount: 0,
      quoteNotes: 'Unable to calculate distance. Please set quote manually.',
      breakdown: {
        distance,
        baseRate: 0,
        serviceTypeMultiplier: 1,
        temperatureFee: 0,
        urgencyFee: 0,
        afterHoursSurcharge: 0,
        total: 0,
      },
      suggestedRange: {
        min: 0,
        max: 0,
      },
    }
  }

  const distance = distanceResult.distance

  // Calculate base rate using rate calculator
  const rateCalculation = calculateRate(
    distance,
    loadRequest.serviceType,
    loadRequest.readyTime,
    loadRequest.deliveryDeadline
  )

  // Calculate temperature requirement fee
  let temperatureFee = 0
  let temperatureNote = ''
  if (loadRequest.temperatureRequirement === 'REFRIGERATED') {
    temperatureFee = 15 // $15 for refrigerated loads
    temperatureNote = 'Refrigerated load fee: $15.00'
  } else if (loadRequest.temperatureRequirement === 'FROZEN') {
    temperatureFee = 25 // $25 for frozen loads
    temperatureNote = 'Frozen load fee: $25.00'
  }

  // Calculate urgency fee based on priority level
  let urgencyFee = 0
  let urgencyNote = ''
  if (loadRequest.priorityLevel === 'HIGH') {
    urgencyFee = rateCalculation.breakdown.total * 0.15 // 15% surcharge
    urgencyNote = 'High priority surcharge: 15%'
  } else if (loadRequest.priorityLevel === 'CRITICAL') {
    urgencyFee = rateCalculation.breakdown.total * 0.30 // 30% surcharge
    urgencyNote = 'Critical priority surcharge: 30%'
  }

  // Check if STAT service type (already includes premium in rate calculation)
  const isStatService = loadRequest.serviceType === 'STAT' || loadRequest.serviceType === 'CRITICAL_STAT'
  const statNote = isStatService ? `STAT service premium included in base rate` : ''

  // Calculate total quote amount
  const baseTotal = rateCalculation.breakdown.total
  const totalQuote = baseTotal + temperatureFee + urgencyFee

  // Build quote notes explaining the breakdown
  const notesParts: string[] = []
  notesParts.push(`Distance: ${distance.toFixed(1)} miles`)
  notesParts.push(`Base Rate: $${rateCalculation.breakdown.total.toFixed(2)} (${loadRequest.serviceType} @ $${rateCalculation.breakdown.ratePerMile?.toFixed(2) || '0.00'}/mile)`)
  
  if (rateCalculation.breakdown.afterHoursSurcharge && rateCalculation.breakdown.afterHoursSurcharge > 0) {
    notesParts.push(`After-hours surcharge: $${rateCalculation.breakdown.afterHoursSurcharge.toFixed(2)}`)
  }
  
  if (temperatureFee > 0) {
    notesParts.push(temperatureNote)
  }
  
  if (urgencyFee > 0) {
    notesParts.push(`${urgencyNote}: $${urgencyFee.toFixed(2)}`)
  }
  
  if (isStatService) {
    notesParts.push(statNote)
  }
  
  notesParts.push(`Total Quote: $${totalQuote.toFixed(2)}`)
  notesParts.push(`Suggested Range: $${rateCalculation.suggestedRateMin.toFixed(2)} - $${rateCalculation.suggestedRateMax.toFixed(2)}`)

  const quoteNotes = notesParts.join('\n')

  return {
    quoteAmount: Math.round(totalQuote * 100) / 100, // Round to 2 decimal places
    quoteNotes,
    breakdown: {
      distance,
      baseRate: rateCalculation.breakdown.total,
      serviceTypeMultiplier: rateCalculation.breakdown.serviceMultiplier || 1,
      temperatureFee,
      urgencyFee,
      afterHoursSurcharge: rateCalculation.breakdown.afterHoursSurcharge || 0,
      total: totalQuote,
    },
    suggestedRange: {
      min: rateCalculation.suggestedRateMin,
      max: rateCalculation.suggestedRateMax,
    },
  }
}

/**
 * Generate quote and update load request
 */
export async function generateAndSetQuote(
  loadRequestId: string,
  overrideAmount?: number
): Promise<{
  quoteAmount: number
  quoteNotes: string
  loadRequest: any
}> {
  const quoteResult = await generateAutoQuote(loadRequestId)
  
  // Use override amount if provided, otherwise use calculated amount
  const finalQuoteAmount = overrideAmount ?? quoteResult.quoteAmount

  // Update load request with quote
  const updatedLoad = await prisma.loadRequest.update({
    where: { id: loadRequestId },
    data: {
      quoteAmount: finalQuoteAmount,
      quoteNotes: quoteResult.quoteNotes,
      status: 'QUOTED',
    },
    include: {
      shipper: true,
      pickupFacility: true,
      dropoffFacility: true,
    },
  })

  // Create tracking event
  await prisma.trackingEvent.create({
    data: {
      loadRequestId: loadRequestId,
      code: 'PRICE_QUOTED',
      label: 'Price Quoted',
      description: `Automated quote generated: $${finalQuoteAmount.toFixed(2)}`,
      locationText: `${updatedLoad.pickupFacility.city}, ${updatedLoad.pickupFacility.state}`,
      actorType: 'ADMIN',
    },
  })

  return {
    quoteAmount: finalQuoteAmount,
    quoteNotes: quoteResult.quoteNotes,
    loadRequest: updatedLoad,
  }
}

