const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- 📊 Database Audit: Store Statistics ---');

    // 1. Total Count
    const totalStores = await prisma.store.count();

    // 2. Breakdown by Activator
    // We fetch all activators to match names with counts
    const activators = await prisma.user.findMany({
        where: { role: 'activator' },
        select: { id: true, name: true }
    });

    const counts = await prisma.store.groupBy({
        by: ['activatorId'],
        _count: { _all: true }
    });

    // 3. Coordinate Check
    const missingCoords = await prisma.store.count({
        where: {
            OR: [
                { lat: 0 },
                { lng: 0 },
                { lat: null },
                { lng: null }
            ]
        }
    });

    console.log(`\n🔹 Total Shops in Database: ${totalStores}`);

    console.log('\n🔹 Breakdown per Trade Activator:');
    const activatorMap = new Map(activators.map(a => [a.id, a.name]));

    let unassignedCount = 0;
    counts.forEach(c => {
        const name = activatorMap.get(c.activatorId) || 'Unassigned / System';
        if (!c.activatorId) {
            unassignedCount += c._count._all;
        } else {
            console.log(`   - ${name.padEnd(25)} : ${c._count._all} shops`);
        }
    });
    if (unassignedCount > 0) {
        console.log(`   - ${'Unassigned / System'.padEnd(25)} : ${unassignedCount} shops`);
    }

    console.log(`\n🔹 Geocoding Quality Check:`);
    console.log(`   - Shops with 0,0 coordinates: ${missingCoords}`);

    if (missingCoords > 0) {
        console.log('\n⚠️  Notice: Run the geocoding audit script to fix zero coordinates.');
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
