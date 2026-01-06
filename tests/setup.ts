/**
 * Vitest Setup File
 * Global test configuration and mocks
 */

import { beforeAll, afterAll } from 'vitest'

// Mock environment variables for tests
// Use Object.defineProperty to set read-only NODE_ENV
// NODE_ENV is usually set by the test runner (Vitest)
// We set other env vars here
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'file:./test.db'
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.NEXTAUTH_URL = 'http://localhost:3000'

// Global test setup
beforeAll(() => {
  // Setup code that runs before all tests
  console.log('🧪 Running tests...')
})

// Global test teardown
afterAll(() => {
  // Cleanup code that runs after all tests
  console.log('✅ Tests complete')
})


