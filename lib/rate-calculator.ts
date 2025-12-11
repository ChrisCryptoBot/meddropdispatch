// Rate Calculator Utility
// Calculates suggested rates based on distance and service type

import { CalculatedRate } from './types'
import { RATE_CONFIG } from './constants'

/**
 * Calculate suggested rate based on distance and service type
 * Returns a rate range with breakdown
 */
export function calculateRate(
  distance: number,
  serviceType: string = 'SAME_DAY'
): CalculatedRate {
  const { BASE_RATE, PER_MILE_RATE, MINIMUM_RATE, SERVICE_MULTIPLIERS } =
    RATE_CONFIG

  // Get service multiplier (default to 1.0 if not found)
  const serviceMultiplier =
    SERVICE_MULTIPLIERS[serviceType as keyof typeof SERVICE_MULTIPLIERS] || 1.0

  // Calculate base components
  const baseRate = BASE_RATE
  const distanceRate = distance * PER_MILE_RATE

  // Calculate total before multiplier
  const subtotal = baseRate + distanceRate

  // Apply service multiplier
  const total = subtotal * serviceMultiplier

  // Apply minimum rate
  const finalRate = Math.max(total, MINIMUM_RATE)

  // Calculate rate range (5% below to 10% above)
  const suggestedRateMin =
    Math.round(finalRate * RATE_CONFIG.RATE_RANGE_MIN_PERCENT * 100) / 100
  const suggestedRateMax =
    Math.round(finalRate * RATE_CONFIG.RATE_RANGE_MAX_PERCENT * 100) / 100

  // Get estimated time (assume 45 mph average)
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
      total: Math.round(finalRate * 100) / 100,
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


