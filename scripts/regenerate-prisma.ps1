# Regenerate Prisma Client
# This script stops any running Node processes, regenerates Prisma, and restarts the dev server

Write-Host "Stopping any running Node processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "Regenerating Prisma client..." -ForegroundColor Yellow
npx prisma generate

if ($LASTEXITCODE -eq 0) {
    Write-Host "Prisma client regenerated successfully!" -ForegroundColor Green
    Write-Host "You can now restart your dev server with: npm run dev" -ForegroundColor Green
} else {
    Write-Host "Error regenerating Prisma client. Please try again." -ForegroundColor Red
    exit 1
}


