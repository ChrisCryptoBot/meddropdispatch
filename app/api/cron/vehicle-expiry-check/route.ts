// Cron Job Endpoint: Vehicle Registration Expiry Check
// Should be called daily at midnight via cron job or scheduled task
// Example: Vercel Cron, GitHub Actions, or external cron service

import { NextRequest, NextResponse } from 'next/server'
import { runVehicleExpiryCheck } from '@/lib/vehicle-notifications'

/**
 * POST /api/cron/vehicle-expiry-check
 * Daily check for vehicle registration expiry (cron job)
 * 
 * Security: Should be protected with a secret token or Vercel Cron
 */
export async function POST(request: NextRequest) {
  // Verify cron secret (if using external cron)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    await runVehicleExpiryCheck()
    return NextResponse.json({
      success: true,
      message: 'Vehicle expiry check completed',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Cron] Vehicle expiry check failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/cron/vehicle-expiry-check
 * Manual trigger for testing (should be disabled in production or protected)
 */
export async function GET(request: NextRequest) {
  // Only allow in development or with admin auth
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    )
  }

  try {
    await runVehicleExpiryCheck()
    return NextResponse.json({
      success: true,
      message: 'Vehicle expiry check completed (manual trigger)',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

