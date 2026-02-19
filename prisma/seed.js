const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function parseCSV(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');

    // Row 1: Headers with Names e.g. "Date,Name1,,,Name2,,,"
    const headerLine = lines[0];
    const headers = headerLine.split(',');

    // Map column index to User Name
    const userMap = {};

    // Skip Col 0 (Date)
    for (let i = 1; i < headers.length; i++) {
        const cell = headers[i].trim();
        if (cell && cell !== 'Average') {
            userMap[i] = cell;
        }
    }

    const dataEntries = [];

    // Row 3 onwards is data
    for (let i = 2; i < lines.length; i++) {
        const line = lines[i];

        // CSV regex split to handle quotes if any, purely for robust parsing
        // But here simple split is likely enough as numbers don't have commas usually in this format
        // except averages? The user data seemed simple.
        const cols = line.split(',');

        const date = cols[0];
        if (!date) continue;

        // Iterate through identified users
        for (const [startIndexStr, userName] of Object.entries(userMap)) {
            const startIndex = parseInt(startIndexStr);

            const rawP1 = cols[startIndex];
            const rawP4 = cols[startIndex + 1];
            const rawP5 = cols[startIndex + 2];

            // If ALL fields are empty strings, it's a non-working day
            if ((rawP1 === undefined || rawP1.trim() === '') &&
                (rawP4 === undefined || rawP4.trim() === '') &&
                (rawP5 === undefined || rawP5.trim() === '')) {
                continue;
            }

            const p1 = parseInt(rawP1) || 0;
            const p4 = parseInt(rawP4) || 0;
            const p5 = parseInt(rawP5) || 0;

            // workingDays logic:
            // 1. Must be BEFORE today (past days only)
            const [d, m, y] = date.split('/').map(Number);
            const entryDate = new Date(y, m - 1, d);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const isPast = entryDate < today;

            dataEntries.push({
                date,
                userId: userName,
                acquisitionP1: p1,
                acquisitionP4: p4,
                offtakeP5: p5,
                workingDays: isPast ? 1 : 0
            });
        }
    }

    return dataEntries;
}

async function main() {
    console.log('Start seeding from CSVs...');

    // 1. Ensure Users Exist
    const predefinedUsers = [
        { name: 'Maria Tasiou', role: 'specialist' },
        { name: 'Nikos Mousas', role: 'specialist' },
        { name: 'Giwrgos Grimanis', role: 'specialist' },
        { name: 'Nikolas Panoutsopoulos', role: 'specialist' },
        { name: 'Nefeli Merko', role: 'specialist' },
        { name: 'Admin User', role: 'admin' },
    ];

    for (const user of predefinedUsers) {
        await prisma.user.upsert({
            where: { name: user.name },
            update: {},
            create: user,
        });
    }
    console.log('Users synced.');

    // 2. Clear old stats
    // await prisma.dailyStat.deleteMany({}); // Optional: clear or keep? User might want to refresh.
    // Let's clear to be safe with duplicates.
    await prisma.dailyStat.deleteMany({});
    console.log('Old stats cleared.');

    // 3. Process Sales CSVs
    const files = ['january.csv', 'february.csv'];
    const entriesMap = new Map();

    for (const file of files) {
        const filePath = path.join(__dirname, '..', file);
        if (fs.existsSync(filePath)) {
            console.log(`Processing ${file}...`);
            const entries = await parseCSV(filePath);
            console.log(`Found ${entries.length} entries in ${file}.`);

            for (const entry of entries) {
                const key = `${entry.date}_${entry.userId}`;
                entriesMap.set(key, entry);
            }
        }
    }

    const uniqueEntries = Array.from(entriesMap.values());
    console.log(`Total unique entries to insert: ${uniqueEntries.length}`);

    if (uniqueEntries.length > 0) {
        const chunkSize = 50;
        for (let i = 0; i < uniqueEntries.length; i += chunkSize) {
            const chunk = uniqueEntries.slice(i, i + chunkSize);
            await prisma.dailyStat.createMany({
                data: chunk
            });
        }
    }

    // 4. Seed Stores from shops.csv
    const storesFile = path.join(__dirname, '..', 'shops.csv');
    if (fs.existsSync(storesFile)) {
        console.log('Processing shops.csv for Stores...');
        const content = fs.readFileSync(storesFile, 'utf-8');
        const lines = content.split(/\r?\n/).filter(l => l.trim() !== '');

        const storeEntries = [];

        // Basic Geocoding Fallback
        const cityCenters = {
            'Athina': { lat: 37.9838, lng: 23.7275 },
            'Zografou': { lat: 37.9715, lng: 23.7610 },
            'Galatsi': { lat: 38.0093, lng: 23.7571 },
            'Vironas': { lat: 37.9593, lng: 23.7507 },
            'Kesariani': { lat: 37.9667, lng: 23.7667 },
            'Chania': { lat: 35.5138, lng: 24.0180 },
            'Moschato': { lat: 37.9546, lng: 23.6811 },
            'Menemeni': { lat: 40.6558, lng: 22.9095 }
        };

        const getLatLang = (city) => {
            const center = cityCenters[city] || cityCenters['Athina'];
            const jitter = () => (Math.random() - 0.5) * 0.01;
            return {
                lat: center.lat + jitter(),
                lng: center.lng + jitter()
            };
        };

        for (let i = 1; i < lines.length; i++) {
            // Regex for CSV split handling quotes
            const cols = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

            if (cols.length < 5) continue;

            const ta = cols[0]?.trim();
            const name = cols[1]?.trim().replace(/\*/g, '');
            const area = cols[2]?.trim();
            const address = cols[3]?.trim();
            const zip = cols[4]?.trim();
            const totalAcqStr = cols[5]?.trim();
            const totalAcq = parseInt(totalAcqStr) || 0;

            const { lat, lng } = getLatLang(area);

            storeEntries.push({
                name,
                activatorName: ta,
                area,
                address,
                postCode: zip,
                totalAcquisition: totalAcq,
                lat,
                lng,
                type: name.toLowerCase().includes('kiosk') || name.toLowerCase().includes('periptero') ? 'Kiosk' : 'Store'
            });
        }

        console.log(`Found ${storeEntries.length} stores. Upserting...`);

        for (const s of storeEntries) {
            const existing = await prisma.store.findFirst({ where: { name: s.name } });
            if (existing) {
                await prisma.store.update({
                    where: { id: existing.id },
                    data: s
                });
            } else {
                await prisma.store.create({
                    data: s
                });
            }
        }
    }

    console.log('Seeding completed successfully.');
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
