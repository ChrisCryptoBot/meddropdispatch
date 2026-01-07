# Redis-Based Rate Limiting for Production

## Overview

The current rate limiting implementation uses in-memory storage, which is not suitable for production (especially with multiple server instances). This guide covers migrating to Redis-based rate limiting.

## Current Implementation

**Location:** `lib/rate-limit.ts`

**Limitations:**
- In-memory Map storage (per-instance, not shared)
- Lost on server restart
- Doesn't work across multiple instances
- No persistence

## Production Solution: Redis

### Option 1: Upstash Redis (Recommended for Vercel)

**Why Upstash:**
- Serverless Redis (pay per request)
- Edge-compatible
- Free tier available
- Easy integration with Vercel

**Installation:**
```bash
npm install @upstash/ratelimit @upstash/redis
```

**Setup:**
1. Create account at [upstash.com](https://upstash.com)
2. Create Redis database
3. Copy REST URL and token
4. Add to `.env`:
```env
UPSTASH_REDIS_REST_URL=your_url
UPSTASH_REDIS_REST_TOKEN=your_token
```

**Implementation:**
```typescript
// lib/rate-limit-redis.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export const rateLimiters = {
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    analytics: true,
  }),
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    analytics: true,
  }),
  upload: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    analytics: true,
  }),
  publicTracking: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '5 m'),
    analytics: true,
  }),
}
```

**Usage in API routes:**
```typescript
import { rateLimiters } from '@/lib/rate-limit-redis'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  // Get client identifier
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             'unknown'
  
  // Check rate limit
  const { success, limit, remaining, reset } = await rateLimiters.api.limit(ip)
  
  if (!success) {
    return new Response('Too many requests', {
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString(),
      },
    })
  }
  
  // Continue with request...
}
```

### Option 2: Vercel KV

**Why Vercel KV:**
- Native Vercel integration
- Edge-compatible
- Simple setup

**Installation:**
```bash
npm install @vercel/kv
```

**Setup:**
1. Create KV store in Vercel dashboard
2. Environment variables auto-configured

**Implementation:**
```typescript
import { kv } from '@vercel/kv'

export async function checkRateLimit(
  key: string,
  limit: number,
  window: number
): Promise<{ allowed: boolean; remaining: number }> {
  const count = await kv.incr(key)
  
  if (count === 1) {
    await kv.expire(key, window)
  }
  
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
  }
}
```

### Option 3: Traditional Redis (Self-Hosted/AWS ElastiCache)

**When to Use:**
- High traffic
- Existing Redis infrastructure
- Need for advanced features

**Installation:**
```bash
npm install ioredis
```

**Implementation:**
```typescript
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

export async function checkRateLimit(
  key: string,
  limit: number,
  window: number
): Promise<{ allowed: boolean; remaining: number }> {
  const count = await redis.incr(key)
  
  if (count === 1) {
    await redis.expire(key, window)
  }
  
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
  }
}
```

## Migration Steps

1. **Choose Redis provider** (Upstash recommended)
2. **Install dependencies**
3. **Create new rate limiting module** (`lib/rate-limit-redis.ts`)
4. **Update API routes** to use new rate limiter
5. **Test rate limiting** under load
6. **Remove old in-memory implementation**

## Testing

```typescript
// tests/rate-limiting.test.ts
import { rateLimiters } from '@/lib/rate-limit-redis'

describe('Rate Limiting', () => {
  it('should limit requests', async () => {
    const ip = '127.0.0.1'
    
    // Make requests up to limit
    for (let i = 0; i < 60; i++) {
      const result = await rateLimiters.api.limit(ip)
      expect(result.success).toBe(true)
    }
    
    // Next request should be rate limited
    const result = await rateLimiters.api.limit(ip)
    expect(result.success).toBe(false)
  })
})
```

## Monitoring

**Upstash Dashboard:**
- View rate limit analytics
- Monitor usage
- Set up alerts

**Custom Metrics:**
- Track rate limit hits
- Monitor blocked requests
- Alert on abuse patterns

## Best Practices

1. **Use different limits per endpoint type**
   - Auth: Stricter (5/15min)
   - API: Moderate (60/1min)
   - Public: Lenient (100/5min)

2. **Include user ID in key** (for authenticated requests)
   ```typescript
   const key = `rate:${userType}:${userId}`
   ```

3. **Return rate limit headers** in responses
   ```typescript
   headers: {
     'X-RateLimit-Limit': limit.toString(),
     'X-RateLimit-Remaining': remaining.toString(),
     'X-RateLimit-Reset': reset.toString(),
   }
   ```

4. **Log rate limit violations** for security monitoring

5. **Implement exponential backoff** for clients

## Cost Considerations

**Upstash:**
- Free tier: 10,000 commands/day
- Paid: $0.20 per 100K commands

**Vercel KV:**
- Free tier: 256MB storage
- Paid: $0.20 per 100K reads

**AWS ElastiCache:**
- Pay for instance (varies by size)

## References

- [Upstash Rate Limiting](https://upstash.com/docs/redis/features/ratelimit)
- [Vercel KV](https://vercel.com/docs/storage/vercel-kv)
- [Redis Rate Limiting Patterns](https://redis.io/docs/manual/patterns/rate-limiting/)

