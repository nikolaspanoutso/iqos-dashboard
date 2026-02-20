const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
    console.log('--- Cleaning up Stats for Non-Specialists ---');

    try {
        // Find daily stats for non-specialists
        const statsToDelete = await prisma.dailyStat.findMany({
            where: {
                user: {
                    role: {
                        in: ['admin', 'activator']
                    }
                }
            }
        });

        console.log(`Found ${statsToDelete.length} records to remove.`);

        if (statsToDelete.length > 0) {
            const ids = statsToDelete.map(s => s.id);
            const result = await prisma.dailyStat.deleteMany({
                where: {
                    id: { in: ids }
                }
            });
            console.log(`Successfully deleted ${result.count} stat records.`);
        } else {
            console.log('No stats found for non-specialists.');
        }

        console.log('\nCleanup completed.');

    } catch (error) {
        console.error('Fatal error during cleanup:', error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanup();
