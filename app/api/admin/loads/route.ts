import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling } from '@/lib/errors'
import { getAuthSession } from '@/lib/auth-session'

/**
 * GET /api/admin/loads
 * List all load requests with filtering and pagination
 * Optimized for performance: Selects only necessary fields
 */
export async function GET(request: NextRequest) {
    return withErrorHandling(async (req: Request) => {
        // 1. Authorization
        const session = await getAuthSession(req as any)
        if (!session || session.userType !== 'admin') {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'Admin access required' },
                { status: 401 }
            )
        }

        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '50')
        const status = searchParams.get('status')
        const search = searchParams.get('search')
        const skip = (page - 1) * limit

        // 2. Build Query Filters
        const where: any = {}

        if (status) {
            where.status = status
        }

        if (search) {
            where.OR = [
                { publicTrackingCode: { contains: search } },
                { shipper: { companyName: { contains: search } } },
                { shipper: { email: { contains: search } } }
            ]
        }

        // 3. Execute Optimized Query (with parallel stats)
        const activeStatuses = ['NEW', 'QUOTED', 'QUOTE_ACCEPTED', 'SCHEDULED', 'PICKED_UP', 'IN_TRANSIT']

        const [total, loads, activeCount, completedCount, newCount] = await prisma.$transaction([
            // 1. Total matching current filter
            prisma.loadRequest.count({ where }),

            // 2. Paginated data
            prisma.loadRequest.findMany({
                where,
                take: limit,
                skip,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    publicTrackingCode: true,
                    status: true,
                    serviceType: true,
                    quoteAmount: true,
                    createdAt: true,
                    shipper: {
                        select: {
                            id: true,
                            companyName: true,
                            email: true
                        }
                    },
                    pickupFacility: {
                        select: {
                            city: true,
                            state: true
                        }
                    },
                    dropoffFacility: {
                        select: {
                            city: true,
                            state: true
                        }
                    }
                }
            }),

            // 3. Dashboard stats (independent of filter)
            prisma.loadRequest.count({ where: { status: { in: activeStatuses } } }),
            prisma.loadRequest.count({ where: { status: 'DELIVERED' } }),
            prisma.loadRequest.count({ where: { status: 'NEW' } })
        ])

        const stats = {
            total: await prisma.loadRequest.count(),
            active: activeCount,
            completed: completedCount,
            new: newCount
        }

        return NextResponse.json({
            loads,
            pagination: {
                total, // Matches current filter
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            },
            stats // Global stats
        })
    })(request)
}
