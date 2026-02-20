const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- RECENT DATABASE ENTRIES ---\n');

    try {
        // 1. Recent Sales
        console.log('>> LAST 5 SALES:');
        const sales = await prisma.sale.findMany({
            take: 5,
            orderBy: { timestamp: 'desc' },
            include: {
                user: { select: { name: true } },
                store: { select: { name: true } }
            }
        });

        if (sales.length === 0) console.log('No sales found.');
        sales.forEach(s => {
            console.log(`[${s.timestamp.toLocaleString('el-GR')}] User: ${s.user.name} | Store: ${s.store.name} | Type: ${s.type} | Count: ${s.count}`);
        });

        // 2. Recent Schedule Updates
        console.log('\n>> LAST 5 SCHEDULE ENTRIES (by Created/Updated):');
        const schedules = await prisma.schedule.findMany({
            take: 5,
            orderBy: { updatedAt: 'desc' },
            include: {
                user: { select: { name: true } }
            }
        });

        if (schedules.length === 0) console.log('No schedule entries found.');
        schedules.forEach(sc => {
            console.log(`[Updated: ${sc.updatedAt.toLocaleString('el-GR')}] User: ${sc.user.name} | Date: ${sc.date.toLocaleDateString('el-GR')} | Status: ${sc.status}`);
        });

        // 3. Recent Daily Stats
        console.log('\n>> LAST 5 DAILY STATS (Top entries):');
        const stats = await prisma.dailyStat.findMany({
            take: 5,
            orderBy: [{ date: 'desc' }, { id: 'desc' }],
        });

        if (stats.length === 0) console.log('No daily stats found.');
        stats.forEach(st => {
            console.log(`Date: ${st.date} | User: ${st.userId} | P1: ${st.acquisitionP1} | P4: ${st.acquisitionP4} | P5: ${st.offtakeP5}`);
        });

    } catch (error) {
        console.error('Error fetching data:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
