// Shared TypeScript Types and Interfaces

import {
  LoadRequest,
  TrackingEvent,
  Document,
  Shipper,
  Facility,
  User,
} from '@prisma/client'

// Type definitions (enums converted to strings for SQLite compatibility)
export type LoadStatus = 
  | 'REQUESTED'      // Initial status - shipper submitted scheduling request (no tracking yet)
  | 'SCHEDULED'      // Load scheduled after phone call agreement (tracking starts here)
  | 'EN_ROUTE'       // Driver en route to pickup
  | 'PICKED_UP'      // Load picked up
  | 'IN_TRANSIT'     // Load in transit to destination
  | 'DELIVERED'      // Load delivered
  | 'COMPLETED'      // Paperwork complete, closed
  | 'DENIED'         // Driver declined (doesn't fit schedule, no tracking)

export type TrackingEventCode =
  | 'REQUEST_RECEIVED'      // Shipper submitted scheduling request (no tracking yet)
  | 'SCHEDULED'             // Load scheduled after phone call (tracking starts here)
  | 'EN_ROUTE_PICKUP'       // Driver en route to pickup
  | 'PICKED_UP'             // Load picked up
  | 'IN_TRANSIT'            // Load in transit
  | 'ARRIVED_AT_DESTINATION'// Arrived at delivery location
  | 'DELIVERED'             // Load delivered
  | 'COMPLETED'             // Paperwork complete
  | 'DENIED'                // Driver declined (doesn't fit schedule, no tracking)

export type DriverDenialReason =
  | 'PRICE_TOO_LOW'
  | 'ROUTE_NOT_FEASIBLE'
  | 'TIMING_NOT_WORKABLE'
  | 'TOO_FAR'
  | 'EQUIPMENT_REQUIRED'
  | 'ALREADY_BOOKED'
  | 'OTHER'

// Extended types with relations
export type LoadRequestWithRelations = LoadRequest & {
  shipper: Shipper
  pickupFacility: Facility
  dropoffFacility: Facility
  trackingEvents: TrackingEvent[]
  documents: Document[]
}

export type LoadRequestWithBasicRelations = LoadRequest & {
  shipper: Shipper
  pickupFacility: Facility
  dropoffFacility: Facility
}

// Status display configurations moved to lib/constants.ts
// Import from '@/lib/constants' instead

// Form submission types
export interface LoadRequestFormData {
  // Shipper info
  companyName: string
  clientType: string
  contactName: string
  phone: string
  email: string
  preferredContactMethod: string

  // Pickup facility
  pickupFacilityName: string
  pickupFacilityType: string
  pickupAddressLine1: string
  pickupAddressLine2?: string
  pickupCity: string
  pickupState: string
  pickupPostalCode: string
  pickupContactName: string
  pickupContactPhone: string
  pickupAccessNotes?: string

  // Dropoff facility
  dropoffFacilityName: string
  dropoffFacilityType: string
  dropoffAddressLine1: string
  dropoffAddressLine2?: string
  dropoffCity: string
  dropoffState: string
  dropoffPostalCode: string
  dropoffContactName: string
  dropoffContactPhone: string
  dropoffAccessNotes?: string

  // Load details
  serviceType: string
  commodityDescription: string
  specimenCategory: string
  temperatureRequirement: string
  estimatedContainers?: number
  estimatedWeightKg?: number
  declaredValue?: number
  readyTime?: string
  deliveryDeadline?: string
  accessNotes?: string
}

export interface StatusUpdateData {
  status: LoadStatus
  eventCode?: TrackingEventCode
  eventLabel?: string
  eventDescription?: string
  locationText?: string
  quoteAmount?: number
  quoteNotes?: string
}
