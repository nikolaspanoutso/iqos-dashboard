const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function dedupe() {
    console.log('Starting store deduplication...');

    try {
        const allStores = await prisma.store.findMany({
            orderBy: { createdAt: 'desc' }
        });

        console.log(`Initial store count: ${allStores.length}`);

        const seenNames = new Set();
        const toKeep = [];
        const toDelete = [];

        for (const store of allStores) {
            // Normalize name by removing asterisks and trimming
            const cleanName = store.name.replace(/\*/g, '').trim();

            if (seenNames.has(cleanName)) {
                toDelete.push(store.id);
            } else {
                seenNames.add(cleanName);
                toKeep.push(store);
            }
        }

        console.log(`Identifying ${toDelete.length} duplicates to remove...`);

        if (toDelete.length > 0) {
            // Delete in batches to avoid URL length issues or payload limits if necessary, 
            // but for 35 records, a single deleteMany is fine.
            const result = await prisma.store.deleteMany({
                where: {
                    id: { in: toDelete }
                }
            });
            console.log(`Successfully deleted ${result.count} duplicate records.`);
        } else {
            console.log('No duplicates found.');
        }

        const finalCount = await prisma.store.count();
        console.log(`Final store count: ${finalCount}`);

    } catch (error) {
        console.error('Error during deduplication:', error);
    } finally {
        await prisma.$disconnect();
    }
}

dedupe();
