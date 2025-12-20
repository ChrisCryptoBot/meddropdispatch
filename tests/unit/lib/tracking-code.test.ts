
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isValidTrackingCode, formatTrackingCode, generateTrackingCode } from '@/lib/tracking'
import { prisma } from '@/lib/prisma'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
    prisma: {
        shipper: {
            findUnique: vi.fn(),
            update: vi.fn(),
        },
        loadRequest: {
            count: vi.fn(),
            findUnique: vi.fn(),
        },
    },
}))

describe('Tracking Code Utilities', () => {
    describe('isValidTrackingCode', () => {
        it('validates correct format', () => {
            expect(isValidTrackingCode('ABC-241210-001')).toBe(true)
            expect(isValidTrackingCode('TEST-241210-123')).toBe(true)
        })

        it('invalidates incorrect format', () => {
            expect(isValidTrackingCode('AB-241210-001')).toBe(false) // too short
            expect(isValidTrackingCode('ABCDE-241210-001')).toBe(false) // too long
            expect(isValidTrackingCode('ABC-24121-001')).toBe(false) // bad date
            expect(isValidTrackingCode('ABC-241210-01')).toBe(false) // bad sequence
        })
    })

    describe('formatTrackingCode', () => {
        it('formats input correctly', () => {
            expect(formatTrackingCode('abc-123')).toBe('ABC-123')
            expect(formatTrackingCode('  xyz-999  ')).toBe('XYZ-999')
        })
    })

    describe('generateTrackingCode', () => {
        beforeEach(() => {
            vi.resetAllMocks()
        })

        it('generates a new code for existing shipper', async () => {
            // Mock Shipper
            vi.mocked(prisma.shipper.findUnique).mockResolvedValue({
                id: 'shipper-1',
                companyName: 'Test Corp',
                shipperCode: 'TEST'
            } as any)

            // Mock Count (today's loads)
            vi.mocked(prisma.loadRequest.count).mockResolvedValue(5)

            // Mock Uniqueness Check
            vi.mocked(prisma.loadRequest.findUnique).mockResolvedValue(null)

            const shipperId = 'shipper-1'
            const code = await generateTrackingCode(shipperId)

            // Date dynamic check
            const today = new Date()
            const year = today.getFullYear().toString().slice(-2)
            const month = (today.getMonth() + 1).toString().padStart(2, '0')
            const day = today.getDate().toString().padStart(2, '0')
            const dateStr = `${year}${month}${day}`

            expect(code).toBe(`TEST-${dateStr}-006`) // 5 + 1 = 6, padded to 006
            expect(prisma.shipper.findUnique).toHaveBeenCalledWith({
                where: { id: shipperId },
                select: { shipperCode: true, companyName: true }
            })
        })

        it('generates shipper code if missing', async () => {
            // Mock Shipper with NO code
            vi.mocked(prisma.shipper.findUnique).mockResolvedValue({
                id: 'shipper-2',
                companyName: 'New Client',
                shipperCode: null
            } as any)

            // Mock Shipper Code uniqueness check inside the generator
            // The generator checks `prisma.shipper.findUnique` for code uniqueness too.
            // We need to handle sequential calls to findUnique.
            // 1. Get Shipper (id)
            // 2. Check Uniqueness (code)

            vi.mocked(prisma.shipper.findUnique)
                .mockResolvedValueOnce({ // 1. Get Shipper
                    id: 'shipper-2',
                    companyName: 'New Client',
                    shipperCode: null
                } as any)
                .mockResolvedValueOnce(null) // 2. Check Uniqueness of 'NEWX' or 'NEWC' -> null means unique

            vi.mocked(prisma.loadRequest.count).mockResolvedValue(0)
            vi.mocked(prisma.loadRequest.findUnique).mockResolvedValue(null)

            const code = await generateTrackingCode('shipper-2')

            // Expected: NEW (from New Client) -> NEWC (4 chars) or NEWX?
            // Code logic: (shipper.companyName || 'SHIPPER').replace... ==> NEWCLIENT
            // substring(0,4) -> NEWC

            expect(code).toMatch(/^NEWC-\d{6}-001$/)
        })
    })
})
