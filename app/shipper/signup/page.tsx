'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function ShipperSignupPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    contactName: '',
    phone: '',
    clientType: 'CLINIC',
    subscriptionTier: 'STANDARD',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Handle email and tracking code from email links
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const email = params.get('email')
      const tracking = params.get('tracking')
      
      if (email) {
        setFormData(prev => ({ ...prev, email: decodeURIComponent(email) }))
      }
      
      // Store tracking code for redirect after signup
      if (tracking) {
        sessionStorage.setItem('redirectAfterSignup', `/track/${tracking}`)
      }
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleTierChange = (tier: 'STANDARD' | 'BROKERAGE') => {
    setFormData(prev => ({ ...prev, subscriptionTier: tier }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading) return // Prevent double-click
    setError(null)
    setFieldErrors({})

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/shipper/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          companyName: formData.companyName,
          contactName: formData.contactName,
          phone: formData.phone,
          clientType: formData.clientType,
          subscriptionTier: formData.subscriptionTier,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle field-specific errors
        if (data.errors && Array.isArray(data.errors)) {
          const errorsMap: Record<string, string> = {}
          data.errors.forEach((err: any) => {
            if (err.field && err.message) {
              errorsMap[err.field] = err.message
            }
          })
          setFieldErrors(errorsMap)
        }
        throw new Error(data.error || data.message || 'Signup failed')
      }

      // Store shipper info
      localStorage.setItem('shipper', JSON.stringify(data.shipper))
      
      // Redirect to tracking page if came from email link, otherwise dashboard
      const redirectPath = sessionStorage.getItem('redirectAfterSignup') || '/shipper/dashboard'
      sessionStorage.removeItem('redirectAfterSignup')
      
      // Use window.location for full page reload to ensure layout updates
      window.location.href = redirectPath

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 py-12">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#334155_1px,transparent_1px),linear-gradient(to_bottom,#334155_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-10 pointer-events-none"></div>

      <div className="relative w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">
              MED DROP
            </h1>
            <p className="text-xs font-medium text-slate-400">Medical Courier Services</p>
          </Link>
          <p className="text-slate-300 mt-2">Join as Shipper</p>
        </div>

        {/* Signup Card */}
        <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-700/50 p-8">

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/30 border-2 border-red-500/50 rounded-lg">
              <p className="text-red-300 text-sm font-medium mb-2">{error}</p>
              {Object.keys(fieldErrors).length > 0 && (
                <ul className="list-disc list-inside space-y-1 text-sm text-red-300">
                  {Object.entries(fieldErrors).map(([field, message]) => (
                    <li key={field}>
                      <strong className="capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}:</strong> {message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Service Plan Selection */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Select Your Service Plan</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Standard Plan */}
              <button
                type="button"
                onClick={() => handleTierChange('STANDARD')}
                className={`p-6 rounded-xl border-2 text-left transition-all relative ${
                  formData.subscriptionTier === 'STANDARD'
                    ? 'border-blue-500 bg-blue-900/20 shadow-lg'
                    : 'border-slate-600/50 bg-slate-700/30 hover:border-blue-500/50 hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-lg font-bold text-white mb-1">Standard</h4>
                    <p className="text-sm text-slate-400">Self-Service</p>
                  </div>
                  {formData.subscriptionTier === 'STANDARD' && (
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Access to load board</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Request loads independently</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Pay per load</span>
                  </li>
                </ul>
              </button>

              {/* Brokerage Package */}
              <button
                type="button"
                onClick={() => handleTierChange('BROKERAGE')}
                className={`p-6 rounded-xl border-2 text-left transition-all relative overflow-visible ${
                  formData.subscriptionTier === 'BROKERAGE'
                    ? 'border-cyan-500 bg-cyan-900/20 shadow-lg'
                    : 'border-slate-600/50 bg-slate-700/30 hover:border-cyan-500/50 hover:shadow-md'
                }`}
              >
                {/* Premium Badge integrated into border */}
                <div className="absolute -top-3 right-4 z-10">
                  <span className="px-3 py-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-bold rounded-full shadow-lg border-2 border-slate-800">
                    Premium
                  </span>
                </div>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-lg font-bold text-white mb-1">Brokerage Package</h4>
                    <p className="text-sm text-slate-400">White-Glove Service</p>
                  </div>
                  {formData.subscriptionTier === 'BROKERAGE' && (
                    <div className="w-6 h-6 bg-cyan-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Dedicated dispatcher</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Personalized service</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Consolidated monthly invoicing</span>
                  </li>
                </ul>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white border-b border-slate-700 pb-2">Company Information</h3>
              
              <div>
                <label htmlFor="companyName" className="block text-sm font-medium text-slate-300 mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition-all bg-slate-700/50 text-white placeholder:text-slate-400"
                  placeholder="Acme Healthcare"
                />
              </div>

              <div>
                <label htmlFor="contactName" className="block text-sm font-medium text-slate-300 mb-2">
                  Contact Name *
                </label>
                <input
                  type="text"
                  id="contactName"
                  name="contactName"
                  value={formData.contactName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition-all bg-slate-700/50 text-white placeholder:text-slate-400"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label htmlFor="clientType" className="block text-sm font-medium text-slate-300 mb-2">
                  Business Type *
                </label>
                <select
                  id="clientType"
                  name="clientType"
                  value={formData.clientType}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all bg-slate-800/50 text-slate-200"
                >
                  <option value="CLINIC">Clinic</option>
                  <option value="HOSPITAL">Hospital</option>
                  <option value="LABORATORY">Laboratory</option>
                  <option value="PHARMACY">Pharmacy</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4 pt-4 border-t border-slate-700">
              <h3 className="text-lg font-semibold text-white border-b border-slate-700 pb-2">Contact Information</h3>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition-all bg-slate-700/50 text-white placeholder:text-slate-400"
                  placeholder="contact@company.com"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-slate-300 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition-all bg-slate-700/50 text-white placeholder:text-slate-400"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            {/* Account Information */}
            <div className="space-y-4 pt-4 border-t border-slate-700">
              <h3 className="text-lg font-semibold text-white border-b border-slate-700 pb-2">Account Information</h3>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                  Password *
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition-all bg-slate-700/50 text-white placeholder:text-slate-400"
                  placeholder="At least 6 characters"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition-all bg-slate-700/50 text-white placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-lg font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating Account...' : 'Create Shipper Account'}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-6 text-center text-sm text-slate-400">
            <p>
              Already have an account?{' '}
              <Link href="/shipper/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                Sign in
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

