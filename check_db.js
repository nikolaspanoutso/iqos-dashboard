const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const stores = await prisma.store.findMany();
    console.log(`Total Stores in DB: ${stores.length}`);

    const totalAcquisition = stores.reduce((acc, s) => acc + (s.totalAcquisition || 0), 0);
    console.log(`Total Acquisition Sum: ${totalAcquisition}`);

    // check for similar names
    const names = stores.map(s => s.name);
    console.log('First 10 store names:', names.slice(0, 10));
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
