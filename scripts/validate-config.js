#!/usr/bin/env node

/**
 * Configuration Validation Script
 * Run: npm run setup:validate
 * Validates all environment variables and configuration
 */

// This script needs to be CommonJS for Node execution
// We'll use a simple validation without TypeScript imports

const fs = require('fs');
const path = require('path');

function validateConfig() {
  const errors = [];
  const warnings = [];
  
  // Load .env file if it exists
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        envVars[key] = value;
        process.env[key] = value;
      }
    });
  }

  // Check required variables
  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL is required');
  }

  if (!process.env.NEXTAUTH_SECRET) {
    errors.push('NEXTAUTH_SECRET is required');
  } else if (process.env.NEXTAUTH_SECRET === 'your-secret-key-here-change-in-production') {
    warnings.push('NEXTAUTH_SECRET is using default value - change it for production');
  }

  if (!process.env.NEXTAUTH_URL) {
    errors.push('NEXTAUTH_URL is required');
  }

  // Node environment
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (!['development', 'production', 'test'].includes(nodeEnv)) {
    errors.push(`Invalid NODE_ENV: ${nodeEnv}. Must be development, production, or test`);
  }

  // Email provider check
  const hasResend = !!process.env.RESEND_API_KEY;
  const hasSendGrid = !!process.env.SENDGRID_API_KEY;
  const hasSMTP = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  const hasMailtrap = !!(process.env.MAILTRAP_USER && process.env.MAILTRAP_PASS);
  
  if (!hasResend && !hasSendGrid && !hasSMTP && !hasMailtrap) {
    if (nodeEnv === 'production') {
      warnings.push('No email provider configured - emails will be logged to console only');
    }
  }

  // Production-specific checks
  if (nodeEnv === 'production') {
    if (!process.env.SENTRY_DSN) {
      warnings.push('SENTRY_DSN not set - error tracking disabled');
    }
    if (process.env.DATABASE_URL?.startsWith('file:')) {
      errors.push('SQLite database not allowed in production - use PostgreSQL');
    }
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      warnings.push('BLOB_READ_WRITE_TOKEN not set - documents will be stored as base64 in database');
    }
  }

  // Detect email provider
  let emailProvider = 'console (no provider)';
  if (hasResend) emailProvider = 'Resend';
  else if (hasSendGrid) emailProvider = 'SendGrid';
  else if (hasSMTP) emailProvider = 'SMTP';
  else if (hasMailtrap) emailProvider = 'Mailtrap';

  // Database type
  const databaseUrl = process.env.DATABASE_URL || '';
  let databaseType = 'Unknown';
  if (databaseUrl.startsWith('postgresql')) databaseType = 'PostgreSQL';
  else if (databaseUrl.startsWith('file:')) databaseType = 'SQLite';

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    emailProvider,
    databaseType,
    nodeEnv,
  };
}

// Run validation
const result = validateConfig();

console.log('\n========================================');
console.log('MED DROP - Configuration Validation');
console.log('========================================\n');

console.log('Environment:', result.nodeEnv);
console.log('Database:', result.databaseType);
console.log('Email Provider:', result.emailProvider);
console.log('');

if (result.errors.length > 0) {
  console.log('❌ ERRORS (must fix):');
  result.errors.forEach(error => {
    console.log('   -', error);
  });
  console.log('');
}

if (result.warnings.length > 0) {
  console.log('⚠️  WARNINGS (recommended to fix):');
  result.warnings.forEach(warning => {
    console.log('   -', warning);
  });
  console.log('');
}

if (result.valid) {
  console.log('✅ Configuration is valid!');
  process.exit(0);
} else {
  console.log('❌ Configuration has errors. Please fix them before continuing.');
  process.exit(1);
}


/**
 * Configuration Validation Script
 * Run: npm run setup:validate
 * Validates all environment variables and configuration
 */

// This script needs to be CommonJS for Node execution
// We'll use a simple validation without TypeScript imports

const fs = require('fs');
const path = require('path');

function validateConfig() {
  const errors = [];
  const warnings = [];
  
  // Load .env file if it exists
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        envVars[key] = value;
        process.env[key] = value;
      }
    });
  }

  // Check required variables
  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL is required');
  }

  if (!process.env.NEXTAUTH_SECRET) {
    errors.push('NEXTAUTH_SECRET is required');
  } else if (process.env.NEXTAUTH_SECRET === 'your-secret-key-here-change-in-production') {
    warnings.push('NEXTAUTH_SECRET is using default value - change it for production');
  }

  if (!process.env.NEXTAUTH_URL) {
    errors.push('NEXTAUTH_URL is required');
  }

  // Node environment
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (!['development', 'production', 'test'].includes(nodeEnv)) {
    errors.push(`Invalid NODE_ENV: ${nodeEnv}. Must be development, production, or test`);
  }

  // Email provider check
  const hasResend = !!process.env.RESEND_API_KEY;
  const hasSendGrid = !!process.env.SENDGRID_API_KEY;
  const hasSMTP = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  const hasMailtrap = !!(process.env.MAILTRAP_USER && process.env.MAILTRAP_PASS);
  
  if (!hasResend && !hasSendGrid && !hasSMTP && !hasMailtrap) {
    if (nodeEnv === 'production') {
      warnings.push('No email provider configured - emails will be logged to console only');
    }
  }

  // Production-specific checks
  if (nodeEnv === 'production') {
    if (!process.env.SENTRY_DSN) {
      warnings.push('SENTRY_DSN not set - error tracking disabled');
    }
    if (process.env.DATABASE_URL?.startsWith('file:')) {
      errors.push('SQLite database not allowed in production - use PostgreSQL');
    }
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      warnings.push('BLOB_READ_WRITE_TOKEN not set - documents will be stored as base64 in database');
    }
  }

  // Detect email provider
  let emailProvider = 'console (no provider)';
  if (hasResend) emailProvider = 'Resend';
  else if (hasSendGrid) emailProvider = 'SendGrid';
  else if (hasSMTP) emailProvider = 'SMTP';
  else if (hasMailtrap) emailProvider = 'Mailtrap';

  // Database type
  const databaseUrl = process.env.DATABASE_URL || '';
  let databaseType = 'Unknown';
  if (databaseUrl.startsWith('postgresql')) databaseType = 'PostgreSQL';
  else if (databaseUrl.startsWith('file:')) databaseType = 'SQLite';

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    emailProvider,
    databaseType,
    nodeEnv,
  };
}

// Run validation
const result = validateConfig();

console.log('\n========================================');
console.log('MED DROP - Configuration Validation');
console.log('========================================\n');

console.log('Environment:', result.nodeEnv);
console.log('Database:', result.databaseType);
console.log('Email Provider:', result.emailProvider);
console.log('');

if (result.errors.length > 0) {
  console.log('❌ ERRORS (must fix):');
  result.errors.forEach(error => {
    console.log('   -', error);
  });
  console.log('');
}

if (result.warnings.length > 0) {
  console.log('⚠️  WARNINGS (recommended to fix):');
  result.warnings.forEach(warning => {
    console.log('   -', warning);
  });
  console.log('');
}

if (result.valid) {
  console.log('✅ Configuration is valid!');
  process.exit(0);
} else {
  console.log('❌ Configuration has errors. Please fix them before continuing.');
  process.exit(1);
}


