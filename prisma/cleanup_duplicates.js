const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
    console.log('--- Starting Final Store Cleanup ---');

    try {
        const allStores = await prisma.store.findMany();
        console.log(`Initial record count: ${allStores.length}`);

        const groups = {}; // Normalized Name -> List of stores

        allStores.forEach(s => {
            const normalized = s.name.replace(/\*/g, '').trim().toLowerCase();
            if (!groups[normalized]) groups[normalized] = [];
            groups[normalized].push(s);
        });

        const toDelete = [];
        let duplicatesFound = 0;

        for (const [normalized, list] of Object.entries(groups)) {
            if (list.length > 1) {
                duplicatesFound++;
                console.log(`Processing duplicates for: "${normalized}" (${list.length} found)`);

                // Preferred record: The one that HAS an asterisk
                let winner = list.find(s => s.name.includes('*'));

                // If none has an asterisk (unexpected but safe), pick the first/latest
                if (!winner) winner = list[0];

                // Mark others for deletion
                list.forEach(s => {
                    if (s.id !== winner.id) {
                        toDelete.push(s.id);
                        console.log(`  - Marking for deletion: "${s.name}" (ID: ${s.id})`);
                    } else {
                        console.log(`  + Keeping: "${s.name}" (ID: ${s.id})`);
                    }
                });
            }
        }

        if (toDelete.length > 0) {
            console.log(`\nDeleting ${toDelete.length} redundant records...`);
            const result = await prisma.store.deleteMany({
                where: { id: { in: toDelete } }
            });
            console.log(`Successfully removed ${result.count} duplicates.`);
        } else {
            console.log('No duplicates found according to normalization rules.');
        }

        const finalCount = await prisma.store.count();
        console.log(`\nFinal record count: ${finalCount}`);

        if (finalCount === 95) {
            console.log('✅ TARGET REACHED: 95 stores.');
        } else {
            console.log(`⚠️  Warning: Final count is ${finalCount}, expected 95.`);
        }

    } catch (error) {
        console.error('Fatal error during cleanup:', error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanup();
