// Application Constants
// Centralized constants for status labels, colors, and configuration

import type { LoadStatus, TrackingEventCode, DriverDenialReason } from './types'

// Status display configurations
export const LOAD_STATUS_LABELS: Record<LoadStatus, string> = {
  QUOTE_REQUESTED: 'Quote Requested',
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
  QUOTE_REQUESTED: 'bg-amber-100 text-amber-800',
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
  CRITICAL_STAT: 'Critical STAT (Immediate)',
  ROUTINE: 'Routine',
  SAME_DAY: 'Same Day',
  SCHEDULED_ROUTE: 'Scheduled Route',
  OVERFLOW: 'Overflow',
  GOVERNMENT: 'Government',
  OTHER: 'Other',
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

// Rate calculation constants - DFW Market Rates
// Based on target rates per mile (Total Miles = Deadhead + Loaded)
export const RATE_CONFIG = {
  // Base rate per mile by service type (DFW market rates)
  RATE_PER_MILE: {
    ROUTINE: {
      min: 1.75,
      target: 2.00, // Standard rate for routine loads
      max: 2.25,
      minimumThreshold: 1.60, // Below this, losing money long-term
    },
    STAT: {
      min: 2.50,
      target: 3.00, // Premium for urgent, time-sensitive
      max: 3.50,
    },
    CRITICAL_STAT: {
      min: 3.75,
      target: 4.50, // Highest rate for immediate, no-stops
      max: 5.00,
    },
    SAME_DAY: {
      min: 1.75,
      target: 2.00, // Same as routine
      max: 2.25,
    },
    SCHEDULED_ROUTE: {
      min: 1.75,
      target: 2.00, // Same as routine
      max: 2.25,
    },
    OVERFLOW: {
      min: 1.75,
      target: 2.00, // Same as routine
      max: 2.25,
    },
    GOVERNMENT: {
      min: 1.75,
      target: 2.00, // Same as routine
      max: 2.25,
    },
    OTHER: {
      min: 1.75,
      target: 2.00, // Default to routine
      max: 2.25,
    },
  },
  
  // After-hours/weekend/holiday surcharges
  AFTER_HOURS_SURCHARGE: {
    perMile: {
      min: 0.25,
      target: 0.50,
      max: 0.75,
    },
    flatFee: {
      min: 20,
      target: 30,
      max: 40,
    },
    // Use flat fee for shorter distances, per-mile for longer
    flatFeeThreshold: 50, // Use flat fee if distance < 50 miles
  },
  
  // Business hours (for after-hours detection)
  BUSINESS_HOURS: {
    start: 8, // 8 AM
    end: 18, // 6 PM
    days: [1, 2, 3, 4, 5], // Monday-Friday (0 = Sunday, 6 = Saturday)
  },
  
  // US Federal Holidays (for holiday detection)
  FEDERAL_HOLIDAYS: [
    '01-01', // New Year's Day
    '07-04', // Independence Day
    '12-25', // Christmas
    '11-11', // Veterans Day
    '10-12', // Columbus Day
    '09-01', // Labor Day (first Monday, simplified)
    '05-31', // Memorial Day (last Monday, simplified)
    '02-15', // Presidents Day (third Monday, simplified)
    '01-19', // Martin Luther King Jr. Day (third Monday, simplified)
    '11-26', // Thanksgiving (fourth Thursday, simplified)
  ],
  
  // Legacy support (for backward compatibility)
  BASE_RATE: parseFloat(process.env.BASE_RATE || '25.00'),
  PER_MILE_RATE: parseFloat(process.env.PER_MILE_RATE || '2.00'), // Default to routine rate
  MINIMUM_RATE: parseFloat(process.env.MINIMUM_RATE || '30.00'),
  SERVICE_MULTIPLIERS: {
    STAT: 1.5,
    SAME_DAY: 1.2,
    SCHEDULED_ROUTE: 1.0,
    OVERFLOW: 1.1,
    GOVERNMENT: 1.0,
  },
  RATE_RANGE_MIN_PERCENT: 0.95, // 5% below suggested rate
  RATE_RANGE_MAX_PERCENT: 1.10, // 10% above suggested rate
}



