import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  calculateRate,
  isAfterHours,
  calculateAfterHoursSurcharge,
} from '@/lib/rate-calculator'
import { RATE_CONFIG } from '@/lib/constants'

describe('Rate Calculator', () => {
  describe('isAfterHours', () => {
    it('detects weekends correctly', () => {
      // Saturday
      const saturday = new Date('2024-12-14T10:00:00') // Saturday
      expect(isAfterHours(saturday)).toBe(true)

      // Sunday
      const sunday = new Date('2024-12-15T10:00:00') // Sunday
      expect(isAfterHours(sunday)).toBe(true)

      // Monday (business day)
      const monday = new Date('2024-12-16T10:00:00') // Monday
      expect(isAfterHours(monday)).toBe(false)
    })

    it('detects outside business hours', () => {
      // Before business hours (8 AM)
      const earlyMorning = new Date('2024-12-16T06:00:00') // Monday 6 AM
      expect(isAfterHours(earlyMorning)).toBe(true)

      // During business hours
      const businessHours = new Date('2024-12-16T14:00:00') // Monday 2 PM
      expect(isAfterHours(businessHours)).toBe(false)

      // After business hours (6 PM)
      const evening = new Date('2024-12-16T20:00:00') // Monday 8 PM
      expect(isAfterHours(evening)).toBe(true)
    })

    it('detects holidays', () => {
      // New Year's Day (01-01)
      const newYear = new Date('2024-01-01T14:00:00')
      expect(isAfterHours(newYear)).toBe(true)

      // Regular business day
      const regularDay = new Date('2024-12-16T14:00:00')
      expect(isAfterHours(regularDay)).toBe(false)
    })
  })

  describe('calculateAfterHoursSurcharge', () => {
    it('returns zero surcharge for business hours', () => {
      const result = calculateAfterHoursSurcharge(50, false)
      expect(result.applied).toBe(0)
      expect(result.perMile).toBe(0)
      expect(result.flatFee).toBe(0)
    })

    it('applies flat fee for short distances after hours', () => {
      const shortDistance = 5 // miles
      const result = calculateAfterHoursSurcharge(shortDistance, true)
      
      expect(result.applied).toBeGreaterThan(0)
      expect(result.flatFee).toBeGreaterThan(0)
    })

    it('applies per-mile surcharge for long distances after hours', () => {
      const longDistance = 100 // miles
      const result = calculateAfterHoursSurcharge(longDistance, true)
      
      expect(result.applied).toBeGreaterThan(0)
      expect(result.perMile).toBeGreaterThan(0)
    })
  })

  describe('calculateRate', () => {
    it('calculates base rate for ROUTINE service', () => {
      const distance = 50 // miles
      const result = calculateRate(distance, 'ROUTINE')

      expect(result.baseRate).toBeGreaterThan(0)
      expect(result.distance).toBe(distance)
      expect(result.serviceType).toBe('ROUTINE')
    })

    it('calculates higher rate for STAT service', () => {
      const distance = 50
      const routineRate = calculateRate(distance, 'ROUTINE')
      const statRate = calculateRate(distance, 'STAT')

      expect(statRate.baseRate).toBeGreaterThan(routineRate.baseRate)
    })

    it('calculates higher rate for CRITICAL_STAT service', () => {
      const distance = 50
      const routineRate = calculateRate(distance, 'ROUTINE')
      const criticalRate = calculateRate(distance, 'CRITICAL_STAT')

      expect(criticalRate.baseRate).toBeGreaterThan(routineRate.baseRate)
    })

    it('applies after-hours surcharge when readyTime is after hours', () => {
      const distance = 50
      const afterHoursTime = new Date('2024-12-14T20:00:00') // Saturday 8 PM
      const result = calculateRate(distance, 'ROUTINE', afterHoursTime)

      expect(result.afterHoursSurcharge).toBeGreaterThan(0)
      expect(result.totalRate).toBeGreaterThan(result.baseRate)
    })

    it('does not apply surcharge for business hours', () => {
      const distance = 50
      const businessHoursTime = new Date('2024-12-16T14:00:00') // Monday 2 PM
      const result = calculateRate(distance, 'ROUTINE', businessHoursTime)

      expect(result.afterHoursSurcharge).toBe(0)
      expect(result.totalRate).toBe(result.baseRate)
    })

    it('handles zero distance', () => {
      const result = calculateRate(0, 'ROUTINE')
      expect(result.baseRate).toBe(0)
      expect(result.totalRate).toBeGreaterThanOrEqual(0)
    })

    it('handles very long distances', () => {
      const longDistance = 500 // miles
      const result = calculateRate(longDistance, 'ROUTINE')

      expect(result.baseRate).toBeGreaterThan(0)
      expect(result.distance).toBe(longDistance)
    })

    it('includes rate breakdown in response', () => {
      const result = calculateRate(50, 'ROUTINE')

      expect(result).toHaveProperty('baseRate')
      expect(result).toHaveProperty('afterHoursSurcharge')
      expect(result).toHaveProperty('totalRate')
      expect(result).toHaveProperty('ratePerMile')
      expect(result).toHaveProperty('distance')
      expect(result).toHaveProperty('serviceType')
    })

    it('normalizes legacy service types to ROUTINE', () => {
      const distance = 50
      const sameDayRate = calculateRate(distance, 'SAME_DAY')
      const routineRate = calculateRate(distance, 'ROUTINE')

      expect(sameDayRate.serviceType).toBe('ROUTINE')
      expect(sameDayRate.baseRate).toBe(routineRate.baseRate)
    })
  })
})










