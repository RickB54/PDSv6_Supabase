import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

async function testRateLimit() {
  const url = `${supabaseUrl}/functions/v1/create-booking`;
  console.log(`Targeting Edge Function: ${url}`);
  console.log('Sending 8 rapid booking submission requests directly to test 429 rate limit...\n');

  for (let i = 1; i <= 8; i++) {
    const payload = {
      customer_name: `RateLimit Test ${i}`,
      email: `ratetest_${Date.now()}_${i}@testdomain.com`,
      phone: `555000000${i}`,
      package: 'Express Detail',
      vehicle_type: 'Sedan',
      price_total: 100,
      date: new Date().toISOString(),
      status: 'tentative',
      booked_by: 'Rate Limit Automated Tester'
    };

    try {
      const start = Date.now();
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`
        },
        body: JSON.stringify(payload)
      });
      const duration = Date.now() - start;
      const text = await res.text();
      let body: any;
      try { body = JSON.parse(text); } catch { body = text; }

      console.log(`Request #${i}: Status = ${res.status} ${res.statusText} (${duration}ms)`);
      console.log(`  Response:`, typeof body === 'object' ? JSON.stringify(body) : body);
      console.log(`  RateLimit Remaining: ${res.headers.get('x-ratelimit-remaining') || 'N/A'}`);
      console.log(`  Retry-After: ${res.headers.get('retry-after') || 'N/A'}\n`);
    } catch (err) {
      console.error(`Request #${i} error:`, err);
    }
  }
}

testRateLimit().catch(console.error);
