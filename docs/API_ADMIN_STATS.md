# Admin Stats API Endpoint

## Endpoint
`GET /api/admin/stats`

## Description
Provides comprehensive dashboard statistics for the admin panel, including load counts, revenue metrics, and recent quote requests.

## Response Format

```json
{
  "todayLoads": 15,
  "todayLoadsChange": 25.0,
  "activeLoads": 8,
  "pendingQuotes": 3,
  "completedToday": 5,
  "completedChange": -10.0,
  "revenueToday": 1250.50,
  "revenueYesterday": 1000.00,
  "revenueChange": 25.0,
  "statusBreakdown": {
    "QUOTE_REQUESTED": 2,
    "SCHEDULED": 5,
    "IN_TRANSIT": 3,
    "DELIVERED": 4,
    "COMPLETED": 1
  },
  "recentQuoteRequests": [
    {
      "id": "clx...",
      "trackingCode": "SHIPPER-241211-001",
      "shipper": {
        "id": "clx...",
        "companyName": "ABC Medical",
        "email": "contact@abc.com",
        "phone": "+1234567890"
      },
      "route": "New York, NY → Boston, MA",
      "distance": 215.5,
      "suggestedRate": {
        "min": 350.00,
        "max": 385.00
      },
      "createdAt": "2024-12-11T10:30:00.000Z"
    }
  ],
  "generatedAt": "2024-12-11T15:45:00.000Z"
}
```

## Metrics Explained

### Main Stats
- **todayLoads**: Count of loads created today
- **todayLoadsChange**: Percentage change from yesterday (rounded to 1 decimal)
- **activeLoads**: Count of loads currently in progress (REQUESTED, QUOTE_REQUESTED, SCHEDULED, EN_ROUTE, PICKED_UP, IN_TRANSIT)
- **pendingQuotes**: Count of loads with QUOTE_REQUESTED status
- **completedToday**: Count of loads completed (DELIVERED or COMPLETED) today
- **completedChange**: Percentage change in completions from yesterday

### Revenue Stats
- **revenueToday**: Total revenue from completed loads today (sum of quoteAmount)
- **revenueYesterday**: Total revenue from completed loads yesterday
- **revenueChange**: Percentage change in revenue from yesterday

### Additional Data
- **statusBreakdown**: Object mapping status to count for today's loads
- **recentQuoteRequests**: Array of the 5 most recent quote requests (for dashboard widgets)
- **generatedAt**: ISO timestamp of when the stats were generated

## Usage Example

```typescript
// In a React component
const fetchDashboardStats = async () => {
  try {
    const response = await fetch('/api/admin/stats')
    if (response.ok) {
      const stats = await response.json()
      setStats({
        todayLoads: stats.todayLoads,
        activeLoads: stats.activeLoads,
        pendingQuotes: stats.pendingQuotes,
        completedToday: stats.completedToday,
      })
    }
  } catch (error) {
    console.error('Error fetching stats:', error)
  }
}
```

## Notes
- All percentage changes are calculated relative to yesterday's values
- Revenue calculations only include loads with a non-null `quoteAmount`
- Completed loads are determined by tracking events or updatedAt timestamp
- The endpoint uses parallel queries for optimal performance

