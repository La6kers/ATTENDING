async function testEndpoints() {
  console.log('Testing endpoints...\n');
  
  const tests = [
    { name: 'Provider Portal Home', url: 'http://localhost:3002' },
    { name: 'Provider Health API', url: 'http://localhost:3002/api/health' },
    { name: 'Patient Portal Home', url: 'http://localhost:3001' },
  ];
  
  for (const test of tests) {
    try {
      const response = await fetch(test.url);
      console.log(test.status === 200 || response.ok ? '✅' : '⚠️', test.name + ':', response.status);
    } catch (error) {
      console.log('❌', test.name + ':', error.message);
    }
  }
}

testEndpoints();
