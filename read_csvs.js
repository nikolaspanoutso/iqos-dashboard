const fs = require('fs');

const readFirstLines = (file) => {
    try {
        const data = fs.readFileSync(file, 'utf8');
        console.log(`--- ${file} ---`);
        console.log(data.split('\n').slice(0, 5).join('\n'));
    } catch (e) {
        console.log(`Error reading ${file}:`, e.message);
    }
};

readFirstLines('q12026.csv');
readFirstLines('january.csv');
