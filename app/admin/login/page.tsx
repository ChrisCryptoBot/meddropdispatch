'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || errorData.message || 'Login failed')
      }

      const data = await response.json()

      if (!data.user) {
        throw new Error('Invalid response from server')
      }

      // Authentication cookie is set by backend (httpOnly)
      // Redirect to admin loads page (auth will be verified via cookie in layout)
      window.location.href = '/admin/loads'
    } catch (err) {
      console.error('Login error:', err)
      setError(err instanceof Error ? err.message : 'Login failed')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/10 rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#334155_1px,transparent_1px),linear-gradient(to_bottom,#334155_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-10 pointer-events-none"></div>

      <div className="relative w-full max-w-md">
        <div className="bg-slate-800/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-slate-700/50">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">
              MED DROP
            </h1>
            <p className="text-xs font-medium text-slate-400">Medical Courier Services</p>
            <p className="text-slate-300 mt-2">Admin Portal</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-xl">
              <p className="text-red-300 text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Demo Credentials */}
          <div className="mb-6 bg-purple-900/20 border border-purple-500/30 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-semibold text-purple-300">Demo Account</span>
            </div>
            <div className="text-sm text-slate-300 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-medium">Email:</span>
                <button
                  type="button"
                  onClick={() => setEmail('admin@meddrop.com')}
                  className="font-mono text-purple-400 hover:text-purple-300 hover:underline transition-colors text-xs"
                >
                  admin@meddrop.com
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Password:</span>
                <button
                  type="button"
                  onClick={() => setPassword('admin123')}
                  className="font-mono text-purple-400 hover:text-purple-300 hover:underline transition-colors text-xs"
                >
                  admin123
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setEmail('admin@meddrop.com')
                setPassword('admin123')
              }}
              className="w-full mt-2 px-4 py-2 text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Fill Demo Credentials
            </button>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-600/50 focus:ring-2 focus:ring-purple-500 focus:border-purple-400 bg-slate-700/50 text-white placeholder:text-slate-400 outline-none transition-all"
                placeholder="admin@meddrop.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-300 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-600/50 focus:ring-2 focus:ring-purple-500 focus:border-purple-400 bg-slate-700/50 text-white placeholder:text-slate-400 outline-none transition-all"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold text-lg shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-8 text-center">
            <Link href="/" className="text-sm text-slate-400 hover:text-slate-300 transition-colors">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
