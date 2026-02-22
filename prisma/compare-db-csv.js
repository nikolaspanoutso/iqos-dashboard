const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
    console.log('--- 🔍 Database vs CSV Comparison Audit ---');

    const csvPath = path.join(__dirname, '..', 'doublecheck.csv');
    if (!fs.existsSync(csvPath)) {
        console.error('File not found: doublecheck.csv');
        process.exit(1);
    }

    // 1. Read and Normalize CSV Data
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');

    const normalize = (name) => name.replace(/\*/g, '').trim().toLowerCase();

    const csvNames = new Set();
    const csvKeysMap = new Map(); // normalized -> raw name

    // Starting from index 5 (line 6) based on knowledge of doublecheck.csv structure
    for (let i = 5; i < lines.length; i++) {
        const cols = lines[i].split(',');
        const rawName = cols[1]?.trim();
        if (rawName) {
            const normalized = normalize(rawName);
            csvNames.add(normalized);
            csvKeysMap.set(normalized, rawName);
        }
    }

    // 2. Read and Normalize DB Data
    const dbStores = await prisma.store.findMany({
        where: { isActive: true } // Compare against active stores
    });

    const dbKeysMap = new Map(); // normalized -> store object
    dbStores.forEach(s => {
        const normalized = normalize(s.name);
        dbKeysMap.set(normalized, s);
    });

    // 3. Comparison Logic
    const extraInDb = [];
    dbStores.forEach(s => {
        const normalized = normalize(s.name);
        if (!csvNames.has(normalized)) {
            extraInDb.push(s);
        }
    });

    const missingInDb = [];
    csvNames.forEach(normalized => {
        if (!dbKeysMap.has(normalized)) {
            missingInDb.push(csvKeysMap.get(normalized));
        }
    });

    // 4. Report
    console.log(`\n📊 Summary:`);
    console.log(`   - Total in Database (Active): ${dbStores.length}`);
    console.log(`   - Total in CSV:              ${csvNames.size}`);

    console.log(`\n🚨 Extra Shops in Database (Missing from CSV):`);
    if (extraInDb.length === 0) {
        console.log('   (None)');
    } else {
        extraInDb.forEach(s => {
            console.log(`   - [ID: ${s.id}] ${s.name} (Area: ${s.area || 'N/A'})`);
        });
    }

    console.log(`\n🚨 Missing from Database (Present in CSV):`);
    if (missingInDb.length === 0) {
        console.log('   (None)');
    } else {
        missingInDb.forEach(name => {
            console.log(`   - ${name}`);
        });
    }

    if (extraInDb.length > 0) {
        console.log('\n💡 Tip: To delete extra shops, you can use the ID in a custom delete script.');
    }

    console.log('\n------------------------------------------');
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
