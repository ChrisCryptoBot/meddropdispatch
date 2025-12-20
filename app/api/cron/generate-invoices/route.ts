import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { autoGenerateInvoiceForLoad } from '@/lib/invoicing'
import { createErrorResponse, withErrorHandling } from '@/lib/errors'

/**
 * POST /api/cron/generate-invoices
 * Automated invoice generation endpoint
 * 
 * This endpoint should be called by a cron job (Vercel Cron or GitHub Actions)
 * to automatically generate invoices for completed loads that haven't been invoiced yet.
 * 
 * Security: Should be protected with a secret token or Vercel Cron authentication
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    // Verify cron secret (if set)
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
      // Use the original request parameter for headers (always NextRequest)
      const authHeader = request.headers.get('authorization')
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    // Find all completed/delivered loads without invoices
    const loadsToInvoice = await prisma.loadRequest.findMany({
      where: {
        status: {
          in: ['DELIVERED', 'COMPLETED'],
        },
        invoiceId: null, // Not yet invoiced
        createdAt: {
          // Only process loads from the last 30 days (adjust as needed)
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        shipper: true,
      },
      take: 100, // Process in batches
    })

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [] as string[],
    }

    // Generate invoices for each load
    for (const load of loadsToInvoice) {
      try {
        await autoGenerateInvoiceForLoad(load.id)
        results.succeeded++
      } catch (error) {
        results.failed++
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        results.errors.push(`Load ${load.publicTrackingCode}: ${errorMessage}`)
        console.error(`Failed to generate invoice for load ${load.id}:`, error)
      }
      results.processed++
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} loads. ${results.succeeded} invoices generated, ${results.failed} failed.`,
      results,
      timestamp: new Date().toISOString(),
    })
  })(request)
}

/**
 * GET /api/cron/generate-invoices
 * Health check endpoint for cron job monitoring
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Invoice generation cron endpoint is active',
    timestamp: new Date().toISOString(),
  })
}


