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

// Status display configurations
export const LOAD_STATUS_LABELS: Record<LoadStatus, string> = {
  REQUESTED: 'Scheduling Request',
  SCHEDULED: 'Scheduled',
  EN_ROUTE: 'En Route to Pickup',
  PICKED_UP: 'Picked Up',
  IN_TRANSIT: 'In Transit',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  DENIED: 'Not Scheduled',
}

export const LOAD_STATUS_COLORS: Record<LoadStatus, string> = {
  REQUESTED: 'bg-blue-100 text-blue-800',
  SCHEDULED: 'bg-cyan-100 text-cyan-800',
  EN_ROUTE: 'bg-purple-100 text-purple-800',
  PICKED_UP: 'bg-orange-100 text-orange-800',
  IN_TRANSIT: 'bg-yellow-100 text-yellow-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
  DENIED: 'bg-red-100 text-red-800',
}

// Tracking event configurations
export const TRACKING_EVENT_LABELS: Record<TrackingEventCode, string> = {
  REQUEST_RECEIVED: 'Scheduling Request Received',
  SCHEDULED: 'Scheduled',
  EN_ROUTE_PICKUP: 'En Route to Pickup',
  PICKED_UP: 'Picked Up',
  IN_TRANSIT: 'In Transit',
  ARRIVED_AT_DESTINATION: 'Arrived at Destination',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  DENIED: 'Not Scheduled',
}

export const DRIVER_DENIAL_REASON_LABELS: Record<DriverDenialReason, string> = {
  PRICE_TOO_LOW: 'Price Too Low',
  ROUTE_NOT_FEASIBLE: 'Route Not Feasible',
  TIMING_NOT_WORKABLE: 'Timing Not Workable',
  TOO_FAR: 'Too Far / Distance Issue',
  EQUIPMENT_REQUIRED: 'Equipment Required (Not Available)',
  ALREADY_BOOKED: 'Already Booked / Schedule Conflict',
  OTHER: 'Other Reason',
}

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
