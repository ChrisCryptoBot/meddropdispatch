import Link from 'next/link'
import Image from 'next/image'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Modern Dark Header */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-xl border-b border-slate-700/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center">
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  MED DROP
                </h1>
                <p className="text-xs font-medium text-slate-400">Medical Courier Services</p>
              </div>
            </div>
            <a
              href="tel:+19039140386"
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors shadow-lg hover:shadow-blue-500/50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span className="hidden sm:inline">(903) 914-0386</span>
              <span className="sm:hidden">Call</span>
            </a>
          </div>
        </div>
      </header>

      <main>
        {/* Premium Dark Hero Section - True Obsidian */}
        <section className="relative bg-slate-950 overflow-hidden">
          {/* Technical Grid Background with Radar Scan Effect */}
          <div className="absolute inset-0 overflow-hidden">
            {/* Sharp technical grid - replaces blobs */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-20"></div>
            
            {/* Radar scan effect - rotating gradient */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(34,211,238,0.1)_50%,transparent_100%)] animate-spin" style={{ animationDuration: '20s' }}></div>
            </div>
            
            {/* Subtle crosshair pattern for precision feel */}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_49%,rgba(34,211,238,0.05)_50%,transparent_51%),linear-gradient(0deg,transparent_49%,rgba(34,211,238,0.05)_50%,transparent_51%)]"></div>
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-32">
            <div className="text-center max-w-4xl mx-auto">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/80 backdrop-blur-sm rounded-full border border-slate-700/50 shadow-lg mb-8">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-green-400/50"></span>
                <span className="text-sm font-medium text-slate-300">24/7 Available • Real-Time Tracking</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white mb-6 leading-tight">
                Medical Courier Operations,
                <span className="block text-4xl sm:text-5xl lg:text-6xl bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mt-2">
                  Simplified
                </span>
              </h1>

              {/* Subheadline */}
              <p className="text-xl sm:text-2xl text-slate-300 mb-4 max-w-2xl mx-auto leading-relaxed">
                Dispatch, tracking, documentation, and compliance tools built for healthcare logistics
              </p>
              <p className="text-base text-slate-400 mb-12 max-w-2xl mx-auto">
                Designed for medical couriers, clinics, labs, and healthcare vendors who need visibility, accountability, and control — not gig apps
              </p>

              {/* Emergency Call CTA */}
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-red-900/30 border-2 border-red-500/30 rounded-xl backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <a href="tel:+19039140386" className="text-red-400 font-bold text-lg hover:text-red-300 transition-colors">
                    (903) 914-0386
                  </a>
                </div>
                <span className="text-slate-500">•</span>
                <span className="text-sm font-medium text-slate-300">24/7 Emergency Service</span>
              </div>
            </div>
          </div>
        </section>

        {/* Compliance & Certifications - True Obsidian */}
        <section className="py-20 bg-slate-900/50 border-y border-slate-800/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
                Trusted & Certified
              </h2>
              <p className="text-xl text-slate-300 max-w-2xl mx-auto">
                Fully compliant with industry standards for medical transportation
              </p>
            </div>

            {/* Certifications Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
              {[
                { name: 'HIPAA Compliant', desc: 'Protected Health Information', icon: 'shield' },
                { name: 'OSHA Trained', desc: 'Safety & Compliance', icon: 'check' },
                { name: 'UN3373 Certified', desc: 'Biohazard Transport', icon: 'warning' },
                { name: 'TSA Verifiable', desc: 'Secure Chain of Custody', icon: 'lock' },
              ].map((cert, index) => (
                <div
                  key={cert.name}
                  className="group relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-8 rounded-2xl border border-slate-700/50 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 transform hover:-translate-y-1 backdrop-blur-sm"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-4 mx-auto shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {cert.icon === 'shield' && (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      )}
                      {cert.icon === 'check' && (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      )}
                      {cert.icon === 'warning' && (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      )}
                      {cert.icon === 'lock' && (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      )}
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1 text-center">{cert.name}</h3>
                  <p className="text-sm text-slate-400 text-center">{cert.desc}</p>
                </div>
              ))}
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-12 border-t border-slate-700/50">
              {[
                { value: '24/7', label: 'Support Available' },
                { value: 'Real-Time', label: 'Tracking Updates' },
                { value: 'Digital', label: 'Signatures' },
                { value: 'Temp', label: 'Monitoring' },
              ].map((feature) => (
                <div key={feature.value} className="text-center">
                  <div className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">
                    {feature.value}
                  </div>
                  <div className="text-base font-medium text-slate-300">{feature.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* User Benefits Section - Dark Theme */}
        <section className="py-24 bg-gradient-to-b from-slate-900 to-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
                Built for Your Needs
              </h2>
              <p className="text-xl text-slate-300 max-w-2xl mx-auto">
                Whether you're shipping medical supplies or delivering them, MED DROP has you covered
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
              {/* Shipper Benefits */}
              <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-10 rounded-2xl border border-slate-700/50 shadow-2xl hover:shadow-blue-500/10 hover:border-blue-500/30 transition-all backdrop-blur-sm">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/30">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">For Shippers</h3>
                    <p className="text-slate-400">Healthcare facilities & laboratories</p>
                  </div>
                </div>
                <ul className="space-y-5">
                  {[
                    { title: 'Request pickups in minutes', desc: 'Streamlined load request form with saved facilities' },
                    { title: 'Real-time tracking & updates', desc: 'Monitor your shipments every step of the way' },
                    { title: 'Digital documentation', desc: 'Receipts, signatures, and certificates automatically stored' },
                    { title: 'Transparent pricing', desc: 'Review quotes and accept when ready' },
                  ].map((item, index) => (
                    <li key={index} className="flex items-start gap-4">
                      <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border border-blue-500/30">
                        <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-white mb-1">{item.title}</div>
                        <div className="text-sm text-slate-400">{item.desc}</div>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <Link
                    href="/shipper/signup"
                    className="inline-flex items-center gap-2 text-blue-400 font-semibold hover:text-blue-300 transition-colors"
                  >
                    Get started as shipper
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                </div>
              </div>

              {/* Driver Benefits */}
              <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-10 rounded-2xl border border-slate-700/50 shadow-2xl hover:shadow-cyan-500/10 hover:border-cyan-500/30 transition-all backdrop-blur-sm">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/30">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">For Drivers</h3>
                    <p className="text-slate-400">Independent couriers & fleet operators</p>
                  </div>
                </div>
                <ul className="space-y-5">
                  {[
                    { title: 'View all available loads', desc: 'Real-time load board with immediate availability' },
                    { title: 'Mobile-optimized interface', desc: 'Capture signatures and update status on the go' },
                    { title: 'Easy documentation upload', desc: 'Upload photos and documents directly from your device' },
                    { title: 'Temperature tracking tools', desc: 'Record and verify temperature compliance at pickup and delivery' },
                  ].map((item, index) => (
                    <li key={index} className="flex items-start gap-4">
                      <div className="w-6 h-6 bg-cyan-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border border-cyan-500/30">
                        <svg className="w-4 h-4 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-white mb-1">{item.title}</div>
                        <div className="text-sm text-slate-400">{item.desc}</div>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <Link
                    href="/driver/signup"
                    className="inline-flex items-center gap-2 text-cyan-400 font-semibold hover:text-cyan-300 transition-colors"
                  >
                    Get started as driver
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Login Section - Dark Theme */}
        <section className="py-16 bg-slate-900 border-t border-slate-700/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-slate-300 mb-6 text-lg">Already have an account?</p>
            <div className="flex flex-wrap gap-4 justify-center items-center">
              <Link
                href="/shipper/login"
                className="text-blue-400 hover:text-blue-300 font-semibold text-lg hover:underline transition-colors"
              >
                Shipper Login
              </Link>
              <span className="text-slate-600">•</span>
              <Link
                href="/driver/login"
                className="text-cyan-400 hover:text-cyan-300 font-semibold text-lg hover:underline transition-colors"
              >
                Driver Login
              </Link>
              <span className="text-slate-600">•</span>
              <Link
                href="/admin/login"
                className="text-purple-400 hover:text-purple-300 font-semibold text-lg hover:underline transition-colors"
              >
                Admin Login
              </Link>
              <span className="text-slate-600">•</span>
              <Link
                href="/track"
                className="text-slate-300 hover:text-white font-semibold text-lg hover:underline transition-colors"
              >
                Track Shipment
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Modern Dark Footer */}
      <footer className="bg-slate-950 text-slate-400 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="mb-4">
                <h4 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">MED DROP</h4>
                <p className="text-xs text-slate-500">Medical Courier Services</p>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Professional medical courier services with real-time tracking and compliance.
              </p>
            </div>
            <div>
              <h5 className="font-bold text-white mb-4">For Shippers</h5>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link href="/shipper/signup" className="hover:text-white transition-colors">
                    Sign Up
                  </Link>
                </li>
                <li>
                  <Link href="/shipper/login" className="hover:text-white transition-colors">
                    Login
                  </Link>
                </li>
                <li>
                  <Link href="/request-load" className="hover:text-white transition-colors">
                    Request a Load
                  </Link>
                </li>
                <li>
                  <Link href="/track" className="hover:text-white transition-colors">
                    Track Shipment
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold text-white mb-4">For Drivers</h5>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link href="/driver/signup" className="hover:text-white transition-colors">
                    Sign Up
                  </Link>
                </li>
                <li>
                  <Link href="/driver/login" className="hover:text-white transition-colors">
                    Login
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold text-white mb-4">Company</h5>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link href="/about" className="hover:text-white transition-colors">
                    About MED DROP
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-white transition-colors">
                    Contact Support
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-white transition-colors">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 text-center text-sm text-slate-500">
            <p>&copy; {new Date().getFullYear()} MED DROP. Professional Medical Courier Services.</p>
            <p className="mt-2">Secure. Compliant. Reliable.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
