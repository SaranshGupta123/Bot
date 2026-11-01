import { createServer } from '../src/index';

async function runApiTests() {
  console.log('🧪 Starting Rainfall API Test Suite...\n');

  const { app, server } = createServer();

  await new Promise<void>((resolve) => {
    server.listen(4999, () => {
      console.log('✅ Test API server listening on port 4999');
      resolve();
    });
  });

  try {
    // 1. Healthcheck Test
    console.log('Testing GET /health...');
    const healthRes = await fetch('http://localhost:4999/health');
    const healthJson: any = await healthRes.json();
    if (healthRes.status !== 200 || healthJson.status !== 'healthy') {
      throw new Error(`Healthcheck failed: ${JSON.stringify(healthJson)}`);
    }
    console.log('✅ Healthcheck passed: status =', healthJson.status);

    // 2. Auth URL Test
    console.log('Testing GET /api/auth/login...');
    const loginRes = await fetch('http://localhost:4999/api/auth/login');
    const loginJson: any = await loginRes.json();
    if (loginRes.status !== 200 || !loginJson.url.includes('discord.com/api/oauth2/authorize')) {
      throw new Error(`Login URL generation failed: ${JSON.stringify(loginJson)}`);
    }
    console.log('✅ Discord OAuth URL generated correctly.');

    // 3. Unauthorized access rejection test
    console.log('Testing GET /api/guilds without token (should be 401)...');
    const guildsRes = await fetch('http://localhost:4999/api/guilds');
    if (guildsRes.status !== 401) {
      throw new Error(`Expected status 401, got ${guildsRes.status}`);
    }
    console.log('✅ Unauthorized access successfully rejected with 401.');

    console.log('\n🎉 ALL API TESTS PASSED SUCCESSFULLY!');
  } finally {
    server.close();
  }
}

runApiTests().catch((err) => {
  console.error('API Test Suite Failed:', err);
  process.exit(1);
});

