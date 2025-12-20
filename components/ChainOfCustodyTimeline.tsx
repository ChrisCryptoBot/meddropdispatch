'use client'

export default function ChainOfCustodyTimeline() {
  return (
    <div className="max-w-5xl mx-auto mb-12">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
        {/* Step 1: Request */}
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-accent rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-medical">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h4 className="text-lg font-bold text-gray-900 mb-2">Request</h4>
          <p className="text-sm text-gray-600">Web/API</p>
        </div>

        {/* Connector */}
        <div className="hidden md:flex items-center justify-center -mx-4">
          <div className="w-full h-1 bg-gradient-to-r from-teal-400 via-teal-500 to-teal-600 rounded-full"></div>
        </div>

        {/* Step 2: Dispatch */}
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-accent rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-medical">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <h4 className="text-lg font-bold text-gray-900 mb-2">Dispatch</h4>
          <p className="text-sm text-gray-600">Smart Routing</p>
        </div>

        {/* Connector */}
        <div className="hidden md:flex items-center justify-center -mx-4">
          <div className="w-full h-1 bg-gradient-to-r from-teal-400 via-teal-500 to-teal-600 rounded-full"></div>
        </div>

        {/* Step 3: Pickup */}
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-accent rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-medical">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h4 className="text-lg font-bold text-gray-900 mb-2">Pickup</h4>
          <p className="text-sm text-gray-600">Temp Check + Scan</p>
        </div>

        {/* Connector */}
        <div className="hidden md:flex items-center justify-center -mx-4">
          <div className="w-full h-1 bg-gradient-to-r from-teal-400 via-teal-500 to-teal-600 rounded-full"></div>
        </div>

        {/* Step 4: Delivery */}
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-accent rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-medical">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h4 className="text-lg font-bold text-gray-900 mb-2">Delivery</h4>
          <p className="text-sm text-gray-600">Photo + Signature</p>
        </div>
      </div>
    </div>
  )
}

