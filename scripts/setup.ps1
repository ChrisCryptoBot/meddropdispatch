# MED DROP - One-Command Setup Script for Windows
# Run this script to set up the development environment

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MED DROP - Setup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Node.js is not installed. Please install Node.js 18+ from https://nodejs.org" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Node.js $nodeVersion found" -ForegroundColor Green

# Check npm
Write-Host "Checking npm..." -ForegroundColor Yellow
$npmVersion = npm --version
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm is not installed." -ForegroundColor Red
    exit 1
}
Write-Host "✓ npm $npmVersion found" -ForegroundColor Green
Write-Host ""

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Check .env file
Write-Host "Checking environment configuration..." -ForegroundColor Yellow
if (-Not (Test-Path ".env")) {
    Write-Host ".env file not found. Creating from .env.example..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "✓ .env file created from .env.example" -ForegroundColor Green
        Write-Host "⚠ Please edit .env file with your configuration" -ForegroundColor Yellow
    } else {
        Write-Host "ERROR: .env.example not found" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✓ .env file exists" -ForegroundColor Green
}
Write-Host ""

# Generate Prisma client
Write-Host "Generating Prisma client..." -ForegroundColor Yellow
npm run prisma:generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to generate Prisma client" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Prisma client generated" -ForegroundColor Green
Write-Host ""

# Run migrations
Write-Host "Running database migrations..." -ForegroundColor Yellow
npm run prisma:migrate
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to run migrations" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Database migrations completed" -ForegroundColor Green
Write-Host ""

# Seed database
Write-Host "Seeding database..." -ForegroundColor Yellow
npm run prisma:seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Database seeding failed (this is optional)" -ForegroundColor Yellow
} else {
    Write-Host "✓ Database seeded" -ForegroundColor Green
}
Write-Host ""

# Validate configuration
Write-Host "Validating configuration..." -ForegroundColor Yellow
node -e "const { validateConfig } = require('./lib/config.ts'); const result = validateConfig(); console.log(result.valid ? '✓ Configuration valid' : '⚠ Configuration has issues'); if (result.errors.length > 0) { console.error('Errors:', result.errors); } if (result.warnings.length > 0) { console.warn('Warnings:', result.warnings); }"
Write-Host ""

# Create admin user prompt
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Edit .env file with your configuration" -ForegroundColor White
Write-Host "2. Create admin user: npm run create:admin" -ForegroundColor White
Write-Host "3. Start dev server: npm run dev" -ForegroundColor White
Write-Host "4. Visit http://localhost:3000" -ForegroundColor White
Write-Host ""
$createAdmin = Read-Host "Create admin user now? (y/n)"
if ($createAdmin -eq "y" -or $createAdmin -eq "Y") {
    npm run create:admin
}
Write-Host ""
Write-Host "Setup complete! Run 'npm run dev' to start the development server." -ForegroundColor Green

# Run this script to set up the development environment

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MED DROP - Setup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Node.js is not installed. Please install Node.js 18+ from https://nodejs.org" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Node.js $nodeVersion found" -ForegroundColor Green

# Check npm
Write-Host "Checking npm..." -ForegroundColor Yellow
$npmVersion = npm --version
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm is not installed." -ForegroundColor Red
    exit 1
}
Write-Host "✓ npm $npmVersion found" -ForegroundColor Green
Write-Host ""

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Check .env file
Write-Host "Checking environment configuration..." -ForegroundColor Yellow
if (-Not (Test-Path ".env")) {
    Write-Host ".env file not found. Creating from .env.example..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "✓ .env file created from .env.example" -ForegroundColor Green
        Write-Host "⚠ Please edit .env file with your configuration" -ForegroundColor Yellow
    } else {
        Write-Host "ERROR: .env.example not found" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✓ .env file exists" -ForegroundColor Green
}
Write-Host ""

# Generate Prisma client
Write-Host "Generating Prisma client..." -ForegroundColor Yellow
npm run prisma:generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to generate Prisma client" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Prisma client generated" -ForegroundColor Green
Write-Host ""

# Run migrations
Write-Host "Running database migrations..." -ForegroundColor Yellow
npm run prisma:migrate
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to run migrations" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Database migrations completed" -ForegroundColor Green
Write-Host ""

# Seed database
Write-Host "Seeding database..." -ForegroundColor Yellow
npm run prisma:seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Database seeding failed (this is optional)" -ForegroundColor Yellow
} else {
    Write-Host "✓ Database seeded" -ForegroundColor Green
}
Write-Host ""

# Validate configuration
Write-Host "Validating configuration..." -ForegroundColor Yellow
node -e "const { validateConfig } = require('./lib/config.ts'); const result = validateConfig(); console.log(result.valid ? '✓ Configuration valid' : '⚠ Configuration has issues'); if (result.errors.length > 0) { console.error('Errors:', result.errors); } if (result.warnings.length > 0) { console.warn('Warnings:', result.warnings); }"
Write-Host ""

# Create admin user prompt
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Edit .env file with your configuration" -ForegroundColor White
Write-Host "2. Create admin user: npm run create:admin" -ForegroundColor White
Write-Host "3. Start dev server: npm run dev" -ForegroundColor White
Write-Host "4. Visit http://localhost:3000" -ForegroundColor White
Write-Host ""
$createAdmin = Read-Host "Create admin user now? (y/n)"
if ($createAdmin -eq "y" -or $createAdmin -eq "Y") {
    npm run create:admin
}
Write-Host ""
Write-Host "Setup complete! Run 'npm run dev' to start the development server." -ForegroundColor Green


