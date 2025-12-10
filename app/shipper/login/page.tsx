'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ShipperLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const loginPayload = { email, password }
      console.log('Attempting login with:', { email, passwordLength: password.length })
      
      const response = await fetch('/api/auth/shipper/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginPayload),
      })

      let data
      try {
        data = await response.json()
      } catch (parseError) {
        console.error('Failed to parse response:', parseError)
        setError('Invalid response from server')
        setIsLoading(false)
        return
      }

      if (!response.ok) {
        console.error('Login API error:', {
          status: response.status,
          statusText: response.statusText,
          data: data,
          fullResponse: data,
          errorMessage: data?.error,
          errorDetails: JSON.stringify(data, null, 2)
        })
        // Expand the error object so we can see what's inside
        console.error('Error data expanded:', data)
        setError(data.error || data.message || `Login failed (${response.status})`)
        setIsLoading(false)
        return
      }

      if (!data.shipper) {
        console.error('No shipper data in response:', data)
        setError('Invalid response from server')
        setIsLoading(false)
        return
      }

      // Store shipper data in localStorage (temporary - should use httpOnly cookies)
      localStorage.setItem('shipper', JSON.stringify(data.shipper))

      // Redirect to shipper dashboard (full page reload to ensure layout picks up auth)
      window.location.href = '/shipper/dashboard'

    } catch (error) {
      console.error('Login network error:', error)
      console.error('Error details:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      setError('An unexpected error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-neutral-50 to-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-2">
              MED DROP
            </h1>
          </Link>
          <p className="text-gray-600">Shipper Portal Login</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="your@email.com"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-slate-600 to-slate-700 text-white py-3 rounded-lg font-semibold hover:from-slate-700 hover:to-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>
              Don't have an account?{' '}
              <Link href="/shipper/signup" className="text-slate-600 hover:text-slate-700 font-medium">
                Sign up as Shipper
              </Link>
            </p>
            <Link href="/" className="text-gray-500 hover:text-gray-700 mt-2 inline-block">
              ← Back to Home
            </Link>
          </div>
        </div>

        {/* Test Credentials */}
        <div className="mt-6 bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm">
          <p className="font-semibold text-slate-900 mb-2">Test Credentials:</p>
          <div className="text-slate-800 space-y-1">
            <p>Email: <code className="bg-slate-100 px-2 py-0.5 rounded">acme@healthcare.com</code></p>
            <p>Password: <code className="bg-slate-100 px-2 py-0.5 rounded">password123</code></p>
          </div>
        </div>
      </div>
    </div>
  )
}
