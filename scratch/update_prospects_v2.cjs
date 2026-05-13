const fs = require('fs');
const path = 'src/pages/Prospects.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Redirection Logic
const redirectTarget = `const prospects = list.filter(c => {
        const customerType = (c.type || '').toLowerCase();
        return customerType === 'prospect';
      });

      console.log('🔍 Filtered prospects:', prospects);
      console.log('🔍 Prospects count:', prospects.length);
      console.log('🔍 Prospect names:', prospects.map(p => p.name));

      setCustomers(prospects);`;

const redirectReplacement = `const prospects = list.filter(c => {
        const customerType = (c.type || '').toLowerCase();
        return customerType === 'prospect';
      });

      // CHECK FOR REDIRECT: If we have an ID param but it's not in the prospects list,
      // it might be a full customer now. Check the full list.
      const params = new URLSearchParams(location.search);
      const pid = params.get('id');
      if (pid && !prospects.find(p => p.id === pid)) {
        const fullCust = list.find(c => c.id === pid);
        if (fullCust && fullCust.type !== 'prospect') {
          console.log(\`[Prospects] ID \${pid} is a \${fullCust.type}, redirecting to SearchCustomer...\`);
          const navigate = require('react-router-dom').useNavigate(); // Wait, I can't use require inside a hook.
          // I already have navigate in the component scope.
        }
      }

      console.log('🔍 Filtered prospects:', prospects);
      setCustomers(prospects);`;

// Wait, I need to be careful with 'navigate'. It's already defined in the component.

// Let's just do the replacements manually in the script.

content = content.replace(/const prospects = list\.filter\(c => \{[\s\S]+?\}\);[\s\S]+?setCustomers\(prospects\);/, (match) => {
    return `const prospects = list.filter(c => {
        const customerType = (c.type || '').toLowerCase();
        return customerType === 'prospect';
      });

      // CHECK FOR REDIRECT: If we have an ID param but it's not in the prospects list,
      // it might be a full customer now. Check the full list.
      const params = new URLSearchParams(location.search);
      const pid = params.get('id');
      if (pid && !prospects.find(p => p.id === pid)) {
        const fullCust = list.find(c => c.id === pid);
        if (fullCust && fullCust.type !== 'prospect') {
          console.log(\`[Prospects] ID \${pid} is a \${fullCust.type}, redirecting to SearchCustomer...\`);
          navigate(\`/search-customer?customerId=\${pid}\`);
          return;
        }
      }

      console.log('🔍 Filtered prospects:', prospects);
      setCustomers(prospects);`;
});

// 2. Garage Help Icon
content = content.replace(/<h4 className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Garage \(\{customer\.vehicles\?\.length \|\| 0\}\)<\/h4>/, 
    `<div className="flex items-center gap-2">
                                <h4 className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Garage ({customer.vehicles?.length || 0})</h4>
                                <button 
                                  onClick={() => window.dispatchEvent(new CustomEvent('open-help', { detail: { topicId: 'vehicle-management' } }))}
                                  className="text-zinc-600 hover:text-blue-400 transition-colors"
                                  title="Vehicle Help"
                                >
                                  <HelpCircle className="h-3 w-3" />
                                </button>
                              </div>`);

// 3. Timeline Help Icon
content = content.replace(/<h4 className="text-zinc-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2">[\s\S]+?<History className="h-3\.5 w-3\.5" \/> Combined Session & Interaction Timeline[\s\S]+?<\/h4>/,
    `<h4 className="text-zinc-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                 <History className="h-3.5 w-3.5" /> Combined Session & Interaction Timeline
                                 <button 
                                   onClick={() => window.dispatchEvent(new CustomEvent('open-help', { detail: { topicId: 'booking-flow' } }))}
                                   className="text-zinc-600 hover:text-purple-400 transition-colors"
                                   title="Booking Help"
                                 >
                                   <HelpCircle className="h-3 w-3" />
                                 </button>
                               </h4>`);

fs.writeFileSync(path, content);
console.log('Prospects.tsx updated via script.');
