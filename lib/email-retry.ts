/**
 * Email Retry Utility
 * Provides retry logic with exponential backoff for email sending
 */

interface RetryOptions {
    maxRetries?: number
    initialDelay?: number
    maxDelay?: number
    backoffMultiplier?: number
}

/**
 * Retry a function with exponential backoff
 * @param fn - Async function to retry
 * @param options - Retry configuration
 * @returns Result of the function
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const {
        maxRetries = 3,
        initialDelay = 1000, // 1 second
        maxDelay = 10000, // 10 seconds
        backoffMultiplier = 2,
    } = options

    let lastError: Error | unknown
    let delay = initialDelay

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn()
        } catch (error) {
            lastError = error

            // Don't retry on last attempt
            if (attempt === maxRetries) {
                break
            }

            // Log retry attempt
            console.warn(`[Retry] Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${delay}ms...`, error)

            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay))

            // Increase delay for next attempt (exponential backoff)
            delay = Math.min(delay * backoffMultiplier, maxDelay)
        }
    }

    // All retries failed
    throw lastError
}

/**
 * Circuit breaker state
 */
class CircuitBreaker {
    private failures = 0
    private lastFailureTime = 0
    private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'

    constructor(
        private threshold: number = 5, // Open after 5 failures
        private timeout: number = 60000 // Reset after 1 minute
    ) { }

    async execute<T>(fn: () => Promise<T>): Promise<T> {
        // Check if circuit is open
        if (this.state === 'OPEN') {
            const timeSinceLastFailure = Date.now() - this.lastFailureTime

            if (timeSinceLastFailure < this.timeout) {
                throw new Error('Circuit breaker is OPEN - service unavailable')
            }

            // Try to recover
            this.state = 'HALF_OPEN'
        }

        try {
            const result = await fn()

            // Success - reset circuit
            if (this.state === 'HALF_OPEN') {
                this.state = 'CLOSED'
                this.failures = 0
            }

            return result
        } catch (error) {
            this.failures++
            this.lastFailureTime = Date.now()

            // Open circuit if threshold reached
            if (this.failures >= this.threshold) {
                this.state = 'OPEN'
                console.error(`[Circuit Breaker] OPEN after ${this.failures} failures`)
            }

            throw error
        }
    }

    getState() {
        return {
            state: this.state,
            failures: this.failures,
            lastFailureTime: this.lastFailureTime,
        }
    }
}

// Export singleton circuit breaker for email service
export const emailCircuitBreaker = new CircuitBreaker(5, 60000)
