const fs = require('fs');
let content = fs.readFileSync('src/components/bookings/BookingsAnalytics.tsx', 'utf-8');

// Find the exact text using indexOf
const qualStart = `                <CardContent className="p-0 relative">\r\n                    <div className="overflow-x-auto">\r\n                        <Table>`;
const qualEnd = `                            </TableBody>\r\n                        </Table>\r\n                    </div>\r\n                </CardContent>\r\n            </Card>\r\n\r\n            {/* Price Fluctuation History Section */}`;

if (!content.includes(qualStart)) {
    console.log('ERROR: qualStart not found!');
    console.log('Looking for partial...');
    const partial = `<CardContent className="p-0 relative">`;
    const idx = content.indexOf(partial);
    if (idx !== -1) {
        console.log('Found at offset:', idx);
        console.log('Context:', JSON.stringify(content.substring(idx, idx+200)));
    }
} else {
    console.log('qualStart FOUND!');
}

if (!content.includes(qualEnd)) {
    console.log('ERROR: qualEnd not found!');
} else {
    console.log('qualEnd FOUND!');
}
