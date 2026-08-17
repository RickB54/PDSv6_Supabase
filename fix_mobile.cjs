const fs = require('fs');
let content = fs.readFileSync('src/components/bookings/BookingsAnalytics.tsx', 'utf-8');

// Fix 1: Close the new "hidden md:block" div for Probono desktop table
// After </Table> and </div> at that point, add another </div>
const probonTableClose = `                            </Table>\r\n                        </div>\r\n                        <div className="p-4 bg-zinc-900`;
const probonTableCloseFixed = `                            </Table>\r\n                        </div>\r\n                        </div>{/* end hidden md:block desktop table */}\r\n                        <div className="p-4 bg-zinc-900`;
content = content.replace(probonTableClose, probonTableCloseFixed);

// Verify it was applied
if (content.includes('end hidden md:block desktop table')) {
    console.log('Probono table close fix applied!');
} else {
    console.log('FAILED - probono table close fix not applied');
}

fs.writeFileSync('src/components/bookings/BookingsAnalytics.tsx', content);
