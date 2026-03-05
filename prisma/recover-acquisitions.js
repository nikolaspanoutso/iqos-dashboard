const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting Database Recovery (Syncing DailyStat -> Store Totals)...');

    // 1. Fetch all Daily Stats (these represent all UI sales and history edits)
    const dailyStats = await prisma.dailyStat.findMany();
    console.log(`📊 Found ${dailyStats.length} daily stat records.`);

    // 2. Map of storeId -> total to add
    const storeAdjustments = new Map();

    for (const stat of dailyStats) {
        if (stat.acquisitionP1 <= 0) continue;

        // Convert DD/MM/YYYY to Date object for Schedule lookup
        const [day, month, year] = stat.date.split('/').map(Number);
        const dateObj = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

        // Find the schedule for this user on this day to identify the store
        const schedule = await prisma.schedule.findUnique({
            where: {
                userId_date: {
                    userId: stat.userId,
                    date: dateObj
                }
            }
        });

        if (schedule && schedule.storeId) {
            const current = storeAdjustments.get(schedule.storeId) || 0;
            storeAdjustments.set(schedule.storeId, current + stat.acquisitionP1);
        } else {
            console.warn(`   ⚠️ No store found in schedule for ${stat.userId} on ${stat.date}. Skipping ${stat.acquisitionP1} acquisitions.`);
        }
    }

    // 3. Apply adjustments to Stores
    console.log(`\n🔄 Applying adjustments to ${storeAdjustments.size} stores...`);
    for (const [storeId, amount] of storeAdjustments.entries()) {
        try {
            const updated = await prisma.store.update({
                where: { id: storeId },
                data: {
                    totalAcquisition: { increment: amount }
                }
            });
            console.log(`   ✅ Adjusted ${updated.name}: +${amount} (New Total: ${updated.totalAcquisition})`);
        } catch (e) {
            console.error(`   ❌ Failed to update store ${storeId}: ${e.message}`);
        }
    }

    console.log('\n✨ Recovery complete. All UI sales and history edits have been synchronized back to the Store totals.');
}

main()
    .then(async () => await prisma.$disconnect())
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
