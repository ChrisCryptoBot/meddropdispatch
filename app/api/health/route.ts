import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuditLogHealthStatus } from '@/lib/audit-log-health-check'

/**
 * GET /api/health
 * Health check endpoint for monitoring and uptime checks
 * Returns system status, database connectivity, and basic metrics
 */
export async function GET() {
  const startTime = Date.now()
  const health: {
    status: 'healthy' | 'degraded' | 'unhealthy'
    timestamp: string
    uptime: number
    database: {
      status: 'connected' | 'disconnected' | 'error'
      responseTime?: number
      error?: string
    }
    auditLog: {
      status: 'healthy' | 'unhealthy' | 'not_checked'
      checked: boolean
    }
    encryption: {
      status: 'configured' | 'missing'
      keySet: boolean
    }
    version: string
    environment: string
  } = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      status: 'disconnected',
    },
    auditLog: {
      status: 'not_checked',
      checked: false,
    },
    encryption: {
      status: 'missing',
      keySet: false,
    },
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  }

  // Check database connectivity
  try {
    const dbStartTime = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const dbResponseTime = Date.now() - dbStartTime
    health.database = {
      status: 'connected',
      responseTime: dbResponseTime,
    }

    // If database is slow, mark as degraded
    if (dbResponseTime > 1000) {
      health.status = 'degraded'
    }
  } catch (error) {
    health.status = 'unhealthy'
    health.database = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown database error',
    }
  }

  // Check audit log health
  try {
    const auditStatus = getAuditLogHealthStatus()
    health.auditLog = {
      status: auditStatus.healthy ? 'healthy' : 'unhealthy',
      checked: auditStatus.checked,
    }
    if (!auditStatus.healthy && auditStatus.checked) {
      health.status = health.status === 'healthy' ? 'degraded' : health.status
    }
  } catch (error) {
    health.auditLog = {
      status: 'unhealthy',
      checked: false,
    }
    health.status = 'degraded'
  }

  // Check encryption key configuration
  const encryptionKeySet = !!process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length === 64
  health.encryption = {
    status: encryptionKeySet ? 'configured' : 'missing',
    keySet: encryptionKeySet,
  }
  if (!encryptionKeySet && process.env.NODE_ENV === 'production') {
    health.status = 'unhealthy'
  }

  const totalResponseTime = Date.now() - startTime

  // Determine overall status
  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503

  return NextResponse.json(
    {
      ...health,
      responseTime: totalResponseTime,
    },
    { status: statusCode }
  )
}
