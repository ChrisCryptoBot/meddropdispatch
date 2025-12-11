// Offline Storage Utility
// IndexedDB wrapper for storing data offline (signatures, photos, etc.)

interface OfflineItem {
  id: string
  type: 'signature' | 'photo' | 'document' | 'status_update'
  data: any
  loadRequestId: string
  timestamp: number
  synced: boolean
}

const DB_NAME = 'meddrop-offline'
const DB_VERSION = 1
const STORE_NAME = 'offline-items'

/**
 * Initialize IndexedDB
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
        store.createIndex('loadRequestId', 'loadRequestId', { unique: false })
        store.createIndex('synced', 'synced', { unique: false })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }
  })
}

/**
 * Store an item offline
 */
export async function storeOffline(item: Omit<OfflineItem, 'id' | 'synced' | 'timestamp'>): Promise<string> {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    const offlineItem: OfflineItem = {
      ...item,
      id: `${item.type}-${Date.now()}-${Math.random()}`,
      synced: false,
      timestamp: Date.now(),
    }

    return new Promise((resolve, reject) => {
      const request = store.add(offlineItem)
      request.onsuccess = () => resolve(offlineItem.id)
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('Error storing offline item:', error)
    throw error
  }
}

/**
 * Get all unsynced items
 */
export async function getUnsyncedItems(): Promise<OfflineItem[]> {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const index = store.index('synced')

    return new Promise((resolve, reject) => {
      const request = index.getAll(false)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('Error getting unsynced items:', error)
    return []
  }
}

/**
 * Get items for a specific load request
 */
export async function getItemsForLoad(loadRequestId: string): Promise<OfflineItem[]> {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const index = store.index('loadRequestId')

    return new Promise((resolve, reject) => {
      const request = index.getAll(loadRequestId)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('Error getting items for load:', error)
    return []
  }
}

/**
 * Mark an item as synced
 */
export async function markAsSynced(id: string): Promise<void> {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    const getRequest = store.get(id)
    getRequest.onsuccess = () => {
      const item = getRequest.result
      if (item) {
        item.synced = true
        store.put(item)
      }
    }
  } catch (error) {
    console.error('Error marking item as synced:', error)
  }
}

/**
 * Delete an item
 */
export async function deleteOfflineItem(id: string): Promise<void> {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    store.delete(id)
  } catch (error) {
    console.error('Error deleting offline item:', error)
  }
}

/**
 * Clear all synced items (cleanup)
 */
export async function clearSyncedItems(): Promise<void> {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const index = store.index('synced')

    const request = index.openCursor(IDBKeyRange.only(true))
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      }
    }
  } catch (error) {
    console.error('Error clearing synced items:', error)
  }
}

/**
 * Sync all unsynced items to server
 */
export async function syncOfflineItems(): Promise<{ success: number; failed: number }> {
  const items = await getUnsyncedItems()
  let success = 0
  let failed = 0

  for (const item of items) {
    try {
      // Attempt to sync based on item type
      let response: Response | null = null

      if (item.type === 'signature') {
        // Sync signature
        response = await fetch(`/api/load-requests/${item.loadRequestId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: item.data.status,
            [item.data.signatureType === 'pickup' ? 'pickupSignature' : 'deliverySignature']: item.data.signature,
          }),
        })
      } else if (item.type === 'photo' || item.type === 'document') {
        // Sync document
        const formData = new FormData()
        formData.append('file', item.data.file)
        formData.append('type', item.data.type)
        formData.append('title', item.data.title)

        response = await fetch(`/api/load-requests/${item.loadRequestId}/documents`, {
          method: 'POST',
          body: formData,
        })
      } else if (item.type === 'status_update') {
        // Sync status update
        response = await fetch(`/api/load-requests/${item.loadRequestId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data),
        })
      }

      if (response && response.ok) {
        await markAsSynced(item.id)
        success++
      } else {
        failed++
      }
    } catch (error) {
      console.error('Error syncing item:', error)
      failed++
    }
  }

  return { success, failed }
}

/**
 * Check if we're online
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine
}

/**
 * Listen for online/offline events
 */
export function onOnlineStatusChange(callback: (online: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {}

  const handleOnline = () => callback(true)
  const handleOffline = () => callback(false)

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}


