const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'shops.csv');
const data = fs.readFileSync(filePath, 'utf8');

const lines = data.split('\n');
let totalAcquisition = 0;
const storeAcquisitions = [];

for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(',');
    // CSV parsing is tricky with commas in quotes, but here simple split might work if format is consistent.
    // Looking at the file, the last column is quoted "%", but Total Acquisition is before it and seems unquoted integer.
    // BUT the store name "YES STORES ΥΜΗΤΤΟΥ ΟΕ*" has no commas.
    // "YES STORES ΠΑΛΜΕ 18 Ο.Ε.*" has no commas.
    // "ΑΓΓΕΛΟΠΟΥΛΟΣ Δ.- ΧΩΡΙΑΝΟΠΟΥΛΟΥ ΑΝΝΑ ΟΕ*" has no commas.
    // However, index 5 might shift if address has commas?
    // Let's look at a line: 
    // MICHALOPOULOS DIMITRIS,YES STORES ΥΜΗΤΤΟΥ ΟΕ*,Athina,116 Imittou,116 33,62,"8,26666666666667%"
    // 0: TA
    // 1: PtP Name
    // 2: City
    // 3: Address
    // 4: Zip
    // 5: Total
    // 6: %

    // Some addresses might have commas?
    // "DELIVERY HERO DMART GREECE (efood Local)*" -> no commas.
    // "BYRON,Formionos & Kristalli" -> address has comma! Line 42.
    // We need a proper CSV regex or careful split.

    // Regex to match CSV line:
    // /,(?=(?:(?:[^"]*"){2})*[^"]*$)/

    const columns = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

    // Filter out empty lines
    if (columns.length < 5) continue;

    // The logic: 
    // The "Total Acquisition" is usually the second to last column, or the one before the percentage which is quoted.
    // Last column is quoted % or just %.
    // Let's assume Total Acquisition is index 5 normally.
    // But if address has comma, it shifts.
    // Safest way: 
    // Total Acquisition is an Integer number.
    // ZipCode is usually formatted "XXX XX" or similar.
    // Let's look really closely at line 42:
    // MICHALOPOULOS DIMITRIS,ΜΑΝΟΣ ΙΩΑΝΝΗΣ,BYRON,Formionos & Kristalli,162 31,1,"0,133333333333333%"
    // Columns:
    // 0: TA
    // 1: Name
    // 2: City (BYRON)
    // 3: Address (Formionos & Kristalli) ?? Wait, CSV split by comma.
    // The file content shows: MICHALOPOULOS DIMITRIS,ΜΑΝΟΣ ΙΩΑΝΝΗΣ,BYRON,Formionos & Kristalli,162 31,1,"0,133333333333333%"
    // If I split by comma:
    // [0] MICHALOPOULOS DIMITRIS
    // [1] ΜΑΝΟΣ ΙΩΑΝΝΗΣ
    // [2] BYRON
    // [3] Formionos & Kristalli -> NO if unquoted, it splits!
    // [3] Formionos & Kristalli IS NOT QUOTED in the file view.
    // So "Formionos & Kristalli" will be split into "Formionos & Kristalli"? No, there is no comma in "Formionos & Kristalli".
    // Wait, Line 42: ...,BYRON,Formionos & Kristalli,162 31,...
    // There is no comma in "Formionos & Kristalli".
    // Ah, wait. checking other lines.
    // Line 55: ...,Μενεμένη,54 Dimitsanas,115 22,...
    // Line 58: ...,ΔΗΜΟΣ ΑΘΗΝΑΙΩΝ,ΔΡΑΚΟΥ 12,11742,...

    // Simple parsing seems fine for this specific file structure as viewed.
    // The Total Acquisition column is always the one before the last one (which is %).
    // Or simpler: It is the column that parses to a clean integer near the end.

    let acquisition = 0;
    let name = columns[1];

    // Iterate from end to find the acquisition number
    // The last column is %. The one before is acquisition.
    // Unless % is empty?
    // Let's check line 94: ...,Ious,0,0,0%
    // The structure seems robust enough to take (length - 2).

    const val = columns[columns.length - 2];
    acquisition = parseInt(val, 10);

    if (!isNaN(acquisition)) {
        totalAcquisition += acquisition;
        storeAcquisitions.push({ name, acquisition });
    }
}

storeAcquisitions.sort((a, b) => b.acquisition - a.acquisition);

console.log("Total Acquisition (All Stores):", totalAcquisition);
console.log("\nBreakdown by Store:");
storeAcquisitions.forEach(s => {
    console.log(`${s.acquisition}\t${s.name}`);
});
