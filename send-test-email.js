const http = require('http');

const postData = JSON.stringify({
  email: 'cm145571@gmail.com',
  firstName: 'Test',
  lastName: 'User'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/test/send-welcome-email',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  },
  timeout: 20000
};

console.log('📧 Sending test welcome email to cm145571@gmail.com...\n');

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}\n`);
  
  let body = '';
  res.on('data', (chunk) => {
    body += chunk.toString();
  });
  
  res.on('end', () => {
    console.log('Response:');
    console.log(body);
    try {
      const parsed = JSON.parse(body);
      if (parsed.success) {
        console.log('\n✅ SUCCESS: Email sent successfully!');
        console.log('📬 Check your inbox at cm145571@gmail.com');
        console.log('   (Also check spam/junk folder)');
      } else {
        console.log('\n❌ ERROR:', parsed.error || parsed.message);
        if (parsed.details) {
          console.log('Details:', JSON.stringify(parsed.details, null, 2));
        }
      }
    } catch (e) {
      console.log('(Response is not JSON)');
    }
  });
});

req.on('error', (error) => {
  console.error('\n❌ Request Error:', error.message);
  if (error.code === 'ECONNREFUSED') {
    console.error('Server is not running. Please start it with: npm run dev');
  }
});

req.on('timeout', () => {
  console.error('\n❌ Request timed out');
  req.destroy();
});

req.write(postData);
req.end();

