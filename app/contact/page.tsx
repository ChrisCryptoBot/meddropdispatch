import Link from 'next/link'
import Image from 'next/image'

export default function ContactPage() {
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
          <h1 className="text-4xl md:text-5xl font-bold text-gradient mb-6">Contact Support</h1>
          
          <div className="prose prose-lg max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">We're Here to Help</h2>
            <p className="text-gray-700 mb-6">
              MED DROP provides comprehensive support for all your medical courier needs. Whether you need to book a delivery, track a shipment, or have questions about our services, our team is ready to assist you.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Primary Contact Methods</h2>
            <div className="space-y-6 mb-8">
              <div className="glass-primary p-6 rounded-lg border border-blue-200/30">
                <p className="font-bold text-primary-700 mb-2 text-lg">Email Support</p>
                <a href="mailto:meddrop.dispatch@outlook.com" className="text-primary-600 hover:text-primary-700 font-semibold text-lg">
                  meddrop.dispatch@outlook.com
                </a>
                <p className="text-gray-700 mt-2">Our primary contact method for general inquiries, technical support, and non-urgent requests.</p>
              </div>

              <div className="glass-primary p-6 rounded-lg border border-blue-200/30">
                <p className="font-bold text-primary-700 mb-2 text-lg">Load Creation & Dispatch</p>
                <a href="mailto:meddrop.dispatch@meddrop.onmicrosoft.com" className="text-primary-600 hover:text-primary-700 font-semibold text-lg">
                  meddrop.dispatch@meddrop.onmicrosoft.com
                </a>
                <p className="text-gray-700 mt-2">For load booking, dispatch questions, and delivery coordination.</p>
              </div>

              <div className="glass-primary p-6 rounded-lg border border-blue-200/30">
                <p className="font-bold text-primary-700 mb-2 text-lg">Phone Support</p>
                <a href="tel:+19039140386" className="text-2xl font-bold text-primary-600 hover:text-primary-700 mb-2 inline-block">
                  (903) 914-0386
                </a>
                <p className="text-gray-700 mb-2">Available 24/7 for urgent medical courier needs</p>
                <p className="text-gray-700">Call us for immediate assistance with critical deliveries and time-sensitive requests.</p>
              </div>

              <div className="glass-primary p-6 rounded-lg border border-blue-200/30">
                <p className="font-bold text-primary-700 mb-2 text-lg">Callback Queue</p>
                <p className="text-gray-700">Request a callback through our platform to book loads. Join the queue, see your position in real-time, and we'll call you back to process your delivery request.</p>
              </div>

              <div className="glass-primary p-6 rounded-lg border border-blue-200/30">
                <p className="font-bold text-primary-700 mb-2 text-lg">In-App Support</p>
                <p className="text-gray-700">Access support directly through your shipper or driver dashboard for quick assistance with account-related questions.</p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Support Availability</h2>
            <div className="space-y-4 mb-8">
              <div>
                <p className="font-bold text-primary-700 mb-2">24/7 Emergency Support</p>
                <p className="text-gray-700">We provide round-the-clock availability for urgent medical courier needs. Critical deliveries don't wait for business hours, and neither do we.</p>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-2">General Inquiries</p>
                <p className="text-gray-700">Email support is monitored during business hours with typical response times within 24 hours.</p>
              </div>
              <div>
                <p className="font-bold text-primary-700 mb-2">Technical Support</p>
                <p className="text-gray-700">Platform and technical issues are addressed promptly during business hours, with urgent issues escalated for immediate attention.</p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">What We Can Help With</h2>
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <div className="glass-primary p-4 rounded-lg border border-blue-200/30">
                <p className="font-bold text-primary-700 mb-2">Load Booking & Scheduling</p>
                <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                  <li>Requesting callback for new deliveries</li>
                  <li>Scheduling recurring routes</li>
                  <li>Modifying existing load requests</li>
                  <li>Urgent STAT delivery coordination</li>
                  <li>Overflow coverage arrangements</li>
                </ul>
              </div>
              <div className="glass-primary p-4 rounded-lg border border-blue-200/30">
                <p className="font-bold text-primary-700 mb-2">Tracking & Status</p>
                <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                  <li>Real-time shipment tracking</li>
                  <li>Status update inquiries</li>
                  <li>Delivery confirmation</li>
                  <li>GPS location information</li>
                  <li>Estimated delivery times</li>
                </ul>
              </div>
              <div className="glass-primary p-4 rounded-lg border border-blue-200/30">
                <p className="font-bold text-primary-700 mb-2">Billing & Invoices</p>
                <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                  <li>Invoice questions</li>
                  <li>Payment terms and arrangements</li>
                  <li>Billing contact updates</li>
                  <li>Invoice download assistance</li>
                  <li>Payment status inquiries</li>
                </ul>
              </div>
              <div className="glass-primary p-4 rounded-lg border border-blue-200/30">
                <p className="font-bold text-primary-700 mb-2">Account Management</p>
                <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                  <li>Profile and company information updates</li>
                  <li>Facility management assistance</li>
                  <li>User access and permissions</li>
                  <li>Password reset and login issues</li>
                  <li>Account settings configuration</li>
                </ul>
              </div>
              <div className="glass-primary p-4 rounded-lg border border-blue-200/30">
                <p className="font-bold text-primary-700 mb-2">Technical Support</p>
                <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                  <li>Platform navigation assistance</li>
                  <li>Document upload and access</li>
                  <li>Signature capture troubleshooting</li>
                  <li>GPS tracking issues</li>
                  <li>Browser compatibility questions</li>
                </ul>
              </div>
              <div className="glass-primary p-4 rounded-lg border border-blue-200/30">
                <p className="font-bold text-primary-700 mb-2">Compliance Questions</p>
                <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                  <li>Temperature monitoring requirements</li>
                  <li>Chain-of-custody documentation</li>
                  <li>UN3373 handling procedures</li>
                  <li>HIPAA compliance inquiries</li>
                  <li>Regulatory requirement clarification</li>
                </ul>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">How to Request a Callback</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-8">
              <li>Log in to your MED DROP shipper dashboard</li>
              <li>Click "Request Callback" to join the queue</li>
              <li>See your position in real-time (updates every 10 seconds)</li>
              <li>Wait for our dispatch team to call you</li>
              <li>Provide load details during the call</li>
              <li>Receive load confirmation email with tracking information</li>
            </ol>
            <p className="text-gray-700 mb-8">
              Our dispatch team handles all load input to ensure accuracy and compliance. You'll receive a confirmation email with your driver information and tracking link once your load is scheduled.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Emergency Contact Procedures</h2>
            <p className="text-gray-700 mb-4">For critical, time-sensitive medical deliveries:</p>
            <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-8">
              <li>Call our 24/7 support line immediately</li>
              <li>Identify yourself and your facility</li>
              <li>Describe the urgency and delivery requirements</li>
              <li>Provide pickup and delivery locations</li>
              <li>Specify any special handling requirements (temperature, chain-of-custody)</li>
              <li>Receive immediate confirmation and driver assignment</li>
            </ol>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Response Time Expectations</h2>
            <div className="space-y-3 mb-8">
              <p className="text-gray-700"><strong>Email Inquiries:</strong> Typically within 24 hours during business hours</p>
              <p className="text-gray-700"><strong>Urgent Phone Requests:</strong> Immediate response 24/7</p>
              <p className="text-gray-700"><strong>Callback Queue:</strong> Based on queue position, typically within 15-30 minutes during business hours</p>
              <p className="text-gray-700"><strong>In-App Support:</strong> Response within business hours, typically same-day</p>
              <p className="text-gray-700"><strong>Technical Issues:</strong> Escalated issues addressed within 2-4 hours during business hours</p>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Feedback & Suggestions</h2>
            <p className="text-gray-700 mb-6">
              We value your feedback and continuously work to improve our services. If you have suggestions, compliments, or concerns about your MED DROP experience, please reach out to <a href="mailto:meddrop.dispatch@outlook.com" className="text-primary-600 hover:text-primary-700 font-semibold">meddrop.dispatch@outlook.com</a>.
            </p>
            <p className="text-gray-700">
              After each delivery, you'll have the opportunity to rate your driver and provide feedback. Your input helps us maintain high service standards and recognize exceptional performance.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Business Hours</h2>
            <p className="text-gray-700 mb-4">
              While our courier services and emergency support are available 24/7, our administrative and general support team operates:
            </p>
            <div className="glass-primary p-4 rounded-lg border border-blue-200/30 mb-8">
              <p className="text-gray-700"><strong>Monday - Friday:</strong> 8:00 AM - 6:00 PM Central Time</p>
              <p className="text-gray-700"><strong>Saturday:</strong> 9:00 AM - 2:00 PM Central Time</p>
              <p className="text-gray-700"><strong>Sunday:</strong> Emergency support only</p>
            </div>
            <p className="text-gray-700 mb-8">
              For urgent medical deliveries outside these hours, our 24/7 support line is always available.
            </p>

            <div className="glass-primary p-6 rounded-lg border-2 border-primary-300 mt-8">
              <p className="text-lg font-bold text-primary-700 text-center">
                We're committed to providing responsive, professional support for all your medical courier needs. Don't hesitate to reach out—we're here to help.
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

