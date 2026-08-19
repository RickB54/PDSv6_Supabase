const fs = require('fs');
const file = 'c:/Users/rberu/PDSv6_Supabase/src/components/bookings/BookingsAnalytics.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /([ \t]*)(<Button[\s\S]*?This Month\s*<\/Button>)/g;
content = content.replace(regex, (match, whitespace, p2) => {
    // Determine the state setter function
    const matchSetter = match.match(/set([a-zA-Z]+DateFilter)/);
    if (!matchSetter) return match;
    const setterName = 'set' + matchSetter[1];
    
    // Determine the setter for closing popover
    const matchClose = match.match(/(set[a-zA-Z]+Open)\(false\)/);
    const closeCall = matchClose ? ` ${matchClose[1]}(false);` : '';

    // Extract the className from the Button
    const classNameMatch = match.match(/className="([^"]+)"/);
    const className = classNameMatch ? classNameMatch[1] : "text-[10px] h-8 bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700";

    const newButton = `${whitespace}<Button variant="outline" size="sm" className="${className}" onClick={() => { ${setterName}({ start: startOfYear(new Date()), end: endOfYear(new Date()) });${closeCall} }}>This Year</Button>`;

    return match + '\n' + newButton;
});

fs.writeFileSync(file, content);
console.log('done');
