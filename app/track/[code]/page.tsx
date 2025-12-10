import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import { formatDateTime, formatDate } from '@/lib/utils'
import { LOAD_STATUS_LABELS, LOAD_STATUS_COLORS } from '@/lib/types'

async function getLoadByTrackingCode(code: string) {
  const load = await prisma.loadRequest.findUnique({
    where: { publicTrackingCode: code.toUpperCase() },
    include: {
      shipper: true,
      pickupFacility: true,
      dropoffFacility: true,
      driver: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          vehicleType: true,
        }
      },
      trackingEvents: {
        orderBy: { createdAt: 'asc' }
      },
      documents: {
        orderBy: { createdAt: 'desc' }
      }
    }
  })

  return load
}

export default async function TrackingDetailPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const load = await getLoadByTrackingCode(code)

  if (!load) {
    notFound()
  }

  const isActive = !['DELIVERED', 'COMPLETED', 'DENIED'].includes(load.status)

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="glass sticky top-0 z-50 border-b border-white/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3">
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
            </Link>
            <Link
              href="/track"
              className="text-gray-700 hover:text-primary-600 transition-base font-medium"
            >
              Track Another
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Tracking Code Header */}
        <div className="glass p-8 rounded-2xl mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Tracking Code</p>
              <h2 className="text-3xl font-bold text-primary-700 tracking-wider">
                {load.publicTrackingCode}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-4 py-2 rounded-lg font-semibold text-sm ${LOAD_STATUS_COLORS[load.status as keyof typeof LOAD_STATUS_COLORS] || 'bg-gray-100 text-gray-800'}`}>
                {LOAD_STATUS_LABELS[load.status as keyof typeof LOAD_STATUS_LABELS] || load.status}
              </span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mt-6 pt-6 border-t border-gray-200">
            <div>
              <p className="text-sm text-gray-600 mb-1">Service Type</p>
              <p className="font-semibold text-gray-800">{load.serviceType.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">From</p>
              <p className="font-semibold text-gray-800">
                {load.pickupFacility.city}, {load.pickupFacility.state}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">To</p>
              <p className="font-semibold text-gray-800">
                {load.dropoffFacility.city}, {load.dropoffFacility.state}
              </p>
            </div>
          </div>
        </div>

        {/* Driver Contact Info - Prominent display for SCHEDULED+ loads */}
        {load.driver && load.status !== 'REQUESTED' && load.status !== 'DENIED' && (
          <div className="glass p-6 rounded-2xl mb-6 border-2 border-primary-200 bg-gradient-to-r from-primary-50 to-blue-50">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Driver Contact</p>
                <p className="text-gray-900 font-medium text-lg">
                  {load.driver.firstName} {load.driver.lastName}
                  {load.driver.vehicleType && (
                    <span className="text-sm text-gray-600 ml-2">• {load.driver.vehicleType.replace(/_/g, ' ')}</span>
                  )}
                </p>
              </div>
              <a 
                href={`tel:${load.driver.phone}`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors shadow-md hover:shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Call {load.driver.phone}
              </a>
            </div>
          </div>
        )}

        {/* Tracking Timeline - Only visible after SCHEDULED status */}
        <div className="glass p-8 rounded-2xl mb-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-8">Tracking History</h3>

          {/* Show message if load is REQUESTED or DENIED (tracking not active yet) */}
          {load.status === 'REQUESTED' && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-700 font-semibold mb-2">Scheduling Request Received</p>
              <p className="text-gray-600 max-w-md mx-auto mb-6">
                Your scheduling request has been received. If we can accommodate it, a driver will call shortly to confirm availability and pricing. Tracking will be available once the delivery is scheduled.
              </p>
              {/* Driver Contact Info - Show if driver is assigned */}
              {load.driver && (
                <div className="max-w-md mx-auto mt-6 p-6 bg-blue-50 border-2 border-blue-200 rounded-xl">
                  <p className="text-sm font-semibold text-blue-900 mb-3">Driver Contact Information</p>
                  <p className="text-gray-800 font-medium mb-1">
                    {load.driver.firstName} {load.driver.lastName}
                  </p>
                  <a 
                    href={`tel:${load.driver.phone}`}
                    className="inline-flex items-center gap-2 text-blue-700 hover:text-blue-900 font-semibold text-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {load.driver.phone}
                  </a>
                  <p className="text-xs text-gray-600 mt-3">Call to confirm rate and scheduling details</p>
                </div>
              )}
            </div>
          )}

          {load.status === 'DENIED' && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-gray-700 font-semibold mb-2">Not Scheduled</p>
              <p className="text-gray-600 max-w-md mx-auto">
                This scheduling request could not be accommodated at this time. No tracking is available for unscheduled requests.
              </p>
            </div>
          )}

          {/* Show tracking timeline only for SCHEDULED status and beyond */}
          {load.status !== 'REQUESTED' && load.status !== 'DENIED' && (
            <>
              {load.trackingEvents.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-500">No tracking events yet. Check back soon!</p>
                </div>
              ) : (
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary-500 to-gray-200" />

              {/* Events */}
              <div className="space-y-8">
                {load.trackingEvents.map((event, index) => {
                  const isLatest = index === load.trackingEvents.length - 1

                  return (
                    <div key={event.id} className="relative pl-16">
                      {/* Timeline Dot */}
                      <div
                        className={`absolute left-0 w-12 h-12 rounded-full flex items-center justify-center ${
                          isLatest
                            ? 'bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg'
                            : 'bg-gray-300'
                        }`}
                      >
                        {isLatest ? (
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <div className="w-3 h-3 bg-white rounded-full" />
                        )}
                      </div>

                      {/* Event Content */}
                      <div className={`${isLatest ? 'glass' : 'bg-white/40 backdrop-blur-sm'} p-6 rounded-xl border ${isLatest ? 'border-primary-200' : 'border-gray-200'}`}>
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 mb-2">
                          <h4 className="text-lg font-bold text-gray-800">{event.label}</h4>
                          <span className="text-sm text-gray-600">{formatDateTime(event.createdAt)}</span>
                        </div>

                        {event.locationText && (
                          <p className="text-sm text-gray-600 flex items-center gap-2 mb-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {event.locationText}
                          </p>
                        )}

                        {event.description && (
                          <p className="text-gray-600">{event.description}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
              )}
            </>
          )}
        </div>

        {/* Shipment Details */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Pickup Details */}
          <div className="glass p-6 rounded-2xl">
            <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z" />
              </svg>
              Pickup Location
            </h4>
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-gray-800">{load.pickupFacility.name}</p>
              <p className="text-gray-600">{load.pickupFacility.addressLine1}</p>
              {load.pickupFacility.addressLine2 && (
                <p className="text-gray-600">{load.pickupFacility.addressLine2}</p>
              )}
              <p className="text-gray-600">
                {load.pickupFacility.city}, {load.pickupFacility.state} {load.pickupFacility.postalCode}
              </p>
              <p className="text-gray-600 pt-2 border-t border-gray-200">
                Contact: {load.pickupFacility.contactPhone}
              </p>
            </div>
          </div>

          {/* Delivery Details */}
          <div className="glass p-6 rounded-2xl">
            <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13l-3 3m0 0l-3-3m3 3V8m0 13a9 9 0 110-18 9 9 0 010 18z" />
              </svg>
              Delivery Location
            </h4>
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-gray-800">{load.dropoffFacility.name}</p>
              <p className="text-gray-600">{load.dropoffFacility.addressLine1}</p>
              {load.dropoffFacility.addressLine2 && (
                <p className="text-gray-600">{load.dropoffFacility.addressLine2}</p>
              )}
              <p className="text-gray-600">
                {load.dropoffFacility.city}, {load.dropoffFacility.state} {load.dropoffFacility.postalCode}
              </p>
              <p className="text-gray-600 pt-2 border-t border-gray-200">
                Contact: {load.dropoffFacility.contactPhone}
              </p>
            </div>
          </div>
        </div>

        {/* Documents */}
        {load.documents.length > 0 && (
          <div className="glass p-8 rounded-2xl">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Documents</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {load.documents.map((doc) => (
                <a
                  key={doc.id}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 rounded-xl bg-white/60 hover:bg-white/80 border border-gray-200 hover:border-primary-300 transition-base group"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 group-hover:text-primary-700 transition-base truncate">
                      {doc.title}
                    </p>
                    <p className="text-xs text-gray-500">{formatDate(doc.createdAt)}</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-base flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Additional Info */}
        <div className="glass p-6 rounded-2xl mt-8">
          <div className="text-center text-sm text-gray-600">
            <p>Need help with your shipment?</p>
            <p className="mt-2">
              Contact us at{' '}
              <a href="mailto:support@meddrop.com" className="text-primary-600 hover:text-primary-700 font-medium">
                support@meddrop.com
              </a>
              {' '}or reference tracking code <span className="font-mono font-semibold">{load.publicTrackingCode}</span>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
