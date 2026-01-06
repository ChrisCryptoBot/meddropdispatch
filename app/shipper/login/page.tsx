'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ShipperLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isDevelopment, setIsDevelopment] = useState(false)

  // Handle email and tracking code from email links
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const emailParam = params.get('email')
      const tracking = params.get('tracking')
      
      if (emailParam) {
        setEmail(decodeURIComponent(emailParam))
      }
      
      // Store tracking code for redirect after login
      if (tracking) {
        sessionStorage.setItem('redirectAfterLogin', `/track/${tracking}`)
      }

      // Check if development environment
      setIsDevelopment(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    }
  }, [])

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
        credentials: 'include', // Include cookies for session management
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

      // Authentication cookie is set by backend (httpOnly)
      // Redirect to tracking page if came from email link, otherwise dashboard
      const redirectPath = sessionStorage.getItem('redirectAfterLogin') || '/shipper/dashboard'
      sessionStorage.removeItem('redirectAfterLogin')
      
      // Redirect (full page reload to ensure layout picks up auth from cookie)
      window.location.href = redirectPath

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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#334155_1px,transparent_1px),linear-gradient(to_bottom,#334155_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-10 pointer-events-none"></div>

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">
              MED DROP
            </h1>
            <p className="text-xs font-medium text-slate-400">Medical Courier Services</p>
          </Link>
          <p className="text-slate-300 mt-2">Shipper Portal Login</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-700/50 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition-all bg-slate-700/50 text-white placeholder:text-slate-400"
                placeholder="your@email.com"
                required
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition-all bg-slate-700/50 text-white placeholder:text-slate-400"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-900/30 border-2 border-red-500/50 text-red-300 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Demo Credentials */}
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-semibold text-blue-300">Demo Account</span>
              </div>
              <div className="text-xs text-slate-300 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Email:</span>
                  <button
                    type="button"
                    onClick={() => setEmail('shipper@test.com')}
                    className="font-mono text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
                  >
                    shipper@test.com
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Password:</span>
                  <button
                    type="button"
                    onClick={() => setPassword('shipper123')}
                    className="font-mono text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
                  >
                    shipper123
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEmail('shipper@test.com')
                  setPassword('shipper123')
                }}
                className="w-full mt-2 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                Fill Demo Credentials
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[44px] bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-lg font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-6 text-center text-sm text-slate-400">
            <p>
              Don't have an account?{' '}
              <Link href="/shipper/signup" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                Sign up as Shipper
              </Link>
            </p>
            <Link href="/" className="text-slate-400 hover:text-slate-300 mt-2 inline-block transition-colors">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

