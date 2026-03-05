const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Cleaning up "System - Specialist Adjustments" store...');
    const result = await prisma.store.deleteMany({
        where: { name: 'System - Specialist Adjustments' }
    });
    console.log(`✅ Deleted ${result.count} system adjustment store(s).`);
}

main()
    .then(async () => await prisma.$disconnect())
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
    });
