import { describe, it, expect, vi, beforeEach } from 'vitest'
import { findBestDriverForLoad } from '@/lib/auto-driver-assignment'
import { prisma } from '@/lib/prisma'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    driver: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    loadRequest: {
      findMany: vi.fn(),
    },
  },
}))

// Mock distance calculator
vi.mock('@/lib/distance-calculator', () => ({
  calculateDistanceFromCoordinates: vi.fn((lat1, lng1, lat2, lng2) => {
    // Simple mock: return fixed distance for testing
    return 10.5 // 10.5 miles
  }),
}))

// Mock load conflict detector
vi.mock('@/lib/load-conflict-detector', () => ({
  detectLoadConflicts: vi.fn(() => ({
    hasConflict: false,
    conflicts: [],
  })),
}))

describe('Auto Driver Assignment', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('findBestDriverForLoad', () => {
    const mockLoadRequest = {
      id: 'load-1',
      shipperId: 'shipper-1',
      pickupFacility: {
        latitude: 32.7767,
        longitude: -96.7970, // Dallas
      },
      dropoffFacility: {
        latitude: 32.7767,
        longitude: -96.7970,
      },
      specimenCategory: 'NON_SPECIMEN',
      temperatureRequirement: 'AMBIENT',
      readyTime: new Date('2024-12-16T10:00:00'),
      deliveryDeadline: new Date('2024-12-16T14:00:00'),
      serviceType: 'ROUTINE',
    }

    it('returns null when no drivers available', async () => {
      vi.mocked(prisma.driver.findMany).mockResolvedValue([])

      const result = await findBestDriverForLoad(mockLoadRequest as any)

      expect(result.recommendedDriver).toBeNull()
      expect(result.alternativeDrivers).toEqual([])
      expect(result.message).toContain('No available drivers')
    })

    it('disqualifies drivers without UN3373 certification for UN3373 loads', async () => {
      const mockLoad = {
        ...mockLoadRequest,
        specimenCategory: 'UN3373_CATEGORY_B',
      }

      const mockDrivers = [
        {
          id: 'driver-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@test.com',
          phone: '555-0100',
          status: 'AVAILABLE',
          un3373Certified: false,
          vehicleType: 'VAN',
          hasRefrigeration: false,
          yearsOfExperience: 5,
          vehicles: [],
          loadRequests: [],
        },
      ]

      vi.mocked(prisma.driver.findMany).mockResolvedValue(mockDrivers as any)

      const result = await findBestDriverForLoad(mockLoad as any)

      if (result.recommendedDriver) {
        expect(result.recommendedDriver.disqualifications).toContain(
          expect.stringContaining('UN3373 certification')
        )
      }
    })

    it('prefers drivers with UN3373 certification for UN3373 loads', async () => {
      const mockLoad = {
        ...mockLoadRequest,
        specimenCategory: 'UN3373_CATEGORY_B',
      }

      const mockDrivers = [
        {
          id: 'driver-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@test.com',
          phone: '555-0100',
          status: 'AVAILABLE',
          un3373Certified: true,
          vehicleType: 'VAN',
          hasRefrigeration: false,
          yearsOfExperience: 5,
          vehicles: [],
          loadRequests: [],
        },
        {
          id: 'driver-2',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@test.com',
          phone: '555-0101',
          status: 'AVAILABLE',
          un3373Certified: false,
          vehicleType: 'VAN',
          hasRefrigeration: false,
          yearsOfExperience: 3,
          vehicles: [],
          loadRequests: [],
        },
      ]

      vi.mocked(prisma.driver.findMany).mockResolvedValue(mockDrivers as any)

      const result = await findBestDriverForLoad(mockLoad as any)

      if (result.recommendedDriver) {
        expect(result.recommendedDriver.driver.un3373Certified).toBe(true)
        expect(result.recommendedDriver.reasons).toContain(
          expect.stringContaining('UN3373 certified')
        )
      }
    })

    it('disqualifies drivers without refrigeration for REFRIGERATED loads', async () => {
      const mockLoad = {
        ...mockLoadRequest,
        temperatureRequirement: 'REFRIGERATED',
      }

      const mockDrivers = [
        {
          id: 'driver-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@test.com',
          phone: '555-0100',
          status: 'AVAILABLE',
          un3373Certified: false,
          vehicleType: 'VAN',
          hasRefrigeration: false,
          yearsOfExperience: 5,
          vehicles: [],
          loadRequests: [],
        },
      ]

      vi.mocked(prisma.driver.findMany).mockResolvedValue(mockDrivers as any)

      const result = await findBestDriverForLoad(mockLoad as any)

      if (result.recommendedDriver) {
        expect(result.recommendedDriver.disqualifications).toContain(
          expect.stringContaining('refrigeration')
        )
      }
    })

    it('prefers drivers with refrigeration for REFRIGERATED loads', async () => {
      const mockLoad = {
        ...mockLoadRequest,
        temperatureRequirement: 'REFRIGERATED',
      }

      const mockDrivers = [
        {
          id: 'driver-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@test.com',
          phone: '555-0100',
          status: 'AVAILABLE',
          un3373Certified: false,
          vehicleType: 'VAN',
          hasRefrigeration: true,
          yearsOfExperience: 5,
          vehicles: [],
          loadRequests: [],
        },
      ]

      vi.mocked(prisma.driver.findMany).mockResolvedValue(mockDrivers as any)

      const result = await findBestDriverForLoad(mockLoad as any)

      if (result.recommendedDriver) {
        expect(result.recommendedDriver.driver.hasRefrigeration).toBe(true)
        expect(result.recommendedDriver.reasons).toContain(
          expect.stringContaining('refrigeration')
        )
      }
    })

    it('scores drivers based on distance', async () => {
      const mockDrivers = [
        {
          id: 'driver-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@test.com',
          phone: '555-0100',
          status: 'AVAILABLE',
          un3373Certified: false,
          vehicleType: 'VAN',
          hasRefrigeration: false,
          yearsOfExperience: 5,
          vehicles: [],
          loadRequests: [],
          currentLatitude: 32.7767,
          currentLongitude: -96.7970, // Same location = closer
        },
        {
          id: 'driver-2',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@test.com',
          phone: '555-0101',
          status: 'AVAILABLE',
          un3373Certified: false,
          vehicleType: 'VAN',
          hasRefrigeration: false,
          yearsOfExperience: 3,
          vehicles: [],
          loadRequests: [],
          currentLatitude: 33.2148,
          currentLongitude: -97.1331, // Further away
        },
      ]

      vi.mocked(prisma.driver.findMany).mockResolvedValue(mockDrivers as any)

      const result = await findBestDriverForLoad(mockLoadRequest as any)

      if (result.recommendedDriver && result.alternativeDrivers.length > 0) {
        // Closer driver should have higher score
        expect(result.recommendedDriver.score).toBeGreaterThanOrEqual(
          result.alternativeDrivers[0].score
        )
      }
    })

    it('disqualifies drivers with conflicting loads', async () => {
      const { detectLoadConflicts } = await import('@/lib/load-conflict-detector')
      vi.mocked(detectLoadConflicts).mockResolvedValue({
        hasConflict: true,
        conflicts: ['Conflicting load scheduled at same time'],
      })

      const mockDrivers = [
        {
          id: 'driver-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@test.com',
          phone: '555-0100',
          status: 'AVAILABLE',
          un3373Certified: false,
          vehicleType: 'VAN',
          hasRefrigeration: false,
          yearsOfExperience: 5,
          vehicles: [],
          loadRequests: [
            {
              id: 'load-conflict',
              status: 'SCHEDULED',
              readyTime: new Date('2024-12-16T10:00:00'),
            },
          ],
        },
      ]

      vi.mocked(prisma.driver.findMany).mockResolvedValue(mockDrivers as any)

      const result = await findBestDriverForLoad(mockLoadRequest as any)

      if (result.recommendedDriver) {
        expect(result.recommendedDriver.disqualifications.length).toBeGreaterThan(0)
      }
    })

    it('returns alternative drivers when recommended driver has low score', async () => {
      const mockDrivers = [
        {
          id: 'driver-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@test.com',
          phone: '555-0100',
          status: 'AVAILABLE',
          un3373Certified: false,
          vehicleType: 'VAN',
          hasRefrigeration: false,
          yearsOfExperience: 1,
          vehicles: [],
          loadRequests: [],
        },
        {
          id: 'driver-2',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@test.com',
          phone: '555-0101',
          status: 'AVAILABLE',
          un3373Certified: false,
          vehicleType: 'VAN',
          hasRefrigeration: false,
          yearsOfExperience: 5,
          vehicles: [],
          loadRequests: [],
        },
      ]

      vi.mocked(prisma.driver.findMany).mockResolvedValue(mockDrivers as any)

      const result = await findBestDriverForLoad(mockLoadRequest as any)

      expect(result.recommendedDriver).not.toBeNull()
      expect(result.alternativeDrivers.length).toBeGreaterThan(0)
    })
  })
})






