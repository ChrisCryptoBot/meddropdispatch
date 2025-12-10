import Link from 'next/link'
import Image from 'next/image'

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass sticky top-0 z-50 border-b border-white/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 flex items-center justify-center">
                <Image
                  src="/logo-icon.png"
                  alt="MED DROP Logo"
                  width={40}
                  height={40}
                  className="object-contain"
                  priority
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gradient">MED DROP</h1>
                <p className="text-xs text-gray-600">Medical Courier Services</p>
              </div>
            </div>
            <nav className="hidden md:flex items-center space-x-4">
              <Link
                href="/shipper/login"
                className="glass px-4 py-2 rounded-lg text-primary-700 hover:bg-white/60 transition-base font-medium"
              >
                Shipper Login
              </Link>
              <Link
                href="/driver/login"
                className="glass px-4 py-2 rounded-lg text-primary-700 hover:bg-white/60 transition-base font-medium"
              >
                Driver Login
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 bg-clip-text text-transparent">
            Professional Medical<br />Courier Services
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-12">
            Secure, reliable transportation for medical specimens, pharmaceuticals, and healthcare supplies.
          </p>
          
          {/* Primary CTAs */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-8">
            <Link
              href="/shipper/signup"
              className="glass px-10 py-6 rounded-2xl text-xl font-bold text-slate-700 hover:bg-white/70 hover-lift inline-flex flex-col items-center justify-center shadow-lg transition-all transform hover:scale-105"
            >
              <svg className="w-12 h-12 mb-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span>Join as Shipper</span>
              <span className="text-sm font-normal text-gray-600 mt-1">Request pickups & track shipments</span>
            </Link>
            <Link
              href="/driver/signup"
              className="glass px-10 py-6 rounded-2xl text-xl font-bold text-slate-700 hover:bg-white/70 hover-lift inline-flex flex-col items-center justify-center shadow-lg transition-all transform hover:scale-105"
            >
              <svg className="w-12 h-12 mb-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Join as Driver</span>
              <span className="text-sm font-normal text-gray-600 mt-1">View loads & manage deliveries</span>
            </Link>
          </div>

          {/* Login Links */}
          <div className="text-center">
            <p className="text-gray-600 mb-3">Already have an account?</p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/shipper/login"
                className="text-slate-600 hover:text-slate-700 font-medium underline"
              >
                Shipper Login
              </Link>
              <span className="text-gray-400">•</span>
              <Link
                href="/driver/login"
                className="text-slate-600 hover:text-slate-700 font-medium underline"
              >
                Driver Login
              </Link>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          {/* Feature 1 */}
          <div className="glass p-8 rounded-2xl hover-lift">
            <div className="w-12 h-12 bg-gradient-to-br from-slate-500 to-slate-700 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2 text-gray-800">STAT & Same-Day</h3>
            <p className="text-gray-600">
              Urgent medical courier services with immediate pickup and same-day delivery options.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="glass p-8 rounded-2xl hover-lift">
            <div className="w-12 h-12 bg-gradient-to-br from-slate-500 to-slate-700 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2 text-gray-800">Compliant Handling</h3>
            <p className="text-gray-600">
              UN3373 certified handling for biological specimens and temperature-controlled transport.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="glass p-8 rounded-2xl hover-lift">
            <div className="w-12 h-12 bg-gradient-to-br from-slate-500 to-slate-700 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2 text-gray-800">Real-Time Tracking</h3>
            <p className="text-gray-600">
              Track your shipment status with detailed checkpoint updates throughout the delivery.
            </p>
          </div>
        </div>

        {/* Services Section */}
        <div className="mt-20 glass p-10 rounded-2xl">
          <h3 className="text-3xl font-bold mb-8 text-center text-gray-800">What We Transport</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">Laboratory Specimens</h4>
                <p className="text-gray-600 text-sm">UN3373 Category B biological substances</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">Pharmaceuticals</h4>
                <p className="text-gray-600 text-sm">Prescription medications and supplies</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">Medical Equipment</h4>
                <p className="text-gray-600 text-sm">Supplies and equipment for healthcare facilities</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">Temperature-Controlled</h4>
                <p className="text-gray-600 text-sm">Refrigerated and frozen transport available</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="glass mt-20 border-t border-white/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600 text-sm">
            <p>&copy; {new Date().getFullYear()} MED DROP. Professional Medical Courier Services.</p>
            <p className="mt-2">Secure. Compliant. Reliable.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
