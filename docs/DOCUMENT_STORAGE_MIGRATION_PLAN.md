# Document Storage Migration Plan - Base64 to Vercel Blob

**Status:** Critical Priority - Must be completed before production launch  
**Current Issue:** Documents stored as Base64 strings in database (performance/scalability risk)  
**Target:** Migrate to Vercel Blob Storage

---

## Current State

### Problem
- Documents stored as Base64 data URLs in `Document.url` field
- A 5MB PDF becomes ~7MB of text in database
- Database bloat, slow backups, expensive storage
- Performance degradation as document count grows

### Current Implementation
- **File:** `app/api/load-requests/[id]/documents/route.ts`
- **Storage:** Base64 string in `prisma.document.url` field
- **Format:** `data:${mimeType};base64,${base64String}`

---

## Migration Strategy

### Phase 1: Setup Vercel Blob Storage

1. **Install Vercel Blob SDK**
   ```bash
   npm install @vercel/blob
   ```

2. **Add Environment Variable**
   ```env
   BLOB_READ_WRITE_TOKEN=vercel_blob_xxx...
   ```
   Get token from: Vercel Dashboard → Project → Storage → Blob → Create Token

3. **Create Blob Storage Utility**
   - Create `lib/blob-storage.ts` with upload/download functions
   - Handle migration from base64 to blob URLs
   - Maintain backward compatibility during migration

### Phase 2: Update Document Upload Endpoint

**File:** `app/api/load-requests/[id]/documents/route.ts`

**Changes:**
1. Replace Base64 conversion with Vercel Blob upload
2. Store blob URL in `Document.url` field
3. Keep `Document.fileSize`, `Document.mimeType`, `Document.fileHash` for metadata
4. Add `Document.blobId` field (optional, for direct blob reference)

### Phase 3: Migration Script

Create migration script to:
1. Read all existing documents from database
2. Upload Base64 data to Vercel Blob
3. Update `Document.url` with blob URL
4. Track migration progress (batch processing)
5. Handle failures gracefully (retry logic)

### Phase 4: Update Document Retrieval

**Files to update:**
- `app/api/load-requests/[id]/documents/[documentId]/route.ts`
- Any frontend components that display documents

**Changes:**
1. If URL is blob URL, serve directly (Vercel Blob handles CDN)
2. If URL is old base64 format, migrate on-the-fly (lazy migration)
3. Update frontend to use blob URLs directly

---

## Implementation Details

### Database Schema Changes

**Option 1: Add new field (recommended)**
```prisma
model Document {
  // ... existing fields
  url          String  // Keep for backward compatibility
  blobUrl      String? // New field for blob storage URL
  blobId       String? // Optional: Vercel blob ID for direct access
  migratedAt   DateTime? // Track when migrated
}
```

**Option 2: Replace field (cleaner, but requires migration)**
```prisma
model Document {
  // ... existing fields
  url          String  // Now stores blob URL instead of base64
  blobId       String? // Optional: Vercel blob ID
}
```

### Blob Storage Utility (`lib/blob-storage.ts`)

```typescript
import { put, head, del } from '@vercel/blob'

export async function uploadDocument(
  file: File | Buffer,
  filename: string,
  contentType: string
): Promise<{ url: string; blobId: string }> {
  const blob = await put(filename, file, {
    access: 'public',
    contentType,
  })
  
  return {
    url: blob.url,
    blobId: blob.pathname, // or blob.id if available
  }
}

export async function deleteDocument(blobUrl: string): Promise<void> {
  // Extract blob ID from URL and delete
  await del(blobUrl)
}
```

### Migration Script (`scripts/migrate-documents-to-blob.ts`)

```typescript
// Batch process documents
// Upload to blob storage
// Update database records
// Track progress and handle errors
```

---

## Rollback Plan

If migration fails:
1. Keep old base64 storage working
2. New uploads can fall back to base64 if blob fails
3. Migration script can be re-run safely (idempotent)

---

## Performance Benefits

**Before (Base64 in DB):**
- 5MB PDF = ~7MB database row
- Slow queries (large text fields)
- Expensive database storage (~$0.10/GB/month)
- Slow backups (entire DB includes all documents)

**After (Vercel Blob):**
- 5MB PDF = ~200 bytes (just URL)
- Fast queries (small text field)
- Cheap blob storage (~$0.15/GB/month, but only for active documents)
- Fast backups (DB is small, documents separate)
- CDN delivery (faster downloads)

---

## Timeline

1. **Week 1:** Setup Vercel Blob, create utility functions
2. **Week 2:** Update upload endpoint, test thoroughly
3. **Week 3:** Create and test migration script
4. **Week 4:** Run migration in production (off-peak hours)
5. **Week 5:** Monitor and optimize

---

## Critical Notes

- **DO NOT** delete old base64 data until migration is 100% complete
- Test migration script on staging/dev database first
- Run migration during low-traffic periods
- Monitor blob storage costs
- Keep migration script for future use (new documents may still be base64 during transition)

---

## Next Steps

1. Install `@vercel/blob` package
2. Create `lib/blob-storage.ts` utility
3. Update `app/api/load-requests/[id]/documents/route.ts` POST handler
4. Create migration script
5. Test on staging environment
6. Schedule production migration











