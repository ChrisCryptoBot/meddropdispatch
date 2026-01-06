/**
 * Comprehensive Edge Case Validation Tests
 * Tests for all edge case validations in lib/edge-case-validations.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  validateLocationData,
  validateCommodityRequirements,
  validateQuoteAmount,
  validateDistance,
  validateSignature,
  validateTemperature,
  validateTemperatureRange,
  validateGPSTrackingPoint,
  validateStatusTransition,
  validatePasswordStrength,
  validatePhoneNumber,
  sanitizeInput,
  validateDocumentUpload,
  validateEmailAddress,
} from '@/lib/edge-case-validations'
import { ValidationError, ConflictError } from '@/lib/errors'

describe('Edge Case Validations - Section 1: Load Request Creation', () => {
  describe('validateLocationData', () => {
    it('should reject identical pickup and dropoff addresses', async () => {
      const data = {
        pickupAddressLine1: '123 Main St',
        pickupCity: 'Dallas',
        pickupState: 'TX',
        pickupPostalCode: '75201',
        dropoffAddressLine1: '123 Main St',
        dropoffCity: 'Dallas',
        dropoffState: 'TX',
        dropoffPostalCode: '75201',
        readyTime: null,
        deliveryDeadline: null,
      }

      await expect(validateLocationData(data as any)).rejects.toThrow(ValidationError)
    })

    it('should reject delivery deadline before ready time', async () => {
      const ready = new Date('2025-01-03T10:00:00Z')
      const deadline = new Date('2025-01-03T09:00:00Z')
      
      const data = {
        pickupAddressLine1: '123 Main St',
        pickupCity: 'Dallas',
        pickupState: 'TX',
        pickupPostalCode: '75201',
        dropoffAddressLine1: '456 Oak Ave',
        dropoffCity: 'Fort Worth',
        dropoffState: 'TX',
        dropoffPostalCode: '76102',
        readyTime: ready,
        deliveryDeadline: deadline,
      }

      await expect(validateLocationData(data as any)).rejects.toThrow(ValidationError)
    })

    it('should reject ready time in the past', async () => {
      const pastTime = new Date(Date.now() - 1000 * 60 * 60) // 1 hour ago
      const futureTime = new Date(Date.now() + 1000 * 60 * 60 * 2) // 2 hours from now
      
      const data = {
        pickupAddressLine1: '123 Main St',
        pickupCity: 'Dallas',
        pickupState: 'TX',
        pickupPostalCode: '75201',
        dropoffAddressLine1: '456 Oak Ave',
        dropoffCity: 'Fort Worth',
        dropoffState: 'TX',
        dropoffPostalCode: '76102',
        readyTime: pastTime,
        deliveryDeadline: futureTime,
      }

      await expect(validateLocationData(data as any)).rejects.toThrow(ValidationError)
    })
  })

  describe('validateCommodityRequirements', () => {
    it('should validate declared value within insurance limits', () => {
      expect(() => {
        validateCommodityRequirements('UN3373_CATEGORY_B', 'REFRIGERATED', 150000)
      }).toThrow(ValidationError)
    })

    it('should allow valid declared values', () => {
      expect(() => {
        validateCommodityRequirements('UN3373_CATEGORY_B', 'REFRIGERATED', 50000)
      }).not.toThrow()
    })
  })

  describe('validateQuoteAmount', () => {
    it('should reject negative quote amounts', () => {
      expect(() => validateQuoteAmount(-10, 'STAT')).toThrow(ValidationError)
    })

    it('should reject $0.00 quotes', () => {
      expect(() => validateQuoteAmount(0, 'STAT')).toThrow(ValidationError)
    })

    it('should reject quotes outside acceptable range', () => {
      expect(() => validateQuoteAmount(2000000, 'STAT')).toThrow(ValidationError)
    })

    it('should accept valid quote amounts', () => {
      expect(() => validateQuoteAmount(50.00, 'STAT')).not.toThrow()
    })
  })

  describe('validateDistance', () => {
    it('should handle distance = 0 miles', () => {
      expect(validateDistance(0)).toBe(0)
    })

    it('should flag distances > 500 miles but allow them', () => {
      const consoleSpy = vi.spyOn(console, 'warn')
      validateDistance(600)
      expect(consoleSpy).toHaveBeenCalled()
    })

    it('should reject negative distances', () => {
      expect(() => validateDistance(-10)).toThrow(ValidationError)
    })
  })
})

describe('Edge Case Validations - Section 4: Pickup Execution', () => {
  describe('validateSignature', () => {
    it('should require signature or unavailability reason', () => {
      expect(() => {
        validateSignature(null, null)
      }).toThrow(ValidationError)
    })

    it('should require reason when signature unavailable', () => {
      expect(() => {
        validateSignature(null, null, '')
      }).toThrow(ValidationError)
    })

    it('should require signer name with signature', () => {
      expect(() => {
        validateSignature('data:image/png;base64,abc123', null)
      }).toThrow(ValidationError)
    })

    it('should validate signature format', () => {
      expect(() => {
        validateSignature('invalid-format', 'John Doe')
      }).toThrow(ValidationError)
    })

    it('should reject signatures that are too small', () => {
      expect(() => {
        validateSignature('data:image/png;base64,ab', 'John Doe')
      }).toThrow(ValidationError)
    })
  })

  describe('validateTemperature', () => {
    it('should require temperature when required', () => {
      expect(() => {
        validateTemperature(null, 'REFRIGERATED', true)
      }).toThrow(ValidationError)
    })

    it('should reject temperatures outside valid range', () => {
      expect(() => {
        validateTemperature(-100, 'REFRIGERATED', true)
      }).toThrow(ValidationError)

      expect(() => {
        validateTemperature(100, 'REFRIGERATED', true)
      }).toThrow(ValidationError)
    })

    it('should reject obviously invalid temperatures', () => {
      expect(() => {
        validateTemperature(-999, 'REFRIGERATED', true)
      }).toThrow(ValidationError)
    })
  })

  describe('validateTemperatureRange', () => {
    it('should flag temperatures below minimum', () => {
      const result = validateTemperatureRange(5, 8, 15)
      expect(result.inRange).toBe(false)
      expect(result.message).toContain('below minimum')
    })

    it('should flag temperatures above maximum', () => {
      const result = validateTemperatureRange(20, 8, 15)
      expect(result.inRange).toBe(false)
      expect(result.message).toContain('above maximum')
    })

    it('should accept temperatures in range', () => {
      const result = validateTemperatureRange(10, 8, 15)
      expect(result.inRange).toBe(true)
    })
  })
})

describe('Edge Case Validations - Section 5: In-Transit Monitoring', () => {
  describe('validateGPSTrackingPoint', () => {
    it('should reject invalid latitude', () => {
      expect(() => {
        validateGPSTrackingPoint(100, 0)
      }).toThrow(ValidationError)

      expect(() => {
        validateGPSTrackingPoint(-100, 0)
      }).toThrow(ValidationError)
    })

    it('should reject invalid longitude', () => {
      expect(() => {
        validateGPSTrackingPoint(0, 200)
      }).toThrow(ValidationError)

      expect(() => {
        validateGPSTrackingPoint(0, -200)
      }).toThrow(ValidationError)
    })

    it('should warn about low accuracy GPS points', () => {
      const consoleSpy = vi.spyOn(console, 'warn')
      validateGPSTrackingPoint(32.7767, -96.7970, 1500)
      expect(consoleSpy).toHaveBeenCalled()
    })

    it('should reject future timestamps', () => {
      const future = new Date(Date.now() + 1000 * 60 * 60)
      expect(() => {
        validateGPSTrackingPoint(32.7767, -96.7970, 50, future)
      }).toThrow(ValidationError)
    })
  })
})

describe('Edge Case Validations - Section 15: Authentication & Security', () => {
  describe('validatePasswordStrength', () => {
    it('should reject passwords shorter than 8 characters', () => {
      expect(() => {
        validatePasswordStrength('Short1!')
      }).toThrow(ValidationError)
    })

    it('should reject passwords without uppercase letter', () => {
      expect(() => {
        validatePasswordStrength('password123!')
      }).toThrow(ValidationError)
    })

    it('should reject passwords without lowercase letter', () => {
      expect(() => {
        validatePasswordStrength('PASSWORD123!')
      }).toThrow(ValidationError)
    })

    it('should reject passwords without number', () => {
      expect(() => {
        validatePasswordStrength('Password!')
      }).toThrow(ValidationError)
    })

    it('should reject passwords without special character', () => {
      expect(() => {
        validatePasswordStrength('Password123')
      }).toThrow(ValidationError)
    })

    it('should reject common patterns', () => {
      expect(() => {
        validatePasswordStrength('Password123!')
      }).toThrow() // 'password' is in common patterns

      expect(() => {
        validatePasswordStrength('MedDrop123!')
      }).toThrow() // 'meddrop' is in common patterns
    })

    it('should accept strong passwords', () => {
      expect(() => {
        validatePasswordStrength('MyStr0ng!P@ssw0rd')
      }).not.toThrow()
    })
  })

  describe('validateEmailAddress', () => {
    it('should reject invalid email formats', () => {
      expect(() => validateEmailAddress('invalid')).toThrow(ValidationError)
      expect(() => validateEmailAddress('invalid@')).toThrow(ValidationError)
      expect(() => validateEmailAddress('@example.com')).toThrow(ValidationError)
      expect(() => validateEmailAddress('test..test@example.com')).toThrow(ValidationError)
    })

    it('should accept valid email addresses', () => {
      expect(() => validateEmailAddress('test@example.com')).not.toThrow()
      expect(() => validateEmailAddress('user.name@domain.co.uk')).not.toThrow()
    })
  })
})

describe('Edge Case Validations - Section 21: UI/UX Validation', () => {
  describe('sanitizeInput', () => {
    it('should trim whitespace', () => {
      expect(sanitizeInput('  test  ')).toBe('test')
      expect(sanitizeInput('\ttest\n')).toBe('test')
    })
  })

  describe('validatePhoneNumber', () => {
    it('should reject phone numbers with less than 10 digits', () => {
      expect(() => validatePhoneNumber('123')).toThrow(ValidationError)
      expect(() => validatePhoneNumber('123456789')).toThrow(ValidationError)
    })

    it('should format 10-digit US numbers correctly', () => {
      expect(validatePhoneNumber('2145551234')).toBe('+12145551234')
      expect(validatePhoneNumber('(214) 555-1234')).toBe('+12145551234')
      expect(validatePhoneNumber('214-555-1234')).toBe('+12145551234')
    })

    it('should handle 11-digit numbers with country code', () => {
      expect(validatePhoneNumber('12145551234')).toBe('+12145551234')
    })
  })

  describe('validateDocumentUpload', () => {
    it('should reject files larger than 10MB', () => {
      const largeFile = {
        size: 11 * 1024 * 1024,
        type: 'application/pdf',
      } as File

      expect(() => {
        validateDocumentUpload(largeFile, largeFile.size, largeFile.type)
      }).toThrow(ValidationError)
    })

    it('should reject invalid MIME types', () => {
      const file = {
        size: 1024,
        type: 'application/octet-stream',
      } as File

      expect(() => {
        validateDocumentUpload(file, file.size, file.type)
      }).toThrow(ValidationError)
    })

    it('should accept valid document types', () => {
      const pdfFile = {
        size: 1024,
        type: 'application/pdf',
      } as File

      expect(() => {
        validateDocumentUpload(pdfFile, pdfFile.size, pdfFile.type)
      }).not.toThrow()

      const imageFile = {
        size: 1024,
        type: 'image/jpeg',
      } as File

      expect(() => {
        validateDocumentUpload(imageFile, imageFile.size, imageFile.type)
      }).not.toThrow()
    })
  })
})



