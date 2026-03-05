const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'Stores1.csv');
if (!fs.existsSync(filePath)) {
    console.error('Stores1.csv not found');
    process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split(/\r?\n/);

const cleanedLines = lines.map(line => {
    // Remove everything from the comma that precedes =VLOOKUP until the end of the line
    // Use regex to find the last comma followed by =VLOOKUP
    return line.replace(/,=VLOOKUP.*/i, '');
});

fs.writeFileSync(filePath, cleanedLines.join('\n'));
console.log('✅ Stores1.csv cleaned. All =VLOOKUP formulas removed.');
