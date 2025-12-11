// Application Constants
// Centralized constants for status labels, colors, and configuration

import type { LoadStatus, TrackingEventCode, DriverDenialReason } from './types'

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

// Payment terms labels
export const PAYMENT_TERMS_LABELS: Record<string, string> = {
  NET_7: 'Net 7 Days',
  NET_14: 'Net 14 Days',
  NET_30: 'Net 30 Days',
  NET_60: 'Net 60 Days',
  INVOICE_ONLY: 'Invoice Only (No Auto-Pay)',
}

// Client type labels
export const CLIENT_TYPE_LABELS: Record<string, string> = {
  INDEPENDENT_PHARMACY: 'Independent Pharmacy',
  CLINIC: 'Clinic',
  LAB: 'Laboratory',
  DIALYSIS_CENTER: 'Dialysis Center',
  IMAGING_CENTER: 'Imaging Center',
  HOSPITAL: 'Hospital',
  GOVERNMENT: 'Government Facility',
  OTHER: 'Other',
}

// Facility type labels
export const FACILITY_TYPE_LABELS: Record<string, string> = {
  CLINIC: 'Clinic',
  LAB: 'Laboratory',
  HOSPITAL: 'Hospital',
  PHARMACY: 'Pharmacy',
  DIALYSIS: 'Dialysis Center',
  IMAGING: 'Imaging Center',
  GOVERNMENT: 'Government Facility',
  OTHER: 'Other',
}

// Service type labels
export const SERVICE_TYPE_LABELS: Record<string, string> = {
  STAT: 'STAT (Urgent)',
  SAME_DAY: 'Same Day',
  SCHEDULED_ROUTE: 'Scheduled Route',
  OVERFLOW: 'Overflow',
  GOVERNMENT: 'Government',
}

// Vehicle type labels
export const VEHICLE_TYPE_LABELS: Record<string, string> = {
  SEDAN: 'Sedan',
  SUV: 'SUV',
  VAN: 'Van',
  SPRINTER: 'Sprinter Van',
  BOX_TRUCK: 'Box Truck',
  REFRIGERATED: 'Refrigerated Vehicle',
}

// Driver status labels
export const DRIVER_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Available',
  ON_ROUTE: 'On Route',
  OFF_DUTY: 'Off Duty',
  INACTIVE: 'Inactive',
}

// Invoice status labels
export const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled',
}

// Routes that don't require authentication
export const PUBLIC_ROUTES = [
  '/',
  '/request-load',
  '/track',
  '/driver/login',
  '/driver/signup',
  '/shipper/login',
  '/shipper/signup',
  '/admin/login',
]

// Routes that are auth pages (shouldn't redirect if already logged in)
export const AUTH_ROUTES = [
  '/driver/login',
  '/driver/signup',
  '/shipper/login',
  '/shipper/signup',
  '/admin/login',
]

