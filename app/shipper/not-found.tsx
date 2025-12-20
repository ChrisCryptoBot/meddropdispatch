import Link from 'next/link'

export default function ShipperNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-medical-bg p-4">
      <div className="glass-primary max-w-md w-full rounded-2xl p-8 text-center border-2 border-blue-200/30 shadow-glass">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h2>
        <p className="text-gray-600 mb-6">
          The page you're looking for doesn't exist in the shipper portal.
        </p>

        <div className="flex gap-3">
          <Link
            href="/shipper/dashboard"
            className="flex-1 px-4 py-2 rounded-lg bg-gradient-primary text-white font-semibold hover:shadow-lg transition-all text-center"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/shipper/loads"
            className="flex-1 px-4 py-2 rounded-lg bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition-colors text-center"
          >
            View Loads
          </Link>
        </div>
      </div>
    </div>
  )
}






