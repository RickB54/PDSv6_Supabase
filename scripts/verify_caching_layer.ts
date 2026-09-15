import dotenv from 'dotenv';
dotenv.config();
import { appCache, invalidateInventoryCache, invalidateCustomerCache } from '../src/lib/app-cache';

async function runVerification() {
  console.log('====================================================');
  console.log('PHASE 1 CACHING & DEDUPLICATION INDEPENDENT VERIFICATION');
  console.log('====================================================\n');

  let networkFetchCount = 0;

  // Simulated DB fetcher representing Supabase query
  const mockDbFetch = async (queryName: string) => {
    networkFetchCount++;
    console.log(`  [Network] --> Executing live DB query: "${queryName}" (Fetch #${networkFetchCount})`);
    await new Promise((r) => setTimeout(r, 60)); // simulate 60ms latency
    return [
      { id: '1', name: 'Ceramic Coating Pro', stock: 12 },
      { id: '2', name: 'Microfiber Wash Mitt', stock: 45 }
    ];
  };

  // TEST 1: Sequential Repeat Access (Tab Switch / Re-open scenario)
  console.log('--- TEST 1: Opening Same Tab / Inventory Twice in a Row ---');
  networkFetchCount = 0;
  appCache.invalidateLocal(); // start clean

  console.log('Step 1.1: User opens Inventory tab (First Load)...');
  const firstLoad = await appCache.fetchWithCache('inventory:chemicals', () => mockDbFetch('chemicals'));
  console.log(`  Result: ${firstLoad.length} items returned. Network queries executed: ${networkFetchCount}`);

  console.log('\nStep 1.2: User switches tabs and returns to Inventory tab immediately (Repeat Load)...');
  const secondLoad = await appCache.fetchWithCache('inventory:chemicals', () => mockDbFetch('chemicals'));
  console.log(`  Result: ${secondLoad.length} items returned. Total network queries executed: ${networkFetchCount}`);

  if (networkFetchCount === 1) {
    console.log('  \u2714 PASS: Exactly ONE network request executed for repeated tab access. Cache hit served instantly with 0 roundtrips.\n');
  } else {
    console.error(`  \u2716 FAIL: Expected 1 network request, but saw ${networkFetchCount}\n`);
    process.exit(1);
  }

  // TEST 2: Concurrent In-Flight Request Deduplication (Multiple components mounting at once)
  console.log('--- TEST 2: In-Flight Promise Deduplication (Concurrent Mounting) ---');
  networkFetchCount = 0;
  appCache.invalidateLocal(); // start clean

  console.log('Step 2.1: 5 simultaneous components requesting "inventory:materials" at the exact same millisecond...');
  const promises = [1, 2, 3, 4, 5].map((idx) =>
    appCache.fetchWithCache('inventory:materials', () => mockDbFetch('materials'))
  );
  const results = await Promise.all(promises);
  console.log(`  Result: All 5 components received data (${results.length} results). Total network queries executed: ${networkFetchCount}`);

  if (networkFetchCount === 1) {
    console.log('  \u2714 PASS: In-flight deduplication collapsed 5 concurrent requests into exactly 1 network query.\n');
  } else {
    console.error(`  \u2716 FAIL: Expected 1 network request, but saw ${networkFetchCount}\n`);
    process.exit(1);
  }

  // TEST 3: Invalidation on Item Edit / Save
  console.log('--- TEST 3: Edit Item & Cross-Device/Tab Invalidation ---');
  networkFetchCount = 0;
  appCache.invalidateLocal();

  console.log('Step 3.1: Initial fetch for "inventory:chemicals"...');
  await appCache.fetchWithCache('inventory:chemicals', () => mockDbFetch('chemicals'));
  console.log(`  Network queries so far: ${networkFetchCount}`);

  console.log('Step 3.2: User edits chemical quantity / saves item -> invalidateInventoryCache() called...');
  invalidateInventoryCache(false); // test local invalidation

  console.log('Step 3.3: Next access after edit...');
  await appCache.fetchWithCache('inventory:chemicals', () => mockDbFetch('chemicals'));
  console.log(`  Total network queries executed: ${networkFetchCount}`);

  if (networkFetchCount === 2) {
    console.log('  \u2714 PASS: Mutation immediately busted inventory cache, allowing next access to pull fresh live data without manual refresh.\n');
  } else {
    console.error(`  \u2716 FAIL: Expected 2 network requests, but saw ${networkFetchCount}\n`);
    process.exit(1);
  }

  // TEST 4: Domain Isolation
  console.log('--- TEST 4: Domain Isolation (Invalidating Customers does NOT bust Inventory) ---');
  networkFetchCount = 0;
  appCache.invalidateLocal();

  await appCache.fetchWithCache('inventory:chemicals', () => mockDbFetch('chemicals'));
  await appCache.fetchWithCache('customers:all', () => mockDbFetch('customers'));
  console.log(`  Queries after seeding inventory & customers: ${networkFetchCount}`);

  console.log('Step 4.1: Invalidate customer cache only (invalidateCustomerCache)...');
  invalidateCustomerCache(false);

  console.log('Step 4.2: Fetch inventory:chemicals (should hit cache) and customers:all (should re-fetch)...');
  await appCache.fetchWithCache('inventory:chemicals', () => mockDbFetch('chemicals'));
  console.log(`  Queries after inventory fetch (should remain 2): ${networkFetchCount}`);

  await appCache.fetchWithCache('customers:all', () => mockDbFetch('customers'));
  console.log(`  Queries after customers fetch (should become 3): ${networkFetchCount}`);

  if (networkFetchCount === 3) {
    console.log('  \u2714 PASS: Domain isolation verified. Customer invalidation preserved Inventory cache intact.\n');
  } else {
    console.error(`  \u2716 FAIL: Expected 3 network requests, but saw ${networkFetchCount}\n`);
    process.exit(1);
  }

  console.log('====================================================');
  console.log('ALL 4 INDEPENDENT VERIFICATION TESTS PASSED SUCCESSFULLY');
  console.log('====================================================');
}

runVerification().catch((e) => {
  console.error(e);
  process.exit(1);
});
