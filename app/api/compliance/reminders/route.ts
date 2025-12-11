// Compliance Reminders API Route
// GET: Get all compliance reminders

import { NextRequest, NextResponse } from 'next/server'
import { getAllComplianceReminders } from '@/lib/compliance'

/**
 * GET /api/compliance/reminders
 * Get all compliance reminders
 */
export async function GET(request: NextRequest) {
  try {
    const reminders = await getAllComplianceReminders()

    return NextResponse.json({
      reminders,
      total: reminders.length,
      critical: reminders.filter((r) => r.severity === 'CRITICAL').length,
      warnings: reminders.filter((r) => r.severity === 'WARNING').length,
    })
  } catch (error) {
    console.error('Error fetching compliance reminders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch compliance reminders' },
      { status: 500 }
    )
  }
}

