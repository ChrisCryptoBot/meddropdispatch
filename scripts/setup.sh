#!/bin/bash

# MED DROP - One-Command Setup Script for Unix/Linux/Mac
# Run this script to set up the development environment

set -e  # Exit on error

echo "========================================"
echo "MED DROP - Setup Script"
echo "========================================"
echo ""

# Check Node.js
echo "Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed. Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi
NODE_VERSION=$(node --version)
echo "✓ Node.js $NODE_VERSION found"

# Check npm
echo "Checking npm..."
if ! command -v npm &> /dev/null; then
    echo "ERROR: npm is not installed."
    exit 1
fi
NPM_VERSION=$(npm --version)
echo "✓ npm $NPM_VERSION found"
echo ""

# Install dependencies
echo "Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies"
    exit 1
fi
echo "✓ Dependencies installed"
echo ""

# Check .env file
echo "Checking environment configuration..."
if [ ! -f ".env" ]; then
    echo ".env file not found. Creating from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✓ .env file created from .env.example"
        echo "⚠ Please edit .env file with your configuration"
    else
        echo "ERROR: .env.example not found"
        exit 1
    fi
else
    echo "✓ .env file exists"
fi
echo ""

# Generate Prisma client
echo "Generating Prisma client..."
npm run prisma:generate
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to generate Prisma client"
    exit 1
fi
echo "✓ Prisma client generated"
echo ""

# Run migrations
echo "Running database migrations..."
npm run prisma:migrate
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to run migrations"
    exit 1
fi
echo "✓ Database migrations completed"
echo ""

# Seed database
echo "Seeding database..."
npm run prisma:seed || echo "WARNING: Database seeding failed (this is optional)"
echo "✓ Database seeded (or skipped)"
echo ""

# Validate configuration (if config validation script exists)
echo "Validating configuration..."
node -e "
try {
    const { validateConfig } = require('./lib/config.ts');
    const result = validateConfig();
    if (result.valid) {
        console.log('✓ Configuration valid');
    } else {
        console.log('⚠ Configuration has issues');
        if (result.errors.length > 0) {
            console.error('Errors:', result.errors.join(', '));
        }
        if (result.warnings.length > 0) {
            console.warn('Warnings:', result.warnings.join(', '));
        }
    }
} catch (e) {
    console.log('⚠ Configuration validation skipped (TypeScript file)');
}
"
echo ""

# Create admin user prompt
echo "========================================"
echo "Setup Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Create admin user: npm run create:admin"
echo "3. Start dev server: npm run dev"
echo "4. Visit http://localhost:3000"
echo ""
read -p "Create admin user now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm run create:admin
fi
echo ""
echo "Setup complete! Run 'npm run dev' to start the development server."


# MED DROP - One-Command Setup Script for Unix/Linux/Mac
# Run this script to set up the development environment

set -e  # Exit on error

echo "========================================"
echo "MED DROP - Setup Script"
echo "========================================"
echo ""

# Check Node.js
echo "Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed. Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi
NODE_VERSION=$(node --version)
echo "✓ Node.js $NODE_VERSION found"

# Check npm
echo "Checking npm..."
if ! command -v npm &> /dev/null; then
    echo "ERROR: npm is not installed."
    exit 1
fi
NPM_VERSION=$(npm --version)
echo "✓ npm $NPM_VERSION found"
echo ""

# Install dependencies
echo "Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies"
    exit 1
fi
echo "✓ Dependencies installed"
echo ""

# Check .env file
echo "Checking environment configuration..."
if [ ! -f ".env" ]; then
    echo ".env file not found. Creating from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✓ .env file created from .env.example"
        echo "⚠ Please edit .env file with your configuration"
    else
        echo "ERROR: .env.example not found"
        exit 1
    fi
else
    echo "✓ .env file exists"
fi
echo ""

# Generate Prisma client
echo "Generating Prisma client..."
npm run prisma:generate
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to generate Prisma client"
    exit 1
fi
echo "✓ Prisma client generated"
echo ""

# Run migrations
echo "Running database migrations..."
npm run prisma:migrate
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to run migrations"
    exit 1
fi
echo "✓ Database migrations completed"
echo ""

# Seed database
echo "Seeding database..."
npm run prisma:seed || echo "WARNING: Database seeding failed (this is optional)"
echo "✓ Database seeded (or skipped)"
echo ""

# Validate configuration (if config validation script exists)
echo "Validating configuration..."
node -e "
try {
    const { validateConfig } = require('./lib/config.ts');
    const result = validateConfig();
    if (result.valid) {
        console.log('✓ Configuration valid');
    } else {
        console.log('⚠ Configuration has issues');
        if (result.errors.length > 0) {
            console.error('Errors:', result.errors.join(', '));
        }
        if (result.warnings.length > 0) {
            console.warn('Warnings:', result.warnings.join(', '));
        }
    }
} catch (e) {
    console.log('⚠ Configuration validation skipped (TypeScript file)');
}
"
echo ""

# Create admin user prompt
echo "========================================"
echo "Setup Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Create admin user: npm run create:admin"
echo "3. Start dev server: npm run dev"
echo "4. Visit http://localhost:3000"
echo ""
read -p "Create admin user now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm run create:admin
fi
echo ""
echo "Setup complete! Run 'npm run dev' to start the development server."


