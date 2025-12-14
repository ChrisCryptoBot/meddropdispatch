// Generate NEXTAUTH_SECRET for production
// Usage: node scripts/generate-secret.js

const crypto = require('crypto');
const secret = crypto.randomBytes(32).toString('base64');

console.log('\n✅ NEXTAUTH_SECRET generated:');
console.log(secret);
console.log('\n📋 Copy this value to Vercel environment variables as NEXTAUTH_SECRET\n');










