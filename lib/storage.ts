// LocalStorage Utilities - Type-safe storage abstraction

/**
 * Type-safe localStorage operations
 * Provides a consistent interface for storing and retrieving data
 */

export class Storage {
  private static prefix = 'meddrop_'

  /**
   * Get item from localStorage with type safety
   */
  static getItem<T>(key: string): T | null {
    if (typeof window === 'undefined') return null
    
    try {
      const item = localStorage.getItem(this.prefix + key)
      if (!item) return null
      return JSON.parse(item) as T
    } catch (error) {
      console.error(`Error reading from localStorage (${key}):`, error)
      return null
    }
  }

  /**
   * Set item in localStorage with type safety
   */
  static setItem<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value))
    } catch (error) {
      console.error(`Error writing to localStorage (${key}):`, error)
    }
  }

  /**
   * Remove item from localStorage
   */
  static removeItem(key: string): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(this.prefix + key)
  }

  /**
   * Clear all meddrop-related items from localStorage
   */
  static clear(): void {
    if (typeof window === 'undefined') return
    
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key)
      }
    })
  }
}

// Convenience functions for common use cases
export const getDriver = () => Storage.getItem<any>('driver')
export const setDriver = (driver: any) => Storage.setItem('driver', driver)
export const removeDriver = () => Storage.removeItem('driver')

export const getShipper = () => Storage.getItem<any>('shipper')
export const setShipper = (shipper: any) => Storage.setItem('shipper', shipper)
export const removeShipper = () => Storage.removeItem('shipper')

export const getAdmin = () => Storage.getItem<any>('admin')
export const setAdmin = (admin: any) => Storage.setItem('admin', admin)
export const removeAdmin = () => Storage.removeItem('admin')




