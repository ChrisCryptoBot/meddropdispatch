// Health Check API Endpoint
// Used for monitoring and load balancer health checks

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

/**
 * GET /api/health
 * Health check endpoint for monitoring
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const health: {
    status: 'healthy' | 'degraded' | 'unhealthy'
    timestamp: string
    uptime: number
    services: {
      database: 'healthy' | 'unhealthy'
      databaseLatency?: number
    }
    version?: string
  } = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: 'unhealthy',
    },
  }

  try {
    // Check database connectivity
    const dbStartTime = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const dbLatency = Date.now() - dbStartTime
    
    health.services.database = 'healthy'
    health.services.databaseLatency = dbLatency

    // If database is slow, mark as degraded
    if (dbLatency > 1000) {
      health.status = 'degraded'
      logger.warn('Database health check slow', { latency: dbLatency })
    }

    // Add version if available
    if (process.env.APP_VERSION) {
      health.version = process.env.APP_VERSION
    }

    const duration = Date.now() - startTime
    logger.info('Health check completed', { status: health.status, duration })

    return NextResponse.json(health, {
      status: health.status === 'unhealthy' ? 503 : health.status === 'degraded' ? 200 : 200,
    })
  } catch (error) {
    health.status = 'unhealthy'
    health.services.database = 'unhealthy'
    
    const duration = Date.now() - startTime
    logger.error('Health check failed', error instanceof Error ? error : new Error('Unknown error'), {
      duration,
    })

    return NextResponse.json(health, { status: 503 })
  }
}

/**
 * GET /api/health/ready
 * Readiness probe - checks if service is ready to accept traffic
 */
export async function GET_READY(request: NextRequest) {
  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`
    
    return NextResponse.json({ status: 'ready' }, { status: 200 })
  } catch (error) {
    logger.error('Readiness check failed', error instanceof Error ? error : new Error('Unknown error'))
    return NextResponse.json({ status: 'not ready' }, { status: 503 })
  }
}

/**
 * GET /api/health/live
 * Liveness probe - checks if service is alive
 */
export async function GET_LIVE(request: NextRequest) {
  // Simple liveness check - just return OK
  return NextResponse.json({ status: 'alive' }, { status: 200 })
}


