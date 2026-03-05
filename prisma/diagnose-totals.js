const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const stats = await prisma.dailyStat.findMany();
    console.log('--- Daily Stats ---');
    console.log(`Total records: ${stats.length}`);
    stats.forEach(s => {
        console.log(`[${s.date}] User: ${s.userId} | P1: ${s.acquisitionP1} | P4: ${s.acquisitionP4}`);
    });

    const stores = await prisma.store.findMany({
        where: { totalAcquisition: { gt: 0 } },
        take: 10
    });
    console.log('\n--- Stores with Acquisitions > 0 ---');
    stores.forEach(st => {
        console.log(`Store: ${st.name} | Total: ${st.totalAcquisition}`);
    });

    const specialists = await prisma.user.findMany({
        where: { role: 'specialist' }
    });
    console.log('\n--- Specialists ---');
    specialists.forEach(u => {
        console.log(`User: ${u.name}`);
    });
}

main().then(async () => await prisma.$disconnect());
