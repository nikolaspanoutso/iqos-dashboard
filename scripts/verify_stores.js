const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const stores = await prisma.store.findMany();
    console.log('--- Store Data Analysis ---');
    console.log(`Total Stores: ${stores.length}`);

    let total = 0;
    stores.forEach(store => {
        const val = store.totalAcquisition;

        // Check specific stores user mentioned
        if (store.name.includes('PICK IT') || store.name.includes('ΚΡΑΨΙΤΗΣ') || store.name.includes('ΠΑΠΑΖΙΚΟΣ')) {
            console.log(`🎯 CHECK: ${store.name} | DB Value: ${val}`);
        }

        if (typeof val === 'number') {
            total += val;
        } else {
            const parsed = parseInt(val);
            if (!isNaN(parsed)) total += parsed;
        }
    });

    console.log(`-----------------------------------------------`);
    console.log(`🔢 TOTAL ACQUISITIONS IN DB: ${total}`);
    console.log(`-----------------------------------------------`);
    console.log(`Total Stores Counted: ${stores.length}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
