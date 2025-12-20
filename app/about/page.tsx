import Link from 'next/link'
import Image from 'next/image'

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass-primary sticky top-0 z-50 border-b border-blue-200/30 flex-shrink-0">
        <div className="w-full py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-4 pl-4 md:pl-4">
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
                <p className="text-sm font-semibold text-red-600">Superior One Logistics Software</p>
              </div>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="glass-primary rounded-2xl p-8 md:p-12 border-2 border-blue-200/30 shadow-glass">
          <h1 className="text-4xl md:text-5xl font-bold text-gradient mb-6">About MED DROP</h1>
          
          <div className="prose prose-lg max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Medical Courier Services Done Right</h2>
            <p className="text-gray-700 mb-6">
              MED DROP is a professional medical courier service platform powered by Superior One Logistics Software. We provide secure, compliant transportation for medical specimens, pharmaceuticals, and healthcare supplies. Our technology-enabled platform connects healthcare facilities, laboratories, pharmacies, hospitals, clinics, dialysis centers, imaging centers, and government healthcare agencies with a network of professional drivers for reliable, time-sensitive delivery solutions.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Our Mission</h2>
            <p className="text-gray-700 mb-6">
              To provide secure, compliant transportation for medical specimens, pharmaceuticals, and healthcare supplies that healthcare facilities can depend on for critical deliveries, while maintaining the highest standards of safety, security, and regulatory compliance.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Our Values</h2>
            <div className="space-y-4 mb-8">
              <div>
                <p className="font-bold text-primary-700 mb-2">Secure.</p>
                <p className="text-gray-700">We handle every delivery with the utmost care, maintaining chain-of-custody documentation and temperature control throughout transit.</p>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-2">Compliant.</p>
                <p className="text-gray-700">We operate in full compliance with all medical courier regulations, including UN3373 certification and HIPAA requirements.</p>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-2">Reliable.</p>
                <p className="text-gray-700">Healthcare facilities depend on us for critical deliveries. We maintain high on-time performance and provide real-time tracking on every shipment.</p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Services We Offer</h2>
            <div className="space-y-4 mb-8">
              <div>
                <p className="font-bold text-primary-700 mb-2">STAT Services</p>
                <p className="text-gray-700">Critical and urgent medical courier services with immediate pickup and same-day delivery for time-sensitive medical needs.</p>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-2">Same-Day Delivery</p>
                <p className="text-gray-700">Reliable same-day delivery for medical shipments that require expedited transport.</p>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-2">Scheduled Routes</p>
                <p className="text-gray-700">Planned, recurring routes for regular medical deliveries, providing consistent service for your facility.</p>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-2">Overflow Coverage</p>
                <p className="text-gray-700">Additional capacity when your regular courier is unavailable or at capacity.</p>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-2">Government Services</p>
                <p className="text-gray-700">Specialized courier services for VA medical facilities, county health departments, and other government healthcare agencies.</p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">What We Transport</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-8">
              <li><strong>Biological Substances (UN3373 Category B)</strong> - Medical specimens, lab samples, diagnostic materials</li>
              <li><strong>Medical Supplies & Equipment</strong> - Non-biological medical materials and supplies</li>
              <li><strong>Pharmaceuticals</strong> - Prescription medications (non-controlled substances)</li>
              <li><strong>Temperature-Controlled Materials</strong> - Refrigerated, frozen, or ambient temperature shipments</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Why Choose MED DROP</h2>
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <div className="glass-primary p-4 rounded-lg border border-blue-200/30">
                <p className="font-bold text-primary-700 mb-2">Real-Time Tracking</p>
                <p className="text-gray-700 text-sm">Track your shipment from pickup to delivery with GPS-enabled real-time location updates.</p>
              </div>
              <div className="glass-primary p-4 rounded-lg border border-blue-200/30">
                <p className="font-bold text-primary-700 mb-2">Digital Signatures</p>
                <p className="text-gray-700 text-sm">Electronic proof of pickup and delivery with signer name and timestamp for complete documentation.</p>
              </div>
              <div className="glass-primary p-4 rounded-lg border border-blue-200/30">
                <p className="font-bold text-primary-700 mb-2">Temperature Monitoring</p>
                <p className="text-gray-700 text-sm">Monitored temperature control for refrigerated, frozen, and ambient shipments with full documentation.</p>
              </div>
              <div className="glass-primary p-4 rounded-lg border border-blue-200/30">
                <p className="font-bold text-primary-700 mb-2">Chain-of-Custody Documentation</p>
                <p className="text-gray-700 text-sm">Complete audit trail of all status changes, ensuring regulatory compliance and accountability.</p>
              </div>
              <div className="glass-primary p-4 rounded-lg border border-blue-200/30">
                <p className="font-bold text-primary-700 mb-2">UN3373 Certified Handling</p>
                <p className="text-gray-700 text-sm">Proper handling and transport of Category B biological substances in compliance with DOT regulations.</p>
              </div>
              <div className="glass-primary p-4 rounded-lg border border-blue-200/30">
                <p className="font-bold text-primary-700 mb-2">HIPAA-Compliant Operations</p>
                <p className="text-gray-700 text-sm">Secure handling of healthcare-related information with appropriate access controls and data security.</p>
              </div>
              <div className="glass-primary p-4 rounded-lg border border-blue-200/30">
                <p className="font-bold text-primary-700 mb-2">Professional Driver Network</p>
                <p className="text-gray-700 text-sm">Experienced drivers trained in medical specimen handling and compliance.</p>
              </div>
              <div className="glass-primary p-4 rounded-lg border border-blue-200/30">
                <p className="font-bold text-primary-700 mb-2">24/7 Availability</p>
                <p className="text-gray-700 text-sm">Available around the clock for urgent medical courier needs.</p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Our Technology Platform</h2>
            <p className="text-gray-700 mb-4">
              MED DROP operates on Superior One Logistics Software—a modern, technology-enabled platform that provides:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-8">
              <li><strong>Real-Time Load Board</strong> - Drivers can view and accept available loads instantly</li>
              <li><strong>Callback Queue System</strong> - Request a callback to book loads with real-time queue position updates</li>
              <li><strong>Load Management Dashboard</strong> - View all your shipments in one centralized location</li>
              <li><strong>UPS-Style Tracking Timeline</strong> - Visual timeline showing every status update with complete chain of custody</li>
              <li><strong>Quick Track Widget</strong> - Public tracking interface for instant shipment status lookup</li>
              <li><strong>Facility Management</strong> - Save frequently used pickup and delivery locations</li>
              <li><strong>Document Management</strong> - Upload and access Proof of Pickup, Proof of Delivery, and Bill of Lading documents</li>
              <li><strong>Invoice Management</strong> - View invoices, track payment status, and download PDFs</li>
              <li><strong>Driver Rating System</strong> - Rate drivers and provide feedback after each delivery</li>
              <li><strong>Mobile-Optimized Interface</strong> - Full functionality on smartphones and tablets for drivers on the go</li>
              <li><strong>Driver Vetting System</strong> - Comprehensive approval process ensuring qualified, compliant drivers</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Who We Serve</h2>
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Independent Pharmacies</li>
                <li>Medical Clinics & Urgent Care Centers</li>
                <li>Clinical Laboratories</li>
                <li>Dialysis Centers</li>
                <li>Imaging Centers (MRI, CT, X-Ray)</li>
                <li>Hospitals & Health Systems</li>
                <li>Specialty Medical Practices</li>
                <li>Government Healthcare Facilities</li>
                <li>Research Institutions</li>
                <li>Veterinary Clinics & Animal Hospitals</li>
                <li>Blood Banks & Donation Centers</li>
                <li>Medical Device Manufacturers</li>
                <li>Pharmaceutical Companies</li>
                <li>Home Health Agencies</li>
                <li>Hospice Care Facilities</li>
                <li>Rehabilitation Centers</li>
                <li>Mental Health Facilities</li>
                <li>Long-Term Care Facilities</li>
                <li>Medical Waste Management Companies</li>
                <li>Biotechnology Companies</li>
              </ul>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Compliance & Certifications</h2>
            <p className="text-gray-700 mb-4">
              MED DROP maintains the highest standards of regulatory compliance:
            </p>
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li><strong>HIPAA Compliant</strong> - Protected Health Information handling</li>
                <li><strong>OSHA Trained</strong> - Safety & compliance protocols</li>
                <li><strong>UN3373 Certified</strong> - Category B biological substances transport</li>
                <li><strong>TSA Verifiable</strong> - Secure chain of custody</li>
              </ul>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Professional liability coverage</li>
                <li>Cargo insurance for medical goods</li>
                <li>Temperature monitoring and documentation</li>
                <li>Chain-of-custody protocols</li>
                <li>Experienced professional drivers</li>
                <li>Regular vehicle inspections</li>
              </ul>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">About Superior One Logistics</h2>
            <p className="text-gray-700 mb-4">
              MED DROP is powered by Superior One Logistics Software, a comprehensive logistics technology platform designed specifically for medical courier operations. Our platform combines cutting-edge technology with industry expertise to deliver a seamless experience for both shippers and drivers.
            </p>
            <p className="text-gray-700 mb-6">
              Superior One Logistics Medical (our tax name) operates MED DROP as a technology-enabled marketplace connecting healthcare facilities with professional medical courier drivers, ensuring secure, compliant, and reliable transportation of medical materials.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Our Commitment</h2>
            <p className="text-gray-700 mb-6">
              At MED DROP, we understand that medical courier services are not just about transportation—they're about patient care, diagnostic accuracy, and healthcare facility operations. Every delivery we make plays a role in the healthcare system, and we take that responsibility seriously.
            </p>
            <p className="text-gray-700">
              We're committed to providing professional, reliable, compliant medical courier services that healthcare facilities can depend on for their most critical deliveries. Through Superior One Logistics Software, we're building the future of medical logistics—one secure delivery at a time.
            </p>
          </div>

          <div className="mt-12 pt-8 border-t border-blue-200/30">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-semibold"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

