// Shared TypeScript Types and Interfaces

import {
  LoadRequest,
  TrackingEvent,
  Document,
  Shipper,
  Facility,
  User,
  Driver,
  LoadStatus,
  TrackingEventCode,
  DriverStatus,
  VehicleType
} from '@prisma/client'

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

export type LoadRequestWithDriver = LoadRequest & {
  shipper: Shipper
  pickupFacility: Facility
  dropoffFacility: Facility
  driver: Driver | null
  trackingEvents: TrackingEvent[]
  documents: Document[]
}

// Status display configurations
export const LOAD_STATUS_LABELS: Record<LoadStatus, string> = {
  NEW: 'New Request',
  QUOTED: 'Quoted',
  QUOTE_ACCEPTED: 'Quote Accepted',
  SCHEDULED: 'Scheduled',
  PICKED_UP: 'Picked Up',
  IN_TRANSIT: 'In Transit',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

export const LOAD_STATUS_COLORS: Record<LoadStatus, string> = {
  NEW: 'bg-blue-100 text-blue-800',
  QUOTED: 'bg-purple-100 text-purple-800',
  QUOTE_ACCEPTED: 'bg-green-100 text-green-800',
  SCHEDULED: 'bg-cyan-100 text-cyan-800',
  PICKED_UP: 'bg-orange-100 text-orange-800',
  IN_TRANSIT: 'bg-yellow-100 text-yellow-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
}

// Tracking event configurations
export const TRACKING_EVENT_LABELS: Record<TrackingEventCode, string> = {
  REQUEST_RECEIVED: 'Request Received',
  PRICE_QUOTED: 'Price Quoted',
  SHIPPER_CONFIRMED: 'Shipper Confirmed',
  DRIVER_EN_ROUTE_PICKUP: 'Driver En Route to Pickup',
  PICKED_UP: 'Picked Up',
  IN_TRANSIT: 'In Transit',
  ARRIVED_AT_DESTINATION: 'Arrived at Destination',
  DELIVERED: 'Delivered',
  PAPERWORK_COMPLETED: 'Paperwork Completed',
  CANCELLED: 'Cancelled',
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

// Driver status configurations
export const DRIVER_STATUS_LABELS: Record<DriverStatus, string> = {
  AVAILABLE: 'Available',
  ON_ROUTE: 'On Route',
  OFF_DUTY: 'Off Duty',
  INACTIVE: 'Inactive',
}

export const DRIVER_STATUS_COLORS: Record<DriverStatus, string> = {
  AVAILABLE: 'bg-green-100 text-green-800',
  ON_ROUTE: 'bg-blue-100 text-blue-800',
  OFF_DUTY: 'bg-gray-100 text-gray-800',
  INACTIVE: 'bg-red-100 text-red-800',
}

// Vehicle type labels
export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  SEDAN: 'Sedan',
  SUV: 'SUV',
  VAN: 'Cargo Van',
  SPRINTER: 'Sprinter Van',
  BOX_TRUCK: 'Box Truck',
  REFRIGERATED: 'Refrigerated Vehicle',
}

// Driver load update interface
export interface DriverLoadUpdate {
  loadId: string
  status?: LoadStatus
  pickupSignature?: string
  pickupSignatureName?: string
  deliverySignature?: string
  deliverySignatureName?: string
  pickupTemperature?: number
  deliveryTemperature?: number
  photoUrl?: string
  notes?: string
}
