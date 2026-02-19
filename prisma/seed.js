const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Start seeding...');

    // 1. Create Users
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
    console.log('Users seeded.');

    // 2. Clear old stats to avoid duplicates during re-seeding (optional, but cleaner)
    await prisma.dailyStat.deleteMany({});
    console.log('Old stats cleared.');

    // 3. Generate Daily Stats for Jan & Feb 2026
    // We will simulate data from Jan 1st to Feb 18th (Current Date)
    const startDate = new Date('2026-01-01');
    const endDate = new Date('2026-02-18');

    const specialistNames = users.filter(u => u.role === 'specialist').map(u => u.name);

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        // Skip Sundays (0)
        if (d.getDay() === 0) continue;

        const dateStr = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;

        for (const name of specialistNames) {
            // Random performance factors
            // Some people perform better than others to create variety
            const performanceFactor = name === 'Nikolas Panoutsopoulos' ? 1.2 :
                name === 'Maria Tasiou' ? 1.1 : 0.9;

            // Random daily sales based on targets (approx 1.7 P1/day, 0.7 P4/day)
            const p1 = Math.floor(Math.random() * 4 * performanceFactor); // 0 to ~4
            const p4 = Math.floor(Math.random() * 2 * performanceFactor); // 0 to ~2
            const p5 = Math.floor(Math.random() * 15); // Offtake

            await prisma.dailyStat.create({
                data: {
                    date: dateStr,
                    userId: name,
                    acquisitionP1: p1,
                    acquisitionP4: p4,
                    offtakeP5: p5,
                    workingDays: 1, // Each entry counts as 1 working day
                }
            });
        }
    }

    console.log('Sales data seeded for February.');
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
