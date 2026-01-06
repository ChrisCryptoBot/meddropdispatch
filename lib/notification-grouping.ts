/**
 * Notification Grouping Utilities
 * Groups notifications by type and date for better organization
 */

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  isRead: boolean
  readAt: string | null
  createdAt: string
  metadata: any
  loadRequest: {
    id: string
    publicTrackingCode: string
    status: string
  } | null
}

export type GroupBy = 'type' | 'date' | 'none'

export interface NotificationGroup {
  key: string
  label: string
  notifications: Notification[]
  unreadCount: number
  isCollapsed: boolean
}

/**
 * Get notification type label
 */
export function getNotificationTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    LOAD_ASSIGNED: 'Load Assignments',
    LOAD_STATUS_CHANGED: 'Status Updates',
    QUOTE_RECEIVED: 'Quotes',
    DOCUMENT_UPLOADED: 'Documents',
    CALLBACK_REQUESTED: 'Callback Requests',
    CALLBACK_CALLED: 'Callback Updates',
    PAYMENT_RECEIVED: 'Payments',
    SYSTEM: 'System Notifications',
    OTHER: 'Other',
  }
  return labels[type] || type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
}

/**
 * Get date label for grouping
 */
export function getDateLabel(date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const thisWeek = new Date(today)
  thisWeek.setDate(thisWeek.getDate() - 7)
  const thisMonth = new Date(today)
  thisMonth.setMonth(thisMonth.getMonth() - 1)

  const notificationDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (notificationDate.getTime() === today.getTime()) {
    return 'Today'
  } else if (notificationDate.getTime() === yesterday.getTime()) {
    return 'Yesterday'
  } else if (date >= thisWeek) {
    return 'This Week'
  } else if (date >= thisMonth) {
    return 'This Month'
  } else {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }
}

/**
 * Group notifications by type
 */
export function groupByType(notifications: Notification[]): NotificationGroup[] {
  const groups = new Map<string, Notification[]>()
  
  notifications.forEach((notification) => {
    const type = notification.type || 'OTHER'
    if (!groups.has(type)) {
      groups.set(type, [])
    }
    groups.get(type)!.push(notification)
  })

  return Array.from(groups.entries())
    .map(([type, notifs]) => {
      const sorted = notifs.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      return {
        key: `type-${type}`,
        label: getNotificationTypeLabel(type),
        notifications: sorted,
        unreadCount: sorted.filter((n) => !n.isRead).length,
        isCollapsed: false,
      }
    })
    .sort((a, b) => {
      // Sort by unread count (descending), then by label
      if (a.unreadCount !== b.unreadCount) {
        return b.unreadCount - a.unreadCount
      }
      return a.label.localeCompare(b.label)
    })
}

/**
 * Group notifications by date
 */
export function groupByDate(notifications: Notification[]): NotificationGroup[] {
  const groups = new Map<string, Notification[]>()
  
  notifications.forEach((notification) => {
    const date = new Date(notification.createdAt)
    const label = getDateLabel(date)
    
    if (!groups.has(label)) {
      groups.set(label, [])
    }
    groups.get(label)!.push(notification)
  })

  // Define date order
  const dateOrder: Record<string, number> = {
    'Today': 0,
    'Yesterday': 1,
    'This Week': 2,
    'This Month': 3,
  }

  return Array.from(groups.entries())
    .map(([label, notifs]) => {
      const sorted = notifs.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      return {
        key: `date-${label}`,
        label,
        notifications: sorted,
        unreadCount: sorted.filter((n) => !n.isRead).length,
        isCollapsed: false,
      }
    })
    .sort((a, b) => {
      // Sort by date order
      const orderA = dateOrder[a.label] ?? 999
      const orderB = dateOrder[b.label] ?? 999
      if (orderA !== orderB) {
        return orderA - orderB
      }
      // If both are custom dates, sort by date (newest first)
      if (orderA === 999 && orderB === 999) {
        const dateA = new Date(a.notifications[0]?.createdAt || 0)
        const dateB = new Date(b.notifications[0]?.createdAt || 0)
        return dateB.getTime() - dateA.getTime()
      }
      return 0
    })
}

/**
 * Group notifications by both type and date (nested grouping)
 */
export function groupByTypeAndDate(notifications: Notification[]): NotificationGroup[] {
  // First group by type
  const typeGroups = groupByType(notifications)
  
  // Then group each type group by date
  return typeGroups.flatMap((typeGroup) => {
    const dateGroups = groupByDate(typeGroup.notifications)
    
    // If only one date group, return the type group as-is
    if (dateGroups.length === 1) {
      return [typeGroup]
    }
    
    // Otherwise, create nested structure
    return dateGroups.map((dateGroup) => ({
      key: `${typeGroup.key}-${dateGroup.key}`,
      label: `${typeGroup.label} - ${dateGroup.label}`,
      notifications: dateGroup.notifications,
      unreadCount: dateGroup.unreadCount,
      isCollapsed: false,
    }))
  })
}

/**
 * Group notifications based on groupBy option
 */
export function groupNotifications(
  notifications: Notification[],
  groupBy: GroupBy
): NotificationGroup[] | null {
  if (groupBy === 'none') {
    return null
  }
  
  if (groupBy === 'type') {
    return groupByType(notifications)
  }
  
  if (groupBy === 'date') {
    return groupByDate(notifications)
  }
  
  return null
}

