const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = [
        { name: 'Maria Tasiou', role: 'specialist' },
        { name: 'Nikos Mousas', role: 'specialist' },
        { name: 'Giwrgos Grimanis', role: 'specialist' },
        { name: 'Nikolas Panoutsopoulos', role: 'specialist' },
        { name: 'Nefeli Merko', role: 'specialist' },
        { name: 'Admin User', role: 'admin' },
    ];

    for (const user of users) {
        await prisma.user.upsert({
            where: { name: user.name },
            update: {},
            create: user,
        });
    }

    console.log('Seed data created.');
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
