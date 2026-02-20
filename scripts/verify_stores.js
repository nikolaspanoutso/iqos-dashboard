const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const stores = await prisma.store.findMany({
        orderBy: {
            totalAcquisition: 'desc'
        }
    });
    console.log('--- DETAILED STORE ACQUISITION AUDIT ---');
    console.log(`Total Stores Found: ${stores.length}`);
    console.log('-----------------------------------------------');
    console.log('Store Name | Total Acquisition');
    console.log('-----------------------------------------------');

    let total = 0;
    stores.forEach(store => {
        const val = store.totalAcquisition || 0;
        const numVal = typeof val === 'number' ? val : (parseInt(val) || 0);
        total += numVal;

        console.log(`${store.name.padEnd(40)} | ${numVal}`);
    });

    console.log('-----------------------------------------------');
    console.log(`🔢 FINAL SUM IN DATABASE: ${total}`);
    console.log('-----------------------------------------------');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
