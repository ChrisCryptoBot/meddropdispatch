// Rate Calculator Utility
// Calculates suggested rates based on distance and service type
// Uses DFW market rates: per-mile pricing based on service type

import { CalculatedRate } from './types'
import { RATE_CONFIG } from './constants'

/**
 * Check if a date/time is after-hours, weekend, or holiday
 */
export function isAfterHours(date: Date): boolean {
  const hour = date.getHours()
  const day = date.getDay() // 0 = Sunday, 6 = Saturday
  
  // Check if weekend
  if (!RATE_CONFIG.BUSINESS_HOURS.days.includes(day)) {
    return true
  }
  
  // Check if outside business hours
  if (hour < RATE_CONFIG.BUSINESS_HOURS.start || hour >= RATE_CONFIG.BUSINESS_HOURS.end) {
    return true
  }
  
  // Check if holiday (simplified - checks month-day)
  const monthDay = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  if (RATE_CONFIG.FEDERAL_HOLIDAYS.includes(monthDay)) {
    return true
  }
  
  return false
}

/**
 * Calculate after-hours surcharge
 */
export function calculateAfterHoursSurcharge(
  distance: number,
  isAfterHoursTime: boolean
): { perMile: number; flatFee: number; applied: number } {
  if (!isAfterHoursTime) {
    return { perMile: 0, flatFee: 0, applied: 0 }
  }
  
  const { perMile, flatFee, flatFeeThreshold } = RATE_CONFIG.AFTER_HOURS_SURCHARGE
  
  // Use flat fee for shorter distances, per-mile for longer
  if (distance < flatFeeThreshold) {
    return {
      perMile: perMile.target,
      flatFee: flatFee.target,
      applied: flatFee.target,
    }
  }
  
  // Use per-mile surcharge for longer distances
  const perMileSurcharge = distance * perMile.target
  return {
    perMile: perMile.target,
    flatFee: flatFee.target,
    applied: perMileSurcharge,
  }
}

/**
 * Calculate suggested rate based on distance and service type
 * Uses per-mile rates based on DFW market standards
 * Returns a rate range with breakdown
 */
export function calculateRate(
  distance: number,
  serviceType: string = 'ROUTINE',
  readyTime?: Date | string | null,
  deliveryDeadline?: Date | string | null
): CalculatedRate {
  // Normalize service type (map legacy types to new structure)
  let normalizedServiceType = serviceType
  if (serviceType === 'SAME_DAY' || serviceType === 'SCHEDULED_ROUTE' || 
      serviceType === 'OVERFLOW' || serviceType === 'GOVERNMENT' || 
      serviceType === 'OTHER') {
    normalizedServiceType = 'ROUTINE'
  }
  
  // Get rate per mile for service type
  const rateConfig = RATE_CONFIG.RATE_PER_MILE[
    normalizedServiceType as keyof typeof RATE_CONFIG.RATE_PER_MILE
  ] || RATE_CONFIG.RATE_PER_MILE.ROUTINE
  
  // Calculate base rate using target rate per mile
  const baseRatePerMile = rateConfig.target
  const baseRate = distance * baseRatePerMile
  
  // Check for after-hours surcharge
  let afterHoursSurcharge = 0
  let isAfterHoursTime = false
  
  if (readyTime || deliveryDeadline) {
    const checkDate = readyTime ? new Date(readyTime) : (deliveryDeadline ? new Date(deliveryDeadline) : new Date())
    isAfterHoursTime = isAfterHours(checkDate)
    
    if (isAfterHoursTime) {
      const surcharge = calculateAfterHoursSurcharge(distance, true)
      afterHoursSurcharge = surcharge.applied
    }
  }
  
  // Calculate total rate
  const totalRate = baseRate + afterHoursSurcharge
  
  // Calculate rate range (min to max) - includes after-hours if applicable
  const baseMinRate = distance * rateConfig.min
  const baseMaxRate = distance * rateConfig.max
  
  // Calculate after-hours surcharge for min/max ranges
  let afterHoursMin = 0
  let afterHoursMax = 0
  if (isAfterHoursTime) {
    const { flatFeeThreshold } = RATE_CONFIG.AFTER_HOURS_SURCHARGE
    if (distance < flatFeeThreshold) {
      // Use flat fee for shorter distances
      afterHoursMin = RATE_CONFIG.AFTER_HOURS_SURCHARGE.flatFee.min
      afterHoursMax = RATE_CONFIG.AFTER_HOURS_SURCHARGE.flatFee.max
    } else {
      // Use per-mile for longer distances
      afterHoursMin = distance * RATE_CONFIG.AFTER_HOURS_SURCHARGE.perMile.min
      afterHoursMax = distance * RATE_CONFIG.AFTER_HOURS_SURCHARGE.perMile.max
    }
  }
  
  const minRate = baseMinRate + afterHoursMin
  const maxRate = baseMaxRate + afterHoursMax
  
  // Ensure we meet minimum threshold for routine loads
  const minimumThreshold = normalizedServiceType === 'ROUTINE' && 'minimumThreshold' in rateConfig && rateConfig.minimumThreshold 
    ? rateConfig.minimumThreshold 
    : rateConfig.min
  const minimumRate = distance * minimumThreshold
  const finalRate = Math.max(totalRate, minimumRate)
  
  // Get estimated time (assume 45 mph average)
  const estimatedTime = Math.ceil((distance / 45) * 60)
  
  return {
    distance,
    time: estimatedTime,
    suggestedRateMin: Math.round(minRate * 100) / 100,
    suggestedRateMax: Math.round(maxRate * 100) / 100,
    breakdown: {
      baseRate: Math.round(baseRate * 100) / 100,
      distanceRate: Math.round(baseRate * 100) / 100,
      serviceMultiplier: 1.0, // Not used in new model, but kept for compatibility
      afterHoursSurcharge: Math.round(afterHoursSurcharge * 100) / 100,
      total: Math.round(finalRate * 100) / 100,
      ratePerMile: Math.round((finalRate / distance) * 100) / 100,
    },
  }
}

/**
 * Calculate rate with custom parameters
 */
export function calculateCustomRate(params: {
  distance: number
  baseRate?: number
  perMileRate?: number
  minimumRate?: number
  serviceMultiplier?: number
}): CalculatedRate {
  const {
    distance,
    baseRate = RATE_CONFIG.BASE_RATE,
    perMileRate = RATE_CONFIG.PER_MILE_RATE,
    minimumRate = RATE_CONFIG.MINIMUM_RATE,
    serviceMultiplier = 1.0,
  } = params

  // Calculate components
  const distanceRate = distance * perMileRate
  const subtotal = baseRate + distanceRate
  const total = Math.max(subtotal * serviceMultiplier, minimumRate)

  // Calculate range
  const suggestedRateMin =
    Math.round(total * RATE_CONFIG.RATE_RANGE_MIN_PERCENT * 100) / 100
  const suggestedRateMax =
    Math.round(total * RATE_CONFIG.RATE_RANGE_MAX_PERCENT * 100) / 100

  const estimatedTime = Math.ceil((distance / 45) * 60)

  return {
    distance,
    time: estimatedTime,
    suggestedRateMin,
    suggestedRateMax,
    breakdown: {
      baseRate,
      distanceRate: Math.round(distanceRate * 100) / 100,
      serviceMultiplier,
      total: Math.round(total * 100) / 100,
    },
  }
}

/**
 * Get service type multiplier
 */
export function getServiceMultiplier(serviceType: string): number {
  return (
    RATE_CONFIG.SERVICE_MULTIPLIERS[
      serviceType as keyof typeof RATE_CONFIG.SERVICE_MULTIPLIERS
    ] || 1.0
  )
}

/**
 * Format rate as currency string
 */
export function formatRate(rate: number): string {
  return `$${rate.toFixed(2)}`
}

/**
 * Format rate range as string
 */
export function formatRateRange(min: number, max: number): string {
  return `${formatRate(min)} - ${formatRate(max)}`
}

/**
 * Calculate profit margin on a rate
 */
export function calculateProfitMargin(
  rate: number,
  costs: {
    fuel?: number
    driver?: number
    overhead?: number
  }
): {
  totalCosts: number
  profit: number
  marginPercent: number
} {
  const totalCosts = (costs.fuel || 0) + (costs.driver || 0) + (costs.overhead || 0)
  const profit = rate - totalCosts
  const marginPercent = totalCosts > 0 ? (profit / rate) * 100 : 0

  return {
    totalCosts: Math.round(totalCosts * 100) / 100,
    profit: Math.round(profit * 100) / 100,
    marginPercent: Math.round(marginPercent * 10) / 10,
  }
}

/**
 * Calculate profit estimate for a load
 * Estimates costs based on distance and time
 */
export function calculateProfitEstimate(params: {
  rate: number
  totalDistance: number
  estimatedTimeMinutes?: number
  minimumRatePerMile?: number
  isManualLoad?: boolean
}): {
  estimatedCosts: {
    fuel: number
    driverTime: number
    overhead: number
    total: number
  }
  profit: number
  profitMargin: number
  ratePerMile: number
  meetsMinimumRate: boolean
  minimumRateRequired: number
} {
  const { rate, totalDistance, estimatedTimeMinutes, minimumRatePerMile, isManualLoad = false } = params

  // Estimate costs
  // Fuel: ~$0.50 per mile (average for courier vehicles)
  const fuelCostPerMile = 0.50
  const fuelCost = totalDistance * fuelCostPerMile

  // Driver time: $20/hour (minimum wage consideration)
  const estimatedHours = estimatedTimeMinutes ? estimatedTimeMinutes / 60 : totalDistance / 45 // Assume 45 mph average
  const driverTimeCost = estimatedHours * 20

  // Overhead: 10% of rate (insurance, maintenance, etc.)
  const overheadCost = rate * 0.10

  const totalCosts = fuelCost + driverTimeCost + overheadCost
  const profit = rate - totalCosts
  const profitMargin = rate > 0 ? (profit / rate) * 100 : 0

  // Calculate rate per mile
  const ratePerMile = totalDistance > 0 ? rate / totalDistance : 0

  // Check if meets minimum rate per mile (if set)
  const minimumRateRequired = minimumRatePerMile ? minimumRatePerMile * totalDistance : 0
  const meetsMinimumRate = !minimumRatePerMile || ratePerMile >= minimumRatePerMile

  return {
    estimatedCosts: {
      fuel: Math.round(fuelCost * 100) / 100,
      driverTime: Math.round(driverTimeCost * 100) / 100,
      overhead: Math.round(overheadCost * 100) / 100,
      total: Math.round(totalCosts * 100) / 100,
    },
    profit: Math.round(profit * 100) / 100,
    profitMargin: Math.round(profitMargin * 10) / 10,
    ratePerMile: Math.round(ratePerMile * 100) / 100,
    meetsMinimumRate,
    minimumRateRequired: Math.round(minimumRateRequired * 100) / 100,
  }
}

/**
 * Get breakdown text for display
 */
export function getRateBreakdownText(rate: CalculatedRate): string {
  const { breakdown } = rate

  return `
Base Rate: ${formatRate(breakdown.baseRate)}
Distance Rate: ${formatRate(breakdown.distanceRate)} (${rate.distance} mi × $${RATE_CONFIG.PER_MILE_RATE}/mi)
Service Multiplier: ${breakdown.serviceMultiplier}x
Total: ${formatRate(breakdown.total)}
Suggested Range: ${formatRateRange(rate.suggestedRateMin, rate.suggestedRateMax)}
  `.trim()
}


