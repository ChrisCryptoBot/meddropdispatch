/**
 * Encryption utilities for sensitive data
 * Uses AES-256-GCM encryption for sensitive fields
 * 
 * IMPORTANT: In production, use environment variables for encryption keys
 * Never commit encryption keys to version control
 */

import crypto from 'crypto'

// Encryption algorithm
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16 // 16 bytes for AES
const SALT_LENGTH = 64 // 64 bytes for salt
const TAG_LENGTH = 16 // 16 bytes for GCM auth tag
const KEY_LENGTH = 32 // 32 bytes for AES-256

/**
 * Get encryption key from environment variable
 * Falls back to a default key in development (NOT SECURE FOR PRODUCTION)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY

  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY environment variable is required in production')
    }
    // Development fallback - DO NOT USE IN PRODUCTION
    console.warn('⚠️  WARNING: Using default encryption key. Set ENCRYPTION_KEY in production!')
    return crypto.scryptSync('default-dev-key-change-in-production', 'salt', KEY_LENGTH)
  }

  // Key should be 64 hex characters (32 bytes)
  if (key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)')
  }

  return Buffer.from(key, 'hex')
}

/**
 * Encrypt sensitive data
 * @param plaintext - Data to encrypt
 * @returns Encrypted data as base64 string (format: iv:salt:tag:encrypted)
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) {
    return ''
  }

  try {
    const key = getEncryptionKey()
    const iv = crypto.randomBytes(IV_LENGTH)
    const salt = crypto.randomBytes(SALT_LENGTH)

    // Derive key from master key and salt
    const derivedKey = crypto.scryptSync(key, salt, KEY_LENGTH)

    const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv)

    let encrypted = cipher.update(plaintext, 'utf8', 'base64')
    encrypted += cipher.final('base64')

    const tag = cipher.getAuthTag()

    // Format: iv:salt:tag:encrypted (all base64)
    return `${iv.toString('base64')}:${salt.toString('base64')}:${tag.toString('base64')}:${encrypted}`
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt data')
  }
}

/**
 * Decrypt sensitive data
 * @param encryptedData - Encrypted data as base64 string (format: iv:salt:tag:encrypted)
 * @returns Decrypted plaintext
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) {
    return ''
  }

  try {
    const key = getEncryptionKey()
    const parts = encryptedData.split(':')

    if (parts.length !== 4) {
      throw new Error('Invalid encrypted data format')
    }

    const [ivBase64, saltBase64, tagBase64, encrypted] = parts

    const iv = Buffer.from(ivBase64, 'base64')
    const salt = Buffer.from(saltBase64, 'base64')
    const tag = Buffer.from(tagBase64, 'base64')

    // Derive key from master key and salt
    const derivedKey = crypto.scryptSync(key, salt, KEY_LENGTH)

    const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv)
    decipher.setAuthTag(tag)

    let decrypted = decipher.update(encrypted, 'base64', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error) {
    console.error('Decryption error:', error)
    throw new Error('Failed to decrypt data')
  }
}

/**
 * Check if a string is encrypted (has the expected format)
 */
export function isEncrypted(value: string): boolean {
  if (!value) return false
  const parts = value.split(':')
  return parts.length === 4 && parts.every(part => part.length > 0)
}

/**
 * Hash sensitive data for search/indexing (one-way, cannot be decrypted)
 * Use this for fields that need to be searchable but not readable
 */
export function hashForSearch(plaintext: string): string {
  if (!plaintext) return ''
  return crypto.createHash('sha256').update(plaintext).digest('hex')
}

