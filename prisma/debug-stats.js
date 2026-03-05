const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const stats = await prisma.dailyStat.findMany({
        orderBy: { date: 'asc' }
    });
    console.log('Daily Stats:');
    stats.forEach(s => {
        console.log(`[${s.date}] User: ${s.userId.padEnd(20)} | P1: ${s.acquisitionP1} | P4: ${s.acquisitionP4} | P5: ${s.offtakeP5}`);
    });
}

main()
    .then(async () => await prisma.$disconnect())
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
    });
