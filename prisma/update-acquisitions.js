const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
    console.log('--- Starting Acquisition Update Audit ---');

    const csvPath = path.join(__dirname, '..', 'doublecheck.csv');
    if (!fs.existsSync(csvPath)) {
        console.error('File not found: doublecheck.csv');
        return;
    }

    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');

    // The header is at line 5 (index 4) based on manual inspection
    // Data starts from line 6 (index 5)

    let successCount = 0;
    const failedMatches = [];

    // Pre-fetch all stores to optimize matching and handle normalization
    const allStores = await prisma.store.findMany();
    const normalize = (name) => name.replace(/\*/g, '').trim().toLowerCase();

    const storeMap = new Map();
    allStores.forEach(s => {
        const key = normalize(s.name);
        storeMap.set(key, s);
    });

    console.log(`Analyzing ${lines.length - 5} data rows...`);

    for (let i = 5; i < lines.length; i++) {
        const line = lines[i];
        // Based on view_file, line looks like: ",Store Name,AcquisitionValue"
        const cols = line.split(',');

        // Col indices: 0 is empty, 1 is name, 2 is totalacquisition
        const csvRawName = cols[1]?.trim();
        const csvValue = parseInt(cols[2]?.trim());

        if (!csvRawName || isNaN(csvValue)) continue;

        const csvKey = normalize(csvRawName);
        const targetStore = storeMap.get(csvKey);

        if (targetStore) {
            await prisma.store.update({
                where: { id: targetStore.id },
                data: { totalAcquisition: csvValue }
            });
            successCount++;
        } else {
            failedMatches.push(csvRawName);
        }
    }

    console.log('\n--- Update Summary ---');
    console.log(`✅ Success: ${successCount} stores updated.`);
    console.log(`❌ Failed:  ${failedMatches.length} stores not found in DB.`);

    if (failedMatches.length > 0) {
        console.log('\n--- Failed Matches List ---');
        failedMatches.forEach(name => console.log(`- ${name}`));
    }
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
