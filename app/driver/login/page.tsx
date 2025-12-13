'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function DriverLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('')
  const [isSendingReset, setIsSendingReset] = useState(false)
  const [resetMessage, setResetMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/driver/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
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
          errorMessage: data?.error || data?.message,
          errorDetails: JSON.stringify(data, null, 2)
        })
        setError(data?.error || data?.message || `Login failed (${response.status})`)
        setIsLoading(false)
        return
      }

      if (!data.driver) {
        console.error('No driver data in response:', data)
        setError('Invalid response from server')
        setIsLoading(false)
        return
      }

      // Store driver info in localStorage (in production, use httpOnly cookies/sessions)
      localStorage.setItem('driver', JSON.stringify(data.driver))

      router.push('/driver/dashboard')
    } catch (err) {
      console.error('Login error:', err)
      setError(err instanceof Error ? err.message : 'Login failed')
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSendingReset(true)
    setResetMessage(null)
    setError(null)

    try {
      const response = await fetch('/api/auth/driver/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotPasswordEmail }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Failed to send password reset email')
        setIsSendingReset(false)
        return
      }

      setResetMessage('If an account exists with that email, a password reset email has been sent.')
      setForgotPasswordEmail('')
      setTimeout(() => {
        setShowForgotPassword(false)
        setResetMessage(null)
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send password reset email')
    } finally {
      setIsSendingReset(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-medical-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="glass-accent p-8 rounded-3xl border-2 border-teal-200/30 shadow-medical">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 flex items-center justify-center mx-auto mb-4">
              <Image
                src="/logo-icon.png"
                alt="MED DROP Logo"
                width={80}
                height={80}
                className="object-contain"
                priority
              />
            </div>
            <h1 className="text-3xl font-bold text-gradient mb-2">MED DROP</h1>
            <p className="text-teal-700">Driver Portal</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-urgent-50 border-2 border-urgent-200 rounded-xl">
              <p className="text-urgent-700 text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-400 bg-white/80 text-lg"
                placeholder="driver@meddrop.com"
                autoComplete="email"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                Password
              </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-teal-600 hover:text-teal-800 font-medium"
                >
                  Forgot Password?
                </button>
              </div>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-400 bg-white/80 text-lg"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-6 py-4 rounded-xl bg-gradient-accent text-white font-bold text-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-base shadow-lg"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-8 text-center space-y-2">
            <p className="text-sm text-teal-700">
              Don't have an account?{' '}
              <Link href="/driver/signup" className="text-teal-600 hover:text-teal-900 font-medium">
                Sign up as Driver
              </Link>
            </p>
            <Link href="/" className="text-sm text-gray-600 hover:text-teal-700 transition-base inline-block">
              ← Back to Home
            </Link>
          </div>
        </div>

        {/* Forgot Password Modal */}
        {showForgotPassword && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="glass-accent p-8 rounded-3xl max-w-md w-full border-2 border-teal-200/30 shadow-medical">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Forgot Password</h2>
                <button
                  onClick={() => {
                    setShowForgotPassword(false)
                    setForgotPasswordEmail('')
                    setResetMessage(null)
                    setError(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {resetMessage ? (
                <div className="mb-6 p-4 bg-success-50 border-2 border-success-200 rounded-xl">
                  <p className="text-success-700 text-sm font-medium">{resetMessage}</p>
                </div>
              ) : (
                <>
                  <p className="text-gray-600 mb-6">
                    Enter your email address and we'll send you your username and a temporary password.
                  </p>

                  {error && (
                    <div className="mb-6 p-4 bg-urgent-50 border-2 border-urgent-200 rounded-xl">
                      <p className="text-urgent-700 text-sm font-medium">{error}</p>
                    </div>
                  )}

                  <form onSubmit={handleForgotPassword} className="space-y-6">
                    <div>
                      <label htmlFor="forgot-email" className="block text-sm font-semibold text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        id="forgot-email"
                        value={forgotPasswordEmail}
                        onChange={(e) => setForgotPasswordEmail(e.target.value)}
                        required
                        className="w-full px-4 py-3 rounded-xl border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-400 bg-white/80 text-lg"
                        placeholder="driver@meddrop.com"
                        autoComplete="email"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSendingReset}
                      className="w-full px-6 py-4 rounded-xl bg-gradient-accent text-white font-bold text-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-base shadow-lg"
                    >
                      {isSendingReset ? 'Sending...' : 'Send Password Reset'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        )}

        {/* Test Credentials */}
        <div className="mt-6 glass-accent border-2 border-teal-200/30 rounded-lg p-4 text-sm">
          <p className="font-semibold text-gray-900 mb-2">Test Credentials:</p>
          <div className="text-gray-800 space-y-1">
            <p>Email: <code className="bg-teal-50 px-2 py-0.5 rounded border border-teal-200">driver@test.com</code></p>
            <p>Password: <code className="bg-teal-50 px-2 py-0.5 rounded border border-teal-200">driver123</code></p>
          </div>
        </div>
      </div>
    </div>
  )
}
