const fs = require('fs');
let content = fs.readFileSync('src/pages/Prospects.tsx', 'utf8');

// Fix the doubled tags
content = content.replace(/<\/div>\s+<\/div>\s+<\/div>\s+<\/div>\s+\);\s+<\/div>/g, '</div>\n                                    </div>\n                                  );\n                                });');

// Actually, let's just look for the specific sequence of lines
const lines = content.split('\n');
const newLines = [];
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('</div>') && 
        lines[i+1] && lines[i+1].includes('</div>') && 
        lines[i+2] && lines[i+2].includes('</div>') && 
        lines[i+3] && lines[i+3].includes('</div>') &&
        lines[i+4] && lines[i+4].includes(');') &&
        lines[i+5] && lines[i+5].includes('});')
    ) {
        newLines.push(lines[i]);
        newLines.push(lines[i+1]);
        newLines.push(lines[i+4]);
        newLines.push(lines[i+5]);
        i += 5;
        continue;
    }
    newLines.push(lines[i]);
}

fs.writeFileSync('src/pages/Prospects.tsx', newLines.join('\n'));
console.log('Fixed redundant tags.');
