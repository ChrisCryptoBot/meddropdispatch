'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { showToast } from '@/lib/toast'

type SignupType = 'INDEPENDENT' | 'FLEET_OWNER' | 'JOIN_TEAM' | null

export default function DriverSignupPage() {
  const router = useRouter()
  const [signupType, setSignupType] = useState<SignupType>(null)
  const [inviteCode, setInviteCode] = useState('')
  const [validatingInvite, setValidatingInvite] = useState(false)
  const [inviteData, setInviteData] = useState<{ fleetName: string; role: string } | null>(null)

  // Check for invite code in URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const invite = params.get('invite')
    if (invite) {
      setInviteCode(invite.toUpperCase())
      setSignupType('JOIN_TEAM')
      handleValidateInviteFromURL(invite.toUpperCase())
    }
  }, [])

  const handleValidateInviteFromURL = async (code: string) => {
    setValidatingInvite(true)
    try {
      const response = await fetch(`/api/fleets/invites/${code}`)
      const data = await response.json()
      if (response.ok && data.valid) {
        setInviteData({
          fleetName: data.fleet.name,
          role: data.role,
        })
      }
    } catch (error) {
      // Silently fail - user can still enter code manually
    } finally {
      setValidatingInvite(false)
    }
  }
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    licenseNumber: '',
    vehicleType: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: '',
    vehiclePlate: '',
    hasRefrigeration: false,
    // Fleet Owner fields
    fleetName: '',
    fleetTaxId: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const handleValidateInvite = async () => {
    if (!inviteCode.trim()) {
      setError('Please enter an invite code')
      return
    }

    setValidatingInvite(true)
    setError(null)

    try {
      const response = await fetch(`/api/fleets/invites/${inviteCode.trim()}`)
      const data = await response.json()

      if (!response.ok || !data.valid) {
        throw new Error(data.error || 'Invalid invite code')
      }

      setInviteData({
        fleetName: data.fleet.name,
        role: data.role,
      })
      showToast.success(`Valid invite! You'll join ${data.fleet.name} as a ${data.role}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate invite code')
    } finally {
      setValidatingInvite(false)
    }
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

    if (signupType === 'FLEET_OWNER' && !formData.fleetName.trim()) {
      setError('Fleet name is required')
      return
    }

    if (signupType === 'JOIN_TEAM' && !inviteCode.trim()) {
      setError('Invite code is required')
      return
    }

    // Vehicle info is optional for Fleet Owner (they add vehicles later)
    // But required for Independent and Join Team
    if (signupType !== 'FLEET_OWNER') {
      // Vehicle info validation can be added here if needed
      // For now, vehicle fields are optional in backend
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/driver/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          licenseNumber: formData.licenseNumber || undefined,
          vehicleType: formData.vehicleType || undefined,
          vehicleMake: formData.vehicleMake || undefined,
          vehicleModel: formData.vehicleModel || undefined,
          vehicleYear: formData.vehicleYear || undefined,
          vehiclePlate: formData.vehiclePlate || undefined,
          hasRefrigeration: formData.hasRefrigeration,
          // Fleet Protocol fields
          signupType,
          fleetName: signupType === 'FLEET_OWNER' ? formData.fleetName : undefined,
          fleetTaxId: signupType === 'FLEET_OWNER' ? formData.fleetTaxId || undefined : undefined,
          inviteCode: signupType === 'JOIN_TEAM' ? inviteCode.trim() : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed')
      }

      // Store driver info
      localStorage.setItem('driver', JSON.stringify(data.driver))
      // Redirect to pending approval page
      window.location.href = '/driver/pending-approval'

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account')
      setIsLoading(false)
    }
  }

  // Step 1: Choose signup type
  if (!signupType) {
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
            <p className="text-slate-300 mt-2">Join as Driver</p>
          </div>

          {/* Signup Type Selection Card */}
          <div className="glass-primary rounded-2xl border border-slate-700/50 shadow-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-2 text-center">How are you joining?</h2>
            <p className="text-slate-400 text-center mb-8">Choose the option that best describes you</p>

            <div className="grid md:grid-cols-3 gap-4">
              {/* Independent Driver */}
              <button
                onClick={() => setSignupType('INDEPENDENT')}
                className="p-6 rounded-xl border-2 border-slate-700/50 hover:border-cyan-500/50 bg-slate-800/50 hover:bg-slate-800/70 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center mb-4 group-hover:bg-cyan-500/30 transition-colors">
                  <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Independent Driver</h3>
                <p className="text-sm text-slate-400">I'm a solo owner-operator working independently</p>
              </button>

              {/* Fleet Owner */}
              <button
                onClick={() => setSignupType('FLEET_OWNER')}
                className="p-6 rounded-xl border-2 border-slate-700/50 hover:border-cyan-500/50 bg-slate-800/50 hover:bg-slate-800/70 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center mb-4 group-hover:bg-cyan-500/30 transition-colors">
                  <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Fleet Owner</h3>
                <p className="text-sm text-slate-400">I own a fleet and want to manage a team</p>
              </button>

              {/* Join Team */}
              <button
                onClick={() => setSignupType('JOIN_TEAM')}
                className="p-6 rounded-xl border-2 border-slate-700/50 hover:border-cyan-500/50 bg-slate-800/50 hover:bg-slate-800/70 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center mb-4 group-hover:bg-cyan-500/30 transition-colors">
                  <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Join a Team</h3>
                <p className="text-sm text-slate-400">I have an invite code to join an existing fleet</p>
              </button>
            </div>

            {/* Footer Links */}
            <div className="mt-8 text-center text-sm text-slate-400">
              <p>
                Already have an account?{' '}
                <Link href="/driver/login" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
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

  // Step 2: Invite code validation (for JOIN_TEAM)
  if (signupType === 'JOIN_TEAM' && !inviteData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 py-12">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#334155_1px,transparent_1px),linear-gradient(to_bottom,#334155_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-10 pointer-events-none"></div>

        <div className="relative w-full max-w-md">
          <div className="glass-primary rounded-2xl border border-slate-700/50 shadow-xl p-8">
            <button
              onClick={() => {
                setSignupType(null)
                setInviteCode('')
                setInviteData(null)
                setError(null)
              }}
              className="mb-4 text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <h2 className="text-2xl font-bold text-white mb-2">Enter Invite Code</h2>
            <p className="text-slate-400 mb-6">Enter the invite code provided by your fleet owner</p>

            {error && (
              <div className="mb-6 p-4 bg-red-900/30 border-2 border-red-500/50 rounded-lg">
                <p className="text-red-300 text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="inviteCode" className="block text-sm font-medium text-slate-300 mb-2">
                  Invite Code *
                </label>
                <input
                  type="text"
                  id="inviteCode"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="ABC12345"
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all bg-slate-800/50 text-white placeholder:text-slate-500 uppercase"
                  maxLength={8}
                />
              </div>

              <button
                onClick={handleValidateInvite}
                disabled={validatingInvite || !inviteCode.trim()}
                className="w-full bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-white py-3 rounded-lg font-semibold shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {validatingInvite ? 'Validating...' : 'Validate Code'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Step 3: Main signup form (all types)
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
          <p className="text-slate-300 mt-2">
            {signupType === 'INDEPENDENT' && 'Join as Independent Driver'}
            {signupType === 'FLEET_OWNER' && 'Create Fleet Account'}
            {signupType === 'JOIN_TEAM' && `Join ${inviteData?.fleetName || 'Team'}`}
          </p>
        </div>

        {/* Signup Card */}
        <div className="glass-primary rounded-2xl border border-slate-700/50 shadow-xl p-8">
          <button
            onClick={() => {
              setSignupType(null)
              setInviteCode('')
              setInviteData(null)
              setError(null)
            }}
            className="mb-4 text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Change signup type
          </button>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/30 border-2 border-red-500/50 rounded-lg">
              <p className="text-red-300 text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Invite Info (for JOIN_TEAM) */}
          {signupType === 'JOIN_TEAM' && inviteData && (
            <div className="mb-6 p-4 bg-cyan-500/20 border-2 border-cyan-500/30 rounded-lg">
              <p className="text-cyan-300 text-sm font-medium">
                You'll join <strong className="text-white">{inviteData.fleetName}</strong> as a <strong className="text-white">{inviteData.role}</strong>
              </p>
            </div>
          )}

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Fleet Information (for FLEET_OWNER) */}
            {signupType === 'FLEET_OWNER' && (
              <div className="space-y-4 pb-4 border-b border-slate-700">
                <h3 className="text-lg font-semibold text-white border-b border-slate-700 pb-2">Fleet Information</h3>
                
                <div>
                  <label htmlFor="fleetName" className="block text-sm font-medium text-slate-300 mb-2">
                    Fleet Name (DBA) *
                  </label>
                  <input
                    type="text"
                    id="fleetName"
                    name="fleetName"
                    value={formData.fleetName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all bg-slate-800/50 text-white placeholder:text-slate-500"
                    placeholder="FastMed Logistics"
                  />
                </div>

                <div>
                  <label htmlFor="fleetTaxId" className="block text-sm font-medium text-slate-300 mb-2">
                    Tax ID (EIN) <span className="text-slate-500 text-xs">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    id="fleetTaxId"
                    name="fleetTaxId"
                    value={formData.fleetTaxId}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all bg-slate-800/50 text-white placeholder:text-slate-500"
                    placeholder="12-3456789"
                  />
                </div>
              </div>
            )}

            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white border-b border-slate-700 pb-2">Personal Information</h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-slate-300 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all bg-slate-800/50 text-white placeholder:text-slate-500"
                  />
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-slate-300 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all bg-slate-800/50 text-white placeholder:text-slate-500"
                  />
                </div>
              </div>

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
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all bg-slate-800/50 text-white placeholder:text-slate-500"
                  placeholder="driver@example.com"
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
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all bg-slate-800/50 text-white placeholder:text-slate-500"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label htmlFor="licenseNumber" className="block text-sm font-medium text-slate-300 mb-2">
                  Driver's License Number
                </label>
                <input
                  type="text"
                  id="licenseNumber"
                  name="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all bg-slate-800/50 text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* Vehicle Information - Hidden for Fleet Owner */}
            {signupType !== 'FLEET_OWNER' && (
            <div className="space-y-4 pt-4 border-t border-slate-700">
              <h3 className="text-lg font-semibold text-white border-b border-slate-700 pb-2">Vehicle Information</h3>
              
              <div>
                <label htmlFor="vehicleType" className="block text-sm font-medium text-slate-300 mb-2">
                  Vehicle Type
                </label>
                <select
                  id="vehicleType"
                  name="vehicleType"
                  value={formData.vehicleType}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all bg-slate-800/50 text-slate-200"
                >
                  <option value="">Select vehicle type</option>
                  <option value="SEDAN">Sedan</option>
                  <option value="SUV">SUV</option>
                  <option value="VAN">Van</option>
                  <option value="SPRINTER">Sprinter</option>
                  <option value="BOX_TRUCK">Box Truck</option>
                  <option value="REFRIGERATED">Refrigerated</option>
                </select>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="vehicleMake" className="block text-sm font-medium text-slate-300 mb-2">
                    Make
                  </label>
                  <input
                    type="text"
                    id="vehicleMake"
                    name="vehicleMake"
                    value={formData.vehicleMake}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all bg-slate-800/50 text-white placeholder:text-slate-500"
                    placeholder="Toyota"
                  />
                </div>

                <div>
                  <label htmlFor="vehicleModel" className="block text-sm font-medium text-slate-300 mb-2">
                    Model
                  </label>
                  <input
                    type="text"
                    id="vehicleModel"
                    name="vehicleModel"
                    value={formData.vehicleModel}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all bg-slate-800/50 text-white placeholder:text-slate-500"
                    placeholder="Sienna"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="vehicleYear" className="block text-sm font-medium text-slate-300 mb-2">
                    Year
                  </label>
                  <input
                    type="number"
                    id="vehicleYear"
                    name="vehicleYear"
                    value={formData.vehicleYear}
                    onChange={handleChange}
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all bg-slate-800/50 text-white placeholder:text-slate-500"
                    placeholder="2020"
                  />
                </div>

                <div>
                  <label htmlFor="vehiclePlate" className="block text-sm font-medium text-slate-300 mb-2">
                    License Plate
                  </label>
                  <input
                    type="text"
                    id="vehiclePlate"
                    name="vehiclePlate"
                    value={formData.vehiclePlate}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all bg-slate-800/50 text-white placeholder:text-slate-500"
                    placeholder="ABC-1234"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="hasRefrigeration"
                  name="hasRefrigeration"
                  checked={formData.hasRefrigeration}
                  onChange={handleChange}
                  className="w-4 h-4 text-cyan-600 border-slate-600 rounded focus:ring-cyan-500 bg-slate-700"
                />
                <label htmlFor="hasRefrigeration" className="ml-2 text-sm text-slate-300">
                  My vehicle has refrigeration capabilities
                </label>
              </div>
            </div>
            )}

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
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all bg-slate-800/50 text-white placeholder:text-slate-500"
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
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all bg-slate-800/50 text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-white py-3 rounded-lg font-semibold shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating Account...' : 'Create Driver Account'}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-6 text-center text-sm text-slate-400">
            <p>
              Already have an account?{' '}
              <Link href="/driver/login" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
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
