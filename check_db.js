const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const storeCount = await prisma.store.count();
        console.log(`Stores in DB: ${storeCount}`);

        const stores = await prisma.store.findMany({ take: 5 });
        console.log('First 5 stores:', stores);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
