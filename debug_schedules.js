const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Users ---');
    const users = await prisma.user.findMany();
    users.forEach(u => console.log(`ID: ${u.id}, Name: ${u.name}, Role: ${u.role}`));

    console.log('\n--- Schedules ---');
    const schedules = await prisma.schedule.findMany({
        include: {
            user: {
                select: { name: true }
            },
            store: {
                select: { name: true }
            }
        }
    });

    if (schedules.length === 0) {
        console.log('No schedules found.');
    } else {
        schedules.forEach(s => {
            console.log(`ID: ${s.id}, Date: ${s.date.toISOString()}, userId (DB): "${s.userId}", Linked User Name: "${s.user?.name || 'MISSING'}"`);
        });
    }

    const total = await prisma.schedule.count();
    console.log(`\nTotal Schedules: ${total}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
