import Link from 'next/link'
import Image from 'next/image'

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass-primary sticky top-0 z-50 border-b border-blue-200/30 flex-shrink-0">
        <div className="w-full py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 pl-4 md:pl-4">
              <div className="w-16 h-16 flex items-center justify-center">
                <Image
                  src="/logo-icon.png"
                  alt="MED DROP Logo"
                  width={64}
                  height={64}
                  className="object-contain"
                  priority
                />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gradient">MED DROP</h1>
                <p className="text-sm font-semibold text-red-600">Medical Courier Services</p>
              </div>
            </div>
            <div className="pr-4 md:pr-8">
              <a
                href="tel:+19039140386"
                className="flex items-center gap-2 px-4 py-2 bg-gradient-primary text-white rounded-lg font-semibold hover:shadow-lg transition-all shadow-lg hover:scale-105"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="hidden sm:inline">(903) 914-0386</span>
                <span className="sm:hidden">Call</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <section className="relative overflow-hidden">
          {/* Background Image */}
          <div 
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: 'url(/Background.jpg)',
            }}
          >
            {/* Overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/85 via-white/75 to-white/90"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-50/30 via-transparent to-teal-50/30"></div>
          </div>
          
          {/* Content */}
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
            <div className="text-center mb-16">
              <h2 className="heading-primary text-5xl md:text-6xl lg:text-7xl mb-6 leading-tight">
                Medical Courier Services<br />
                <span className="text-4xl md:text-5xl lg:text-6xl">Done Right</span>
              </h2>
              <p className="text-xl md:text-2xl text-medical max-w-3xl mx-auto mb-4">
                Secure, compliant transportation for medical specimens, pharmaceuticals, and healthcare supplies
              </p>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
                Real-time tracking • Digital signatures • Temperature monitoring • UN3373 certified
              </p>
              
              {/* Emergency Call CTA */}
              <div className="mb-12">
                <a
                  href="tel:+19039140386"
                  className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-urgent text-white rounded-xl font-bold text-xl hover:shadow-urgent transition-all transform hover:scale-105 shadow-lg animate-pulse"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>Call Now: (903) 914-0386</span>
                  <span className="text-sm font-normal opacity-90">24/7 Available</span>
                </a>
              </div>
              
              {/* Primary CTAs */}
              <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
                <Link
                  href="/shipper/signup"
                  className="group glass-primary px-12 py-6 rounded-2xl text-xl font-bold text-blue-900 hover:bg-blue-50/80 hover-lift inline-flex flex-col items-center justify-center shadow-glass transition-all transform hover:scale-105 border-2 border-blue-200/50 hover:border-blue-300"
                >
                  <div className="w-16 h-16 bg-gradient-primary rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <span className="mb-2">Join as Shipper</span>
                  <span className="text-sm font-normal text-blue-700">Request pickups & track shipments</span>
                </Link>
                <Link
                  href="/driver/signup"
                  className="group glass-accent px-12 py-6 rounded-2xl text-xl font-bold text-teal-900 hover:bg-teal-50/80 hover-lift inline-flex flex-col items-center justify-center shadow-medical transition-all transform hover:scale-105 border-2 border-teal-200/50 hover:border-teal-300"
                >
                  <div className="w-16 h-16 bg-gradient-accent rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <span className="mb-2">Join as Driver</span>
                  <span className="text-sm font-normal text-teal-700">View loads & manage deliveries</span>
                </Link>
              </div>

              {/* Login Links */}
              <div className="text-center">
                <p className="text-gray-600 mb-3">Already have an account?</p>
                <div className="flex gap-4 justify-center">
                  <Link
                    href="/shipper/login"
                    className="text-blue-600 hover:text-blue-800 font-semibold underline decoration-2 underline-offset-4 transition-colors"
                  >
                    Shipper Login
                  </Link>
                  <span className="text-gray-400">•</span>
                  <Link
                    href="/driver/login"
                    className="text-teal-600 hover:text-teal-800 font-semibold underline decoration-2 underline-offset-4 transition-colors"
                  >
                    Driver Login
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 glass-primary border-y border-blue-200/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-gradient mb-2">24/7</div>
                <div className="text-sm md:text-base text-medical font-medium">Support Available</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-gradient mb-2">Real-Time</div>
                <div className="text-sm md:text-base text-medical font-medium">Tracking Updates</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-gradient mb-2">UN3373</div>
                <div className="text-sm md:text-base text-medical font-medium">Certified</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-gradient mb-2">HIPAA</div>
                <div className="text-sm md:text-base text-medical font-medium">Compliant</div>
              </div>
            </div>
          </div>
        </section>

        {/* User Type Benefits & Key Features - Combined with Background */}
        <section className="relative overflow-hidden">
          {/* Background Image */}
          <div 
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: 'url(/Background2.jpg)',
            }}
          >
            {/* Overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/85 via-white/75 to-white/90"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-50/30 via-transparent to-teal-50/30"></div>
          </div>
          
          {/* Content */}
          <div className="relative z-10">
            <div className="py-20 lg:py-28 pb-20 lg:pb-32">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h3 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Built for Your Needs
              </h3>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Whether you're shipping medical supplies or delivering them, MED DROP has you covered
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 lg:gap-12 mb-16">
              {/* Shipper Benefits */}
              <div className="glass-primary p-10 rounded-3xl hover-lift medical-accent">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-gradient-primary rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold text-gray-900">For Shippers</h4>
                    <p className="text-medical">Healthcare facilities & laboratories</p>
                  </div>
                </div>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-success-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-success-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Request pickups in minutes</div>
                      <div className="text-sm text-gray-600">Streamlined load request form with saved facilities</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-success-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-success-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Real-time tracking & updates</div>
                      <div className="text-sm text-gray-600">Monitor your shipments every step of the way</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-success-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-success-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Digital documentation</div>
                      <div className="text-sm text-gray-600">Receipts, signatures, and certificates automatically stored</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-success-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-success-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Transparent pricing</div>
                      <div className="text-sm text-gray-600">Review quotes and accept when ready</div>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Driver Benefits */}
              <div className="glass-accent p-10 rounded-3xl hover-lift medical-accent">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-gradient-accent rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold text-gray-900">For Drivers</h4>
                    <p className="text-teal-700">Independent couriers & fleet operators</p>
                  </div>
                </div>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-accent-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-accent-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">View all available loads</div>
                      <div className="text-sm text-gray-600">Real-time load board with immediate availability</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-accent-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-accent-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Mobile-optimized interface</div>
                      <div className="text-sm text-gray-600">Capture signatures and update status on the go</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-accent-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-accent-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Easy documentation upload</div>
                      <div className="text-sm text-gray-600">Upload photos and documents directly from your device</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-accent-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-accent-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Temperature tracking tools</div>
                      <div className="text-sm text-gray-600">Record and verify temperature compliance at pickup and delivery</div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
              </div>
            </div>
          </div>
        </section>

        {/* Key Features */}
        <section className="py-20 glass-primary border-y border-blue-200/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h3 className="heading-secondary text-4xl md:text-5xl mb-4">
                Why Choose MED DROP
              </h3>
              <p className="text-xl text-medical max-w-2xl mx-auto">
                Professional medical courier services with the technology and compliance you need
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Feature 1 - STAT */}
              <div className="glass-urgent p-8 rounded-2xl hover-lift text-center border-2 border-red-200/30">
                <div className="w-16 h-16 bg-gradient-urgent rounded-xl flex items-center justify-center mx-auto mb-6 shadow-urgent">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold mb-3 text-gray-900">STAT & Same-Day</h4>
                <p className="text-gray-600 leading-relaxed">
                  Urgent medical courier services with immediate pickup and same-day delivery options for critical healthcare needs.
                </p>
              </div>

              {/* Feature 2 - Compliance */}
              <div className="glass-accent p-8 rounded-2xl hover-lift text-center border-2 border-teal-200/30">
                <div className="w-16 h-16 bg-gradient-accent rounded-xl flex items-center justify-center mx-auto mb-6 shadow-medical">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold mb-3 text-gray-900">Compliant Handling</h4>
                <p className="text-gray-600 leading-relaxed">
                  UN3373 certified handling for biological specimens and temperature-controlled transport with full documentation.
                </p>
              </div>

              {/* Feature 3 - Tracking */}
              <div className="glass-primary p-8 rounded-2xl hover-lift text-center border-2 border-blue-200/30">
                <div className="w-16 h-16 bg-gradient-primary rounded-xl flex items-center justify-center mx-auto mb-6 shadow-glass">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold mb-3 text-gray-900">Real-Time Tracking</h4>
                <p className="text-gray-600 leading-relaxed">
                  Track your shipment status with detailed checkpoint updates and digital signature confirmations throughout delivery.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="glass-accent p-12 rounded-3xl border-2 border-teal-200/30">
              <h3 className="heading-secondary text-3xl md:text-4xl mb-10 text-center">What We Transport</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="flex flex-col items-start">
                  <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center mb-3 shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">Laboratory Specimens</h4>
                  <p className="text-sm text-gray-600">UN3373 Category B biological substances</p>
                </div>
                <div className="flex flex-col items-start">
                  <div className="w-10 h-10 bg-gradient-accent rounded-lg flex items-center justify-center mb-3 shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">Pharmaceuticals</h4>
                  <p className="text-sm text-gray-600">Prescription medications and supplies</p>
                </div>
                <div className="flex flex-col items-start">
                  <div className="w-10 h-10 bg-gradient-success rounded-lg flex items-center justify-center mb-3 shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">Medical Equipment</h4>
                  <p className="text-sm text-gray-600">Supplies and equipment for healthcare facilities</p>
                </div>
                <div className="flex flex-col items-start">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-teal-500 rounded-lg flex items-center justify-center mb-3 shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">Temperature-Controlled</h4>
                  <p className="text-sm text-gray-600">Refrigerated and frozen transport available</p>
                </div>
              </div>
            </div>
          </div>
        </section>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="glass-primary border-t border-blue-200/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-20 h-20 flex items-center justify-center">
                  <Image
                    src="/logo-icon.png"
                    alt="MED DROP Logo"
                    width={80}
                    height={80}
                    className="object-contain"
                  />
                </div>
                <div>
                  <h4 className="text-3xl font-bold text-gradient">MED DROP</h4>
                  <p className="text-sm font-semibold text-red-600 mt-1">Medical Courier Services</p>
                </div>
              </div>
              <p className="text-sm text-medical">
                Professional medical courier services with real-time tracking and compliance.
              </p>
            </div>
            <div>
              <h5 className="font-bold text-gray-900 mb-4">For Shippers</h5>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/shipper/signup" className="text-medical hover:text-blue-800 transition-colors">
                    Sign Up
                  </Link>
                </li>
                <li>
                  <Link href="/shipper/login" className="text-medical hover:text-blue-800 transition-colors">
                    Login
                  </Link>
                </li>
                <li>
                  <Link href="/request-load" className="text-medical hover:text-blue-800 transition-colors">
                    Request a Load
                  </Link>
                </li>
                <li>
                  <Link href="/track" className="text-medical hover:text-blue-800 transition-colors">
                    Track Shipment
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold text-gray-900 mb-4">For Drivers</h5>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/driver/signup" className="text-teal-700 hover:text-teal-900 transition-colors">
                    Sign Up
                  </Link>
                </li>
                <li>
                  <Link href="/driver/login" className="text-teal-700 hover:text-teal-900 transition-colors">
                    Login
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold text-gray-900 mb-4">Company</h5>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/about" className="text-medical hover:text-blue-800 transition-colors">
                    About MED DROP
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-medical hover:text-blue-800 transition-colors">
                    Contact Support
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-medical hover:text-blue-800 transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-medical hover:text-blue-800 transition-colors">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-blue-200/30 text-center text-sm text-medical">
            <p>&copy; {new Date().getFullYear()} MED DROP. Professional Medical Courier Services.</p>
            <p className="mt-2">Secure. Compliant. Reliable.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
