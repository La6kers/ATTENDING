async function testAllEndpoints() {
  console.log('🔍 ATTENDING AI - Full API Test\n');
  
  const tests = [
    // Provider Portal
    { name: 'Provider Home', url: 'http://localhost:3002' },
    { name: 'Provider Health API', url: 'http://localhost:3002/api/health' },
    { name: 'Clinical Services Page', url: 'http://localhost:3002/clinical-services' },
    { name: 'Alerts API (GET)', url: 'http://localhost:3002/api/alerts/deterioration' },
    { name: 'Care Gaps API', url: 'http://localhost:3002/api/care-gaps?patientId=test' },
    { name: 'Population Health API', url: 'http://localhost:3002/api/population-health' },
    { name: 'Inbox API', url: 'http://localhost:3002/api/inbox' },
    { name: 'Interpreter API', url: 'http://localhost:3002/api/interpreter?type=languages' },
    
    // Patient Portal
    { name: 'Patient Home', url: 'http://localhost:3001' },
    { name: 'Wellness Page', url: 'http://localhost:3001/wellness' },
    { name: 'Mental Health API', url: 'http://localhost:3001/api/mental-health?type=resources' },
    { name: 'Wearables API', url: 'http://localhost:3001/api/wearables?patientId=test&type=vitals' },
    { name: 'Health Coaching API', url: 'http://localhost:3001/api/health-coaching?patientId=test' },
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const response = await fetch(test.url);
      const icon = response.ok ? '✅' : '⚠️';
      console.log(icon, test.name + ':', response.status);
      if (response.ok) passed++; else failed++;
    } catch (error) {
      console.log('❌', test.name + ':', 'Failed');
      failed++;
    }
  }
  
  console.log('\n📊 Results:', passed, 'passed,', failed, 'warnings/failed');
}

testAllEndpoints();
