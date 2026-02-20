const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function countStores() {
    try {
        const total = await prisma.store.count();
        const active = await prisma.store.count({ where: { isActive: true } });
        const promo = await prisma.store.findMany({ where: { isActive: true } });

        // Using the isPromo logic from our utility
        const promoCount = promo.filter(s => {
            const name = s.name.trim();
            return name.endsWith('*') || name.endsWith('(*)');
        }).length;

        console.log('--- Store Statistics ---');
        console.log(`Total Records:    ${total}`);
        console.log(`Active Stores:    ${active}`);
        console.log(`Promo Stores:     ${promoCount}`);
        console.log('------------------------');
    } catch (error) {
        console.error('Error counting stores:', error);
    } finally {
        await prisma.$disconnect();
    }
}

countStores();
