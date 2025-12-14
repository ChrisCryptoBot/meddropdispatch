import Link from 'next/link'
import Image from 'next/image'

export default function PrivacyPage() {
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
            <h1 className="text-4xl md:text-5xl font-bold text-gradient mb-2">Privacy Policy</h1>
            <p className="text-sm text-gray-600">
              <strong>Effective Date:</strong> December 13, 2025<br />
              <strong>Last Updated:</strong> December 13, 2025
            </p>
          </div>
          
          <div className="prose prose-lg max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Introduction</h2>
            <p className="text-gray-700 mb-6">
              MED DROP ("we," "us," or "our") is committed to protecting the privacy and security of your personal information. This Privacy Policy explains how we collect, use, store, and protect information when you use our medical courier services and platform.
            </p>
            <p className="text-gray-700 mb-8">
              This policy applies to all users of the MED DROP platform, including shippers (healthcare facilities and clients), drivers, and website visitors.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Information We Collect</h2>
            
            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">Shipper Information</h3>
            <p className="text-gray-700 mb-3">When you register as a shipper or use our services, we collect:</p>
            <div className="space-y-3 mb-6">
              <div>
                <p className="font-bold text-primary-700 mb-1">Account Information:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>Company name and business information</li>
                  <li>Contact person name, email address, and phone number</li>
                  <li>Business address and billing information</li>
                  <li>Tax identification information</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-1">Facility Information:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>Pickup and delivery location addresses</li>
                  <li>Facility contact information</li>
                  <li>Access notes and special instructions</li>
                  <li>Facility type and operating hours</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-1">Load and Service Information:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>Pickup and delivery details</li>
                  <li>Service type and specifications</li>
                  <li>Temperature requirements</li>
                  <li>Specimen categories</li>
                  <li>Special handling instructions</li>
                  <li>Tracking and status information</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-1">Billing Information:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>Payment terms and preferences</li>
                  <li>Invoice history</li>
                  <li>Payment information</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-1">Communications:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>Email correspondence</li>
                  <li>Phone call records</li>
                  <li>Support inquiries</li>
                  <li>Feedback and ratings</li>
                </ul>
              </div>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">Driver Information</h3>
            <p className="text-gray-700 mb-3">When you register as a driver, we collect:</p>
            <div className="space-y-3 mb-6">
              <div>
                <p className="font-bold text-primary-700 mb-1">Personal Information:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>Full name, email address, and phone number</li>
                  <li>Driver's license information</li>
                  <li>Social Security Number or Tax ID (for payment and tax purposes)</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-1">Vehicle Information:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>Vehicle make, model, year, and license plate</li>
                  <li>Vehicle type and capacity</li>
                  <li>Insurance information</li>
                  <li>Vehicle inspection records</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-1">Payment Information:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>Bank account information for ACH payments</li>
                  <li>Tax information (W-9)</li>
                  <li>Payout preferences</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-1">Location Information:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>GPS location data (when location sharing is enabled)</li>
                  <li>Route information</li>
                  <li>Delivery location data</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-1">Performance Information:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>Delivery history</li>
                  <li>On-time performance metrics</li>
                  <li>Customer ratings and feedback</li>
                  <li>Earnings history</li>
                </ul>
              </div>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">Load and Transaction Data</h3>
            <p className="text-gray-700 mb-3">For all deliveries, we collect:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 mb-6 ml-4">
              <li>Pickup and delivery addresses</li>
              <li>Service specifications</li>
              <li>Status updates and tracking events</li>
              <li>Digital signatures (pickup and delivery)</li>
              <li>Temperature readings</li>
              <li>Timestamp and location information</li>
              <li>Document uploads (Proof of Pickup, Proof of Delivery, Bill of Lading)</li>
              <li>Actor information (who performed each action)</li>
            </ul>

            <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">Automatically Collected Information</h3>
            <p className="text-gray-700 mb-3">When you use our platform, we automatically collect:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 mb-8 ml-4">
              <li>IP address</li>
              <li>Browser type and version</li>
              <li>Device information</li>
              <li>Operating system</li>
              <li>Access times and dates</li>
              <li>Pages viewed and navigation paths</li>
              <li>Referring website addresses</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">How We Use Your Information</h2>
            <p className="text-gray-700 mb-3">We use collected information for the following purposes:</p>
            <div className="space-y-3 mb-8">
              <div>
                <p className="font-bold text-primary-700 mb-1">Service Delivery:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>Process and fulfill delivery requests</li>
                  <li>Assign drivers to loads</li>
                  <li>Track shipments and provide real-time updates</li>
                  <li>Maintain chain-of-custody documentation</li>
                  <li>Generate delivery confirmation and documentation</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-1">Platform Operations:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>Create and manage user accounts</li>
                  <li>Authenticate users and maintain security</li>
                  <li>Provide customer support</li>
                  <li>Process payments and generate invoices</li>
                  <li>Maintain load and delivery history</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-1">Compliance and Safety:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>Comply with medical courier regulations</li>
                  <li>Maintain HIPAA compliance</li>
                  <li>Verify credentials and certifications</li>
                  <li>Maintain audit logs and compliance records</li>
                  <li>Respond to legal requests</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-1">Communication:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>Send service notifications and updates</li>
                  <li>Provide load confirmations and tracking information</li>
                  <li>Respond to inquiries and support requests</li>
                  <li>Send invoices and payment confirmations</li>
                  <li>Deliver important account information</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-1">Improvement and Analytics:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>Analyze service performance and usage patterns</li>
                  <li>Improve platform functionality</li>
                  <li>Develop new features and services</li>
                  <li>Conduct quality assurance</li>
                  <li>Generate aggregated statistics (anonymized)</li>
                </ul>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">How We Share Your Information</h2>
            <p className="text-gray-700 mb-3">We share information only in the following circumstances:</p>
            <div className="space-y-4 mb-8">
              <div>
                <p className="font-bold text-primary-700 mb-2">With Drivers and Shippers:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>Drivers receive shipper company name, facility information, and load details necessary to complete deliveries</li>
                  <li>Shippers receive driver name, contact information, and vehicle information for assigned loads</li>
                  <li>Both parties receive tracking and status updates</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-2">With Service Providers:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>Email service providers (Resend) for transactional emails</li>
                  <li>Payment processors for ACH and payment processing</li>
                  <li>Mapping services (Google Maps API) for routing and geocoding</li>
                  <li>Cloud hosting and storage providers</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-2">For Legal Compliance:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>In response to valid legal requests, subpoenas, or court orders</li>
                  <li>To comply with applicable laws and regulations</li>
                  <li>To protect our rights, property, or safety</li>
                  <li>To enforce our Terms of Service</li>
                  <li>In connection with fraud prevention and investigation</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-2">Business Transfers:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>In connection with a merger, acquisition, or sale of assets (with notice provided)</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-2">With Your Consent:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>When you explicitly authorize us to share specific information</li>
                </ul>
              </div>
            </div>
            <div className="glass-primary p-4 rounded-lg border border-primary-300 mb-8">
              <p className="font-bold text-primary-700 text-center">We do not sell your personal information to third parties.</p>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Data Retention</h2>
            <div className="glass-primary p-6 rounded-lg border border-blue-200/30 mb-6">
              <p className="font-bold text-primary-700 mb-3 text-lg">7-Year Retention Policy:</p>
              <p className="text-gray-700 mb-4">
                All delivery records, tracking events, signatures, temperature readings, documents, and invoices are retained for <strong>7 years</strong> from the date of delivery completion. This retention period ensures compliance with healthcare regulations, tax requirements, and legal obligations.
              </p>
            </div>
            <div className="space-y-3 mb-6">
              <div>
                <p className="font-bold text-primary-700 mb-1">Retention Includes:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>Load requests and delivery details</li>
                  <li>Tracking events and status changes</li>
                  <li>Digital signatures</li>
                  <li>Temperature monitoring records</li>
                  <li>Proof of Pickup and Delivery documents</li>
                  <li>Bills of Lading</li>
                  <li>Invoices and payment records</li>
                  <li>Chain-of-custody documentation</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-1">Extended Retention:</p>
                <p className="text-gray-700 ml-4">Financial records may be retained longer than 7 years to comply with tax and accounting requirements.</p>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-1">Account Deletion:</p>
                <p className="text-gray-700 ml-4">If you request account deletion, your account will be deactivated, but historical delivery records will be retained for the 7-year compliance period. After the retention period expires, data will be securely deleted or anonymized.</p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Data Security</h2>
            <p className="text-gray-700 mb-3">We implement comprehensive security measures to protect your information:</p>
            <div className="space-y-3 mb-6">
              <div>
                <p className="font-bold text-primary-700 mb-1">Technical Safeguards:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>Password hashing using bcryptjs</li>
                  <li>Encrypted data transmission (SSL/TLS)</li>
                  <li>Protected API routes with authentication</li>
                  <li>Role-based access control</li>
                  <li>Secure database storage</li>
                  <li>Regular security updates and patches</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-1">Operational Safeguards:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>Access controls and authorization limits</li>
                  <li>Audit logging of all system access</li>
                  <li>Regular security assessments</li>
                  <li>Data backup and recovery procedures</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-1">Physical Safeguards:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>Secure server infrastructure</li>
                  <li>Restricted physical access to systems</li>
                  <li>Environmental controls</li>
                </ul>
              </div>
            </div>
            <p className="text-gray-700 mb-8">
              Despite our security measures, no system is completely secure. We cannot guarantee absolute security but remain committed to protecting your information using industry-standard practices.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">HIPAA Compliance</h2>
            <div className="space-y-4 mb-8">
              <div>
                <p className="font-bold text-primary-700 mb-2">Protected Health Information (PHI):</p>
                <p className="text-gray-700 ml-4">
                  MED DROP does not typically store Protected Health Information as defined by HIPAA. Our platform collects delivery logistics information (addresses, signatures, temperatures) but not patient names, medical record numbers, or diagnostic information.
                </p>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-2">Compliance Measures:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>Access controls on all records</li>
                  <li>Audit logs for document access</li>
                  <li>Secure storage of compliance documents</li>
                  <li>Chain-of-custody documentation</li>
                  <li>Employee training on data handling</li>
                  <li>Business Associate Agreements available upon request</li>
                </ul>
              </div>
            </div>
            <p className="text-gray-700 mb-8">
              If your facility requires specific HIPAA compliance measures or a Business Associate Agreement, please contact us at <a href="mailto:meddrop.dispatch@outlook.com" className="text-primary-600 hover:text-primary-700 font-semibold">meddrop.dispatch@outlook.com</a>.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Your Rights and Choices</h2>
            <p className="text-gray-700 mb-3">You have the following rights regarding your information:</p>
            <div className="space-y-3 mb-8">
              <div>
                <p className="font-bold text-primary-700 mb-1">Access:</p>
                <p className="text-gray-700 ml-4">You can access your account information, load history, and documents through your dashboard at any time.</p>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-1">Correction:</p>
                <p className="text-gray-700 ml-4">You can update your profile information, facility details, and account settings directly in the platform. For corrections requiring support assistance, contact us at <a href="mailto:meddrop.dispatch@outlook.com" className="text-primary-600 hover:text-primary-700">meddrop.dispatch@outlook.com</a>.</p>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-1">Export:</p>
                <p className="text-gray-700 ml-4">You can request an export of your data, including load history, invoices, and documents. Contact <a href="mailto:meddrop.dispatch@outlook.com" className="text-primary-600 hover:text-primary-700">meddrop.dispatch@outlook.com</a> to request a data export.</p>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-1">Deletion:</p>
                <p className="text-gray-700 ml-4">You can request account deletion, subject to our 7-year data retention policy for compliance records. Contact <a href="mailto:meddrop.dispatch@outlook.com" className="text-primary-600 hover:text-primary-700">meddrop.dispatch@outlook.com</a> to request deletion.</p>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-1">Opt-Out:</p>
                <p className="text-gray-700 ml-4">You can opt out of non-essential communications. Transactional emails (load confirmations, delivery notifications, invoices) cannot be disabled as they are necessary for service operation.</p>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-1">Location Tracking:</p>
                <p className="text-gray-700 ml-4">Drivers can enable or disable GPS location sharing at any time through their dashboard settings.</p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Cookies and Tracking Technologies</h2>
            <p className="text-gray-700 mb-3">MED DROP uses minimal cookies and tracking technologies:</p>
            <div className="space-y-3 mb-8">
              <div>
                <p className="font-bold text-primary-700 mb-1">Essential Cookies:</p>
                <p className="text-gray-700 ml-4">Session cookies for authentication and platform functionality. These cookies are necessary for the platform to operate and cannot be disabled.</p>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-1">Analytics:</p>
                <p className="text-gray-700 ml-4">We may use anonymized analytics to understand platform usage and improve services.</p>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-1">Third-Party Services:</p>
                <p className="text-gray-700 ml-4">Google Maps and other integrated services may use their own cookies. Refer to their respective privacy policies for information about their data practices.</p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Third-Party Links</h2>
            <p className="text-gray-700 mb-8">
              Our platform may contain links to third-party websites or services (such as Google Maps). We are not responsible for the privacy practices of these third parties. We encourage you to review their privacy policies.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Children's Privacy</h2>
            <p className="text-gray-700 mb-8">
              MED DROP services are not directed to individuals under 18 years of age. We do not knowingly collect information from children. If we become aware that we have collected information from a child under 18, we will delete it promptly.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Changes to This Privacy Policy</h2>
            <p className="text-gray-700 mb-3">We may update this Privacy Policy periodically to reflect changes in our practices, technology, legal requirements, or business operations. We will notify users of material changes by:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 mb-8 ml-4">
              <li>Updating the "Last Updated" date at the top of this policy</li>
              <li>Posting a notice on our platform</li>
              <li>Sending email notification for significant changes</li>
            </ul>
            <p className="text-gray-700 mb-8">
              Your continued use of MED DROP services after changes become effective constitutes acceptance of the updated policy.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Contact Us</h2>
            <p className="text-gray-700 mb-4">
              If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="glass-primary p-6 rounded-lg border border-blue-200/30 mb-8">
              <p className="font-bold text-primary-700 mb-2">Email:</p>
              <a href="mailto:meddrop.dispatch@outlook.com" className="text-primary-600 hover:text-primary-700 font-semibold text-lg">
                meddrop.dispatch@outlook.com
              </a>
              <p className="text-gray-700 mt-2"><strong>Subject Line:</strong> Privacy Inquiry</p>
              <p className="text-gray-700 mt-4">
                For specific data rights requests (access, export, deletion), please include:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-1 mt-2 ml-4">
                <li>Your name and account email address</li>
                <li>Specific request details</li>
                <li>Verification information (for security purposes)</li>
              </ul>
              <p className="text-gray-700 mt-4">We will respond to privacy inquiries within 30 days.</p>
            </div>

            <div className="glass-primary p-6 rounded-lg border-2 border-primary-300 mt-8">
              <p className="text-center font-bold text-primary-700">
                This Privacy Policy is designed to comply with applicable privacy laws and healthcare regulations. MED DROP is committed to transparency and protecting your privacy.
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

