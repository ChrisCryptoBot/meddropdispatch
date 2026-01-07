import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        <div className="glass-primary p-12 rounded-xl border border-slate-700/50 shadow-lg">
          {/* Icon */}
          <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>

          <h1 className="text-6xl font-bold text-white mb-4 font-data">404</h1>
          <h2 className="text-3xl font-bold text-white mb-4 font-heading">Page Not Found</h2>
          <p className="text-lg text-slate-400 mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="px-6 py-3 rounded-xl bg-slate-700/50 text-slate-200 hover:bg-slate-700 transition-colors font-semibold border border-slate-600/50"
            >
              ← Back to Home
            </Link>
            <Link
              href="/track"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-700 text-white font-semibold hover:shadow-xl hover:shadow-cyan-500/50 transition-all shadow-lg shadow-cyan-500/30"
            >
              Track a Shipment
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
