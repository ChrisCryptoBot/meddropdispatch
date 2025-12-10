# Clean Build Script for MED DROP
# This script removes all build artifacts and caches to fix 404 errors

Write-Host "🧹 Cleaning build artifacts..." -ForegroundColor Cyan

# Remove Next.js build folder
if (Test-Path .next) {
    Remove-Item -Recurse -Force .next
    Write-Host "✅ Deleted .next folder" -ForegroundColor Green
} else {
    Write-Host "ℹ️  .next folder doesn't exist" -ForegroundColor Yellow
}

# Remove Next.js cache
if (Test-Path node_modules/.cache) {
    Remove-Item -Recurse -Force node_modules/.cache
    Write-Host "✅ Deleted node_modules/.cache" -ForegroundColor Green
}

# Remove Prisma generated client (optional - will be regenerated)
if (Test-Path node_modules/.prisma) {
    Remove-Item -Recurse -Force node_modules/.prisma
    Write-Host "✅ Deleted node_modules/.prisma" -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ Cleanup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. If dev server is running, stop it (Ctrl+C)" -ForegroundColor White
Write-Host "2. Run: npm run dev" -ForegroundColor White
Write-Host "3. The missing static files will be regenerated" -ForegroundColor White

