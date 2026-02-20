const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const stores = await prisma.store.findMany();
    console.log('--- Store Data Analysis ---');
    console.log(`Total Stores: ${stores.length}`);

    let total = 0;
    let invalid = 0;

    stores.forEach(store => {
        // Check type of totalAcquisition
        const val = store.totalAcquisition;
        const type = typeof val;
        console.log(`Store: ${store.name.substring(0, 20)}... | Val: ${val} | Type: ${type}`);

        if (typeof val === 'number') {
            total += val;
        } else {
            invalid++;
            // Try parsing
            const parsed = parseInt(val);
            if (!isNaN(parsed)) total += parsed;
        }
    });

    console.log(`Calculated Total: ${total}`);
    console.log(`Invalid Types: ${invalid}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
