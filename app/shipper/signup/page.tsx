'use client'

import { useState } from 'react'
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
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

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
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed')
      }

      // Store shipper info and redirect
      localStorage.setItem('shipper', JSON.stringify(data.shipper))
      router.push('/shipper/dashboard')

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-neutral-50 to-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-2">
              MED DROP
            </h1>
          </Link>
          <p className="text-gray-600">Join as Shipper</p>
        </div>

        {/* Signup Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Your Account</h2>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Company Information</h3>
              
              <div>
                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none transition-all"
                  placeholder="Acme Healthcare"
                />
              </div>

              <div>
                <label htmlFor="contactName" className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Name *
                </label>
                <input
                  type="text"
                  id="contactName"
                  name="contactName"
                  value={formData.contactName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none transition-all"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label htmlFor="clientType" className="block text-sm font-medium text-gray-700 mb-2">
                  Business Type *
                </label>
                <select
                  id="clientType"
                  name="clientType"
                  value={formData.clientType}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none transition-all"
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
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Contact Information</h3>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none transition-all"
                  placeholder="contact@company.com"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none transition-all"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            {/* Account Information */}
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Account Information</h3>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none transition-all"
                  placeholder="At least 6 characters"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-slate-600 to-slate-700 text-white py-3 rounded-lg font-semibold hover:from-slate-700 hover:to-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating Account...' : 'Create Shipper Account'}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>
              Already have an account?{' '}
              <Link href="/shipper/login" className="text-slate-600 hover:text-slate-700 font-medium">
                Sign in
              </Link>
            </p>
            <Link href="/" className="text-gray-500 hover:text-gray-700 mt-2 inline-block">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

