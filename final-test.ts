async function finalVerification() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('   ATTENDING AI - Final Verification Report');
  console.log('═══════════════════════════════════════════════════════\n');

  const results = { passed: 0, failed: 0 };

  async function test(category, name, url) {
    try {
      const response = await fetch(url);
      const icon = response.ok ? '✅' : response.status === 401 ? '🔒' : '⚠️';
      console.log(icon, name + ':', response.status);
      if (response.ok || response.status === 401) results.passed++;
      else results.failed++;
      return response.ok;
    } catch (e) {
      console.log('❌', name + ':', 'Failed');
      results.failed++;
      return false;
    }
  }

  // Provider Portal
  console.log('\n🏥 PROVIDER PORTAL (localhost:3002)\n');
  await test('provider', 'Home Page', 'http://localhost:3002');
  await test('provider', 'Clinical Services', 'http://localhost:3002/clinical-services');
  await test('provider', 'Health API', 'http://localhost:3002/api/health');
  await test('provider', 'Alerts API', 'http://localhost:3002/api/alerts/deterioration');
  await test('provider', 'Care Gaps API', 'http://localhost:3002/api/care-gaps');
  await test('provider', 'Inbox API', 'http://localhost:3002/api/inbox');
  await test('provider', 'Population Health API', 'http://localhost:3002/api/population-health');

  // Patient Portal
  console.log('\n👤 PATIENT PORTAL (localhost:3001)\n');
  await test('patient', 'Home Page', 'http://localhost:3001');
  await test('patient', 'Dashboard', 'http://localhost:3001/dashboard');
  await test('patient', 'Health Summary', 'http://localhost:3001/health-summary');
  await test('patient', 'Care Resources', 'http://localhost:3001/care-resources');
  await test('patient', 'Companion', 'http://localhost:3001/companion');
  await test('patient', 'Emergency Access', 'http://localhost:3001/emergency-access');
  await test('patient', 'Profile', 'http://localhost:3001/profile');
  await test('patient', 'Chat', 'http://localhost:3001/chat');
  await test('patient', 'Health Profile API', 'http://localhost:3001/api/patient/health-profile');

  // Summary
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('   SUMMARY');
  console.log('═══════════════════════════════════════════════════════');
  console.log('\n✅ Passed:', results.passed);
  console.log('❌ Failed:', results.failed);
  console.log('\n📊 Success Rate:', Math.round(results.passed / (results.passed + results.failed) * 100) + '%');
  
  if (results.failed === 0) {
    console.log('\n🎉 All systems operational!');
  }
  
  console.log('\n═══════════════════════════════════════════════════════\n');
}

finalVerification();
