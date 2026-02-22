const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- 🔎 Database Audit: Duplicate Detection ---');

    // Fetch all active stores
    const stores = await prisma.store.findMany({
        where: { isActive: true }
    });

    const normalize = (val) => val?.replace(/\*/g, '').trim().toLowerCase() || '';

    // 1. Group by Name
    const nameGroups = {};
    // 2. Group by Address
    const addressGroups = {};

    stores.forEach(s => {
        const normName = normalize(s.name);
        const normAddr = normalize(s.address);

        if (!nameGroups[normName]) nameGroups[normName] = [];
        nameGroups[normName].push(s);

        if (normAddr && normAddr !== 'n/a' && normAddr !== '') {
            if (!addressGroups[normAddr]) addressGroups[normAddr] = [];
            addressGroups[normAddr].push(s);
        }
    });

    console.log('\n🚨 Duplicates by Name (Normalized):');
    let nameDupFound = false;
    Object.entries(nameGroups).forEach(([normName, group]) => {
        if (group.length > 1) {
            nameDupFound = true;
            console.log(`\nDuplicate Name: "${normName}" (${group.length} occurrences)`);
            group.forEach(s => {
                console.log(`   - [ID: ${s.id}] Name: "${s.name}" | Addr: "${s.address}" | Acq: ${s.totalAcquisition}`);
            });
        }
    });
    if (!nameDupFound) console.log('   (None found)');

    console.log('\n🚨 Duplicates by Address (Normalized):');
    let addrDupFound = false;
    Object.entries(addressGroups).forEach(([normAddr, group]) => {
        if (group.length > 1) {
            // Only report as address duplicate if names aren't already flagging it
            addrDupFound = true;
            console.log(`\nDuplicate Address: "${normAddr}" (${group.length} occurrences)`);
            group.forEach(s => {
                console.log(`   - [ID: ${s.id}] Name: "${s.name}" | Addr: "${s.address}" | Acq: ${s.totalAcquisition}`);
            });
        }
    });
    if (!addrDupFound) console.log('   (None found)');

    console.log('\n------------------------------------------');
    console.log('💡 How to read: Check the "Acq" (Acquisitions) column.');
    console.log('   If one has sales and the other is 0, keep the one with sales.');
    console.log('------------------------------------------');
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
