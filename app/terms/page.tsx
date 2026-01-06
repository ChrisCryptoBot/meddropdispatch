import Link from 'next/link'
import Image from 'next/image'

export default function TermsPage() {
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
                <p className="text-sm font-semibold text-red-600">Medical Courier Services</p>
              </div>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="glass-primary rounded-2xl p-8 md:p-12 border-2 border-blue-200/30 shadow-glass">
          <div className="mb-6">
            <h1 className="text-4xl md:text-5xl font-bold text-gradient mb-2">Terms of Service</h1>
            <p className="text-sm text-gray-600">
              <strong>Effective Date:</strong> December 13, 2025<br />
              <strong>Last Updated:</strong> December 13, 2025
            </p>
          </div>
          
          <div className="prose prose-lg max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Agreement to Terms</h2>
            <p className="text-gray-700 mb-8">
              By accessing or using the MED DROP platform and services, you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use our services.
            </p>
            <p className="text-gray-700 mb-8">
              These Terms constitute a legally binding agreement between you (as an individual or entity) and MED DROP. Please read them carefully.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Service Description</h2>
            <p className="text-gray-700 mb-4">
              MED DROP provides a technology-enabled medical courier platform connecting healthcare facilities ("Shippers") with professional drivers for the transport of medical specimens, pharmaceuticals, and healthcare supplies.
            </p>
            <div className="space-y-3 mb-6">
              <div>
                <p className="font-bold text-primary-700 mb-2">Services Include:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li><strong>STAT Services:</strong> Critical/urgent medical deliveries with immediate pickup</li>
                  <li><strong>Same-Day Delivery:</strong> Time-sensitive medical shipments</li>
                  <li><strong>Scheduled Routes:</strong> Recurring, planned delivery routes</li>
                  <li><strong>Overflow Coverage:</strong> Additional capacity for existing routes</li>
                  <li><strong>Government Services:</strong> Specialized services for government healthcare agencies</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-2">Materials Transported:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>UN3373 Category B biological substances</li>
                  <li>Medical supplies and equipment</li>
                  <li>Pharmaceuticals (non-controlled substances)</li>
                  <li>Temperature-controlled materials</li>
                </ul>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">User Accounts</h2>
            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">Account Registration</h3>
            <div className="space-y-3 mb-6">
              <div>
                <p className="font-bold text-primary-700 mb-1">Shippers must provide:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>Accurate company and contact information</li>
                  <li>Valid business address</li>
                  <li>Billing and payment information</li>
                  <li>Facility information for pickup/delivery locations</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-1">Drivers must provide:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>Accurate personal information</li>
                  <li>Valid driver's license</li>
                  <li>Vehicle information and insurance</li>
                  <li>Banking information for payments</li>
                  <li>Tax information (SSN/EIN, W-9)</li>
                </ul>
              </div>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">Account Security</h3>
            <p className="text-gray-700 mb-3">You are responsible for:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 mb-4 ml-4">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of unauthorized access</li>
              <li>Using strong passwords and keeping them secure</li>
            </ul>
            <p className="text-gray-700 mb-3">You must not:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 mb-6 ml-4">
              <li>Share your account credentials with others</li>
              <li>Allow others to access your account</li>
              <li>Create multiple accounts</li>
              <li>Impersonate another person or entity</li>
            </ul>

            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">Account Accuracy</h3>
            <p className="text-gray-700 mb-8">
              You must maintain accurate account information at all times. Failure to provide accurate information may result in service disruption or account termination.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Acceptable Use Policy</h2>
            <p className="text-gray-700 mb-4">
              You agree to use MED DROP services only for lawful purposes and in compliance with these Terms.
            </p>
            <div className="space-y-4 mb-6">
              <div>
                <p className="font-bold text-primary-700 mb-2">Prohibited Activities Include:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>Providing false, misleading, or inaccurate information</li>
                  <li>Violating any applicable laws or regulations</li>
                  <li>Violating medical courier regulations or compliance standards</li>
                  <li>Transporting prohibited materials (controlled substances without authorization, hazardous materials requiring CDL, medical waste without proper licensing)</li>
                  <li>Interfering with platform security or functionality</li>
                  <li>Attempting unauthorized access to systems or accounts</li>
                  <li>Harassing, threatening, or abusing other users</li>
                  <li>Using the platform for fraudulent purposes</li>
                  <li>Violating intellectual property rights</li>
                  <li>Circumventing platform fees or payment obligations</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-2">Drivers specifically must not:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>Accept loads they cannot fulfill</li>
                  <li>Fail to maintain proper insurance and licensing</li>
                  <li>Violate chain-of-custody protocols</li>
                  <li>Compromise temperature control requirements</li>
                  <li>Mishandle medical specimens or materials</li>
                  <li>Disable required tracking or compliance features</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-2">Shippers specifically must not:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>Request transport of prohibited materials</li>
                  <li>Provide inaccurate load information</li>
                  <li>Cancel loads without proper notice</li>
                  <li>Fail to pay invoices according to payment terms</li>
                  <li>Interfere with driver performance of duties</li>
                </ul>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Service Booking and Fulfillment</h2>
            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">Load Request Process</h3>
            <div className="space-y-3 mb-6">
              <div>
                <p className="font-bold text-primary-700 mb-2">Callback Queue System:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>Shippers request callbacks to book loads</li>
                  <li>Join queue and see position in real-time</li>
                  <li>Dispatch calls shippers in order</li>
                  <li>Drivers input all load details during phone call</li>
                  <li>Shippers receive confirmation email with tracking</li>
                </ul>
              </div>
              <p className="text-gray-700 mb-6">
                <strong>Shippers cannot directly input load details.</strong> All load information is entered by drivers during the callback to ensure accuracy and compliance.
              </p>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">Load Acceptance</h3>
            <p className="text-gray-700 mb-6">
              Drivers may accept or deny available loads at their discretion. Once a driver accepts a load, they are obligated to complete it unless circumstances beyond their control prevent fulfillment.
            </p>

            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">Service Standards</h3>
            <div className="space-y-3 mb-8">
              <div>
                <p className="font-bold text-primary-700 mb-1">On-Time Performance:</p>
                <p className="text-gray-700 ml-4">Drivers must maintain high on-time delivery performance. Repeated failures to meet on-time standards may result in account suspension or termination.</p>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-1">Chain-of-Custody:</p>
                <p className="text-gray-700 ml-4">All deliveries must maintain complete chain-of-custody documentation with signatures, timestamps, and temperature readings as applicable.</p>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-1">Temperature Control:</p>
                <p className="text-gray-700 ml-4">Temperature-sensitive materials must be maintained within specified ranges with monitoring and documentation at pickup and delivery.</p>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-1">Communication:</p>
                <p className="text-gray-700 ml-4">Users must respond to platform notifications and communications within reasonable timeframes. Drivers must update load status promptly and accurately.</p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Quotes and Pricing</h2>
            <div className="space-y-3 mb-8">
              <div>
                <p className="font-bold text-primary-700 mb-1">Quote Requests:</p>
                <p className="text-gray-700 ml-4">Some loads may require quotes before acceptance. Shippers may accept or reject quotes. Once a quote is accepted, pricing is locked for that load.</p>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-1">Pricing Changes:</p>
                <p className="text-gray-700 ml-4">MED DROP reserves the right to adjust pricing with reasonable notice. Existing contracted rates remain in effect for the contract term.</p>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-1">Service Fees:</p>
                <p className="text-gray-700 ml-4">MED DROP charges service fees for platform usage and delivery coordination. Fees are disclosed during the booking process and included in invoices.</p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Payment Terms</h2>
            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">Shipper Payment Obligations</h3>
            <div className="space-y-3 mb-6">
              <div>
                <p className="font-bold text-primary-700 mb-1">Payment Terms Available:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>Net-7: Payment due within 7 days</li>
                  <li>Net-14: Payment due within 14 days</li>
                  <li>Net-30: Payment due within 30 days</li>
                  <li>Invoice-Only: Custom payment arrangements</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-1">Payment Methods:</p>
                <p className="text-gray-700 ml-4">ACH, wire transfer, check, or other approved methods as specified in your account settings.</p>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-1">Late Payments:</p>
                <p className="text-gray-700 ml-4">Invoices not paid within the specified term are considered overdue. MED DROP reserves the right to suspend services, charge late fees, pursue collection, or terminate accounts with repeated payment failures.</p>
              </div>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">Driver Payments</h3>
            <div className="space-y-3 mb-8">
              <div>
                <p className="font-bold text-primary-700 mb-1">Driver Compensation:</p>
                <p className="text-gray-700 ml-4">Drivers receive compensation for completed loads as agreed upon acceptance or quote. Compensation is paid via ACH to the driver's designated bank account.</p>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-1">Tax Responsibilities:</p>
                <p className="text-gray-700 ml-4">Drivers are responsible for all tax obligations as independent contractors, including self-employment taxes, estimated tax payments, and year-end tax reporting.</p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Cancellations and Refunds</h2>
            <div className="space-y-4 mb-8">
              <div>
                <p className="font-bold text-primary-700 mb-2">Shipper Cancellations:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li><strong>Before Driver Assignment:</strong> Loads may be cancelled with no penalty</li>
                  <li><strong>After Driver Assignment:</strong> Cancellations may incur charges based on timing and driver status (BILLABLE, PARTIAL, or NOT_BILLABLE)</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-2">Driver Cancellations:</p>
                <p className="text-gray-700 mb-2 ml-4">Valid reasons include vehicle breakdown, medical emergency, unsafe weather conditions, or facility closure. Repeated invalid cancellations may result in account suspension.</p>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-2">Refund Policy:</p>
                <p className="text-gray-700 ml-4">Refunds are provided only for services not rendered due to MED DROP error, duplicate charges, or billing errors. Refund requests must be submitted within 30 days.</p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Liability and Insurance</h2>
            <div className="space-y-4 mb-8">
              <div>
                <p className="font-bold text-primary-700 mb-2">MED DROP Liability:</p>
                <p className="text-gray-700 ml-4 mb-2">MED DROP provides a platform connecting shippers and drivers. Our liability is limited to platform and coordination services. To the maximum extent permitted by law, our total liability shall not exceed the fees paid for the specific service giving rise to the claim.</p>
                <p className="text-gray-700 ml-4">MED DROP is not liable for indirect, incidental, consequential, special, or punitive damages.</p>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-2">Driver Insurance Requirements:</p>
                <p className="text-gray-700 ml-4">All drivers must maintain commercial auto liability insurance ($1,000,000 minimum), cargo insurance ($100,000 minimum), current vehicle registration, and valid driver's license.</p>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-2">Shipper Responsibilities:</p>
                <p className="text-gray-700 ml-4">Shippers are responsible for accurate material descriptions, proper packaging and labeling, compliance with shipping regulations, and any damages resulting from improper packaging or mislabeling.</p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Compliance Requirements</h2>
            <div className="space-y-4 mb-8">
              <div>
                <p className="font-bold text-primary-700 mb-2">Regulatory Compliance:</p>
                <p className="text-gray-700 ml-4">All users must comply with DOT regulations, UN3373 requirements, HIPAA requirements, state and local medical courier regulations, and temperature control requirements.</p>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-2">Chain-of-Custody:</p>
                <p className="text-gray-700 ml-4">Drivers must maintain complete chain-of-custody documentation, including pickup/delivery signatures, temperature readings, status updates, location information, and timestamps.</p>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-2">Document Requirements:</p>
                <p className="text-gray-700 ml-4">Drivers must upload required documents including Proof of Pickup, Proof of Delivery, Bill of Lading, temperature logs, and any special handling documentation.</p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Intellectual Property</h2>
            <p className="text-gray-700 mb-4">
              MED DROP owns all rights, title, and interest in the platform, including software, code, technology, trademarks, logos, branding, content, design elements, and documentation.
            </p>
            <p className="text-gray-700 mb-8">
              Subject to these Terms, MED DROP grants you a limited, non-exclusive, non-transferable, revocable license to access and use the platform for its intended purpose. You may not copy, modify, reverse engineer, or use MED DROP branding without written permission.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Data and Privacy</h2>
            <p className="text-gray-700 mb-8">
              Your use of MED DROP services is subject to our Privacy Policy, which is incorporated into these Terms by reference. By using our services, you consent to our data collection, use, and sharing practices as described in the Privacy Policy.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Account Termination</h2>
            <div className="space-y-4 mb-8">
              <div>
                <p className="font-bold text-primary-700 mb-2">Termination by User:</p>
                <p className="text-gray-700 ml-4">You may terminate your account at any time by contacting <a href="mailto:meddrop.dispatch@outlook.com" className="text-primary-600 hover:text-primary-700">meddrop.dispatch@outlook.com</a>. You remain responsible for outstanding invoices, and historical data will be retained according to our 7-year retention policy.</p>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-2">Termination by MED DROP:</p>
                <p className="text-gray-700 ml-4">We may suspend or terminate your account immediately for violation of Terms, non-payment, fraudulent activity, compliance violations, repeated performance failures, or illegal activity.</p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Dispute Resolution</h2>
            <div className="space-y-3 mb-8">
              <p className="text-gray-700">Before pursuing formal dispute resolution, you agree to contact us at <a href="mailto:meddrop.dispatch@outlook.com" className="text-primary-600 hover:text-primary-700">meddrop.dispatch@outlook.com</a> to attempt informal resolution.</p>
              <p className="text-gray-700">These Terms are governed by the laws of the State of Texas. Any legal action shall be brought exclusively in Texas state or federal courts.</p>
              <p className="text-gray-700">For disputes that cannot be resolved informally, you agree to binding arbitration under the rules of the American Arbitration Association, conducted in Texas.</p>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Modifications to Terms</h2>
            <p className="text-gray-700 mb-4">
              We reserve the right to modify these Terms at any time. We will provide notice of material changes by updating the "Last Updated" date, posting notice on the platform, and sending email notification.
            </p>
            <p className="text-gray-700 mb-8">
              Your continued use of services after changes take effect constitutes acceptance of the modified Terms. If you do not agree to changes, you must stop using the platform.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Contact Information</h2>
            <div className="glass-primary p-6 rounded-lg border border-blue-200/30 mb-8">
              <p className="text-gray-700 mb-2">For questions about these Terms of Service, please contact us:</p>
              <p className="font-bold text-primary-700 mb-2">Email:</p>
              <a href="mailto:meddrop.dispatch@outlook.com" className="text-primary-600 hover:text-primary-700 font-semibold text-lg">
                meddrop.dispatch@outlook.com
              </a>
              <p className="text-gray-700 mt-2"><strong>Subject Line:</strong> Terms of Service Inquiry</p>
              <p className="text-gray-700 mt-4">For legal inquiries or notices, use the subject line "Legal Notice" or "Legal Inquiry."</p>
            </div>

            <div className="glass-primary p-6 rounded-lg border-2 border-primary-300 mt-8">
              <p className="text-center font-bold text-primary-700">
                By using MED DROP services, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
              </p>
            </div>
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

