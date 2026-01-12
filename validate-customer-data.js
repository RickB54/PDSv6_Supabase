/**
 * CUSTOMER DATA VALIDATION TEST
 * Run this in browser console to verify data integrity
 * 
 * Usage: Copy-paste this entire file into browser console on any page
 */

(async function validateCustomerData() {
    console.log('🔍 Starting Customer Data Validation...\n');

    try {
        // Import the function
        const { getSupabaseCustomers } = await import('/src/lib/supa-data.ts');

        // Test 1: Fetch data
        console.log('Test 1: Fetching customer data...');
        const allCustomers = await getSupabaseCustomers();
        console.log(`✅ Fetched ${allCustomers.length} total records`);

        // Test 2: Check for required fields
        console.log('\nTest 2: Validating data structure...');
        const hasRequiredFields = allCustomers.every(c =>
            c.name && typeof c.type === 'string'
        );
        console.log(hasRequiredFields
            ? '✅ All records have required fields (name, type)'
            : '❌ Some records missing required fields'
        );

        // Test 3: Count by type
        console.log('\nTest 3: Counting by type...');
        const customers = allCustomers.filter(c => c.type?.toLowerCase() === 'customer');
        const prospects = allCustomers.filter(c => c.type?.toLowerCase() === 'prospect');
        const employees = allCustomers.filter(c => c.type?.toLowerCase() === 'employee');
        const admins = allCustomers.filter(c => c.type?.toLowerCase() === 'admin');
        const others = allCustomers.filter(c => !['customer', 'prospect', 'employee', 'admin'].includes(c.type?.toLowerCase() || ''));

        console.log(`   Customers: ${customers.length}`);
        console.log(`   Prospects: ${prospects.length}`);
        console.log(`   Employees: ${employees.length}`);
        console.log(`   Admins: ${admins.length}`);
        console.log(`   Others/Unknown: ${others.length}`);

        // Test 4: Expected values (update these based on your data)
        console.log('\nTest 4: Comparing to expected values...');
        const EXPECTED_TOTAL = 6;
        const EXPECTED_PROSPECTS = 3;
        const EXPECTED_CUSTOMERS = 1;

        const totalMatch = allCustomers.length === EXPECTED_TOTAL;
        const prospectsMatch = prospects.length === EXPECTED_PROSPECTS;
        const customersMatch = customers.length === EXPECTED_CUSTOMERS;

        console.log(totalMatch
            ? `✅ Total users: ${allCustomers.length} (expected ${EXPECTED_TOTAL})`
            : `⚠️ Total users: ${allCustomers.length} (expected ${EXPECTED_TOTAL})`
        );
        console.log(prospectsMatch
            ? `✅ Prospects: ${prospects.length} (expected ${EXPECTED_PROSPECTS})`
            : `⚠️ Prospects: ${prospects.length} (expected ${EXPECTED_PROSPECTS})`
        );
        console.log(customersMatch
            ? `✅ Customers: ${customers.length} (expected ${EXPECTED_CUSTOMERS})`
            : `⚠️ Customers: ${customers.length} (expected ${EXPECTED_CUSTOMERS})`
        );

        // Test 5: Check for specific users
        console.log('\nTest 5: Checking for specific users...');
        const jenExists = prospects.some(p => p.name?.toLowerCase().includes('jen'));
        const rickExists = customers.some(c => c.name?.toLowerCase().includes('rick'));

        console.log(jenExists ? '✅ Jen found in prospects' : '❌ Jen NOT found in prospects');
        console.log(rickExists ? '✅ Rick found in customers' : '❌ Rick NOT found in customers');

        // Test 6: Data source consistency
        console.log('\nTest 6: Listing all users...');
        allCustomers.forEach(c => {
            console.log(`   ${c.type?.toUpperCase().padEnd(10)} - ${c.name} (${c.email || 'no email'})`);
        });

        // Final summary
        console.log('\n' + '='.repeat(60));
        const allTestsPassed = totalMatch && prospectsMatch && customersMatch && jenExists && rickExists;
        if (allTestsPassed) {
            console.log('✅ ALL TESTS PASSED - Data integrity confirmed!');
        } else {
            console.log('⚠️ SOME TESTS FAILED - Check warnings above');
        }
        console.log('='.repeat(60));

        return {
            passed: allTestsPassed,
            summary: {
                total: allCustomers.length,
                customers: customers.length,
                prospects: prospects.length,
                employees: employees.length,
                admins: admins.length
            }
        };

    } catch (error) {
        console.error('❌ Validation failed with error:', error);
        return { passed: false, error };
    }
})();
