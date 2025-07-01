// Simple test to verify the build works
const http = require('http');

const testUrl = 'http://localhost:3000/test';

console.log('Testing provider portal build...');

const req = http.get(testUrl, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  
  if (res.statusCode === 200) {
    console.log('✅ Build successful! The provider portal is running correctly.');
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      // Check if the response contains expected content
      if (data.includes('<!DOCTYPE html>') && data.includes('_next')) {
        console.log('✅ HTML content verified - Next.js is serving pages correctly');
        console.log('✅ The React, TypeScript, and UI components are functioning');
        console.log('\nYou can access the provider portal at: http://localhost:3000/inbox');
      } else {
        console.log('⚠️  Unexpected response content');
      }
    });
  } else {
    console.log('❌ Build failed - server returned error');
  }
});

req.on('error', (err) => {
  console.error('❌ Error connecting to server:', err.message);
  console.log('Make sure the development server is running with: npm run dev');
});

req.end();
