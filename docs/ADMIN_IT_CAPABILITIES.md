# Admin IT Capabilities - Complete Guide

## Overview

As the sole developer using Cursor AI, you need comprehensive IT tools to diagnose and fix issues when shippers report problems. This document outlines all admin IT capabilities available in the system.

## Available IT Tools

### 1. **System Logs** (`/driver/admin/logs`)
**Purpose:** View real-time system errors, warnings, and diagnostic information

**Features:**
- Filter by log level (ERROR, WARN, INFO, DEBUG)
- Search log messages
- View error details and metadata
- See which user triggered errors
- Timestamp tracking

**Use Cases:**
- When a shipper reports "Internal Server Error" - check logs to see the exact error
- Debug API failures
- Monitor system health
- Track error patterns

**Access:** Admin mode enabled → System Logs

---

### 2. **Audit Logs** (`/driver/admin/audit`)
**Purpose:** Complete audit trail of all system actions

**Features:**
- Filter by action type (LOGIN, CREATE, UPDATE, DELETE, etc.)
- Filter by entity type (LOAD_REQUEST, DRIVER, SHIPPER, INVOICE, etc.)
- Filter by severity (CRITICAL, ERROR, WARNING, INFO)
- Filter by success/failure
- Search by user email, action, or entity
- View IP addresses and user agents
- See change logs (what changed, from/to values)

**Use Cases:**
- See what actions a shipper performed before reporting an issue
- Track who made changes to loads/invoices
- Investigate security incidents
- Compliance auditing
- Debug workflow issues

**Access:** Admin mode enabled → Audit Logs

---

### 3. **User Activity** (`/driver/admin/users`)
**Purpose:** View all users and impersonate them for debugging

**Features:**
- List all drivers, shippers, and admins
- See last login times
- View user status (active/inactive)
- **Impersonate users** - Log in as any user to see their exact experience
- Audit trail of impersonation actions

**Use Cases:**
- **Primary Use Case:** When a shipper reports an issue, impersonate their account to see exactly what they see
- Debug permission issues
- Test workflows from user perspective
- Verify user access

**How to Use Impersonation:**
1. Go to User Activity page
2. Find the shipper's email
3. Click "Impersonate"
4. Confirm - you'll be logged in as that user
5. Navigate their portal to reproduce the issue
6. Fix the issue with Cursor AI
7. Log out and return to admin mode

**Access:** Admin mode enabled → User Activity

---

### 4. **System Diagnostics** (`/driver/admin/diagnostics`)
**Purpose:** Monitor system health and performance

**Features:**
- Database health check (status, response time)
- API health check (status, response time)
- Error summary (24h and 7d error counts)
- Recent errors list
- Auto-refresh every 30 seconds

**Use Cases:**
- Quick health check when issues are reported
- Monitor system performance
- Identify degradation before it becomes critical
- Check if database/API is responding

**Access:** Admin mode enabled → System Diagnostics

---

## Missing Pages (To Be Created)

### 5. **Driver Management** (`/driver/admin/drivers`)
**Purpose:** Manage driver accounts

**Features Needed:**
- List all drivers
- Add/edit driver accounts
- Activate/deactivate drivers
- Set admin privileges
- View driver statistics
- Reset passwords

**Status:** Not yet created - can be added if needed

---

### 6. **Database Tools** (`/driver/admin/database`)
**Purpose:** Query database and export data

**Features Needed:**
- SQL query interface (read-only for safety)
- Data export (CSV, JSON)
- Table browser
- Query history

**Status:** Not yet created - can be added if needed

---

## API Endpoints Needed

To make these pages functional, you'll need to create these API endpoints:

### `/api/admin/logs`
- GET: Fetch system logs
- Query params: `level`, `search`, `limit`

### `/api/admin/audit-logs`
- GET: Fetch audit logs
- Query params: `action`, `entityType`, `severity`, `success`, `search`, `limit`

### `/api/admin/diagnostics`
- GET: Fetch system health metrics
- Returns: Database status, API status, error counts

### `/api/admin/users`
- GET: List all users (drivers, shippers, admins)
- Returns: User list with last login times

### `/api/admin/users/[id]/impersonate`
- POST: Generate impersonation token
- Returns: User data and session token
- Logs impersonation action to audit log

---

## Workflow for Debugging Shipper Issues

**Recommended workflow when a shipper reports a problem:**

1. **Get Details:**
   - Ask shipper for: error message, what they were doing, when it happened
   - Get their email address

2. **Check System Logs:**
   - Go to `/driver/admin/logs`
   - Filter by ERROR level
   - Search for their email or the error message
   - Note the exact error and timestamp

3. **Check Audit Logs:**
   - Go to `/driver/admin/audit`
   - Filter by their email
   - See what actions they performed before the error
   - Check if any actions failed

4. **Impersonate User:**
   - Go to `/driver/admin/users`
   - Find their account
   - Click "Impersonate"
   - Try to reproduce the issue yourself
   - See exactly what they see

5. **Fix with Cursor AI:**
   - Use Cursor AI to fix the issue
   - Test the fix while impersonating
   - Verify the fix works

6. **Check System Diagnostics:**
   - Go to `/driver/admin/diagnostics`
   - Verify system is healthy
   - Check if errors are decreasing

7. **Log Out:**
   - Log out of impersonation
   - Return to admin mode
   - Document the fix

---

## Security Considerations

- **Impersonation is logged** - All impersonation actions are recorded in audit logs
- **Admin-only access** - All IT tools require admin mode enabled
- **Read-only database tools** - If implemented, should be read-only for safety
- **Audit trail** - All admin actions are logged

---

## Next Steps

1. **Create API endpoints** for the new pages
2. **Implement error logging** - Ensure errors are being logged to the database
3. **Add driver management** - If needed for your workflow
4. **Add database tools** - If you need direct database access

---

## Summary

You now have comprehensive IT tools to:
- ✅ View system errors and logs
- ✅ Track all user actions (audit trail)
- ✅ Impersonate users to debug issues
- ✅ Monitor system health
- ✅ Diagnose and fix issues with Cursor AI

These tools give you full visibility into the system and allow you to quickly diagnose and fix any issues shippers report.

