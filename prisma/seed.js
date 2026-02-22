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

// Real Geocoding using OpenStreetMap Nominatim API
const getCoordinates = async (address, area, zip) => {
    try {
        // Construct query: Address + Area helps accuracy
        // Clean address: keep it simple
        const cleanAddress = address.replace(/"/g, '').trim();
        const cleanArea = area.replace(/"/g, '').trim();

        // Prefer "Address, Area" format
        const query = `${cleanAddress}, ${cleanArea}, Greece`;
        console.log(`Geocoding: ${query}`);

        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'IQOS_Dashboard_Seed_Script/1.0'
            }
        });

        const data = await response.json();

        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon)
            };
        }
    } catch (e) {
        console.warn(`Geocode error for ${address}:`, e.message);
    }
    return null;
};

async function main() {
    console.log('Start seeding...');

    // 1. Ensure Users Exist
    const predefinedUsers = [
        { name: 'Maria Tasiou', role: 'specialist' },
        { name: 'Nikos Mousas', role: 'specialist' },
        { name: 'Giwrgos Grimanis', role: 'specialist' },
        { name: 'Nikolas Panoutsopoulos', role: 'specialist' },
        { name: 'Nefeli Merko', role: 'specialist' },
        { name: 'Admin User', role: 'admin' },
        // New Activators matching CSV names (normalized if needed, but CSV has UPPERCASE usually)
        { name: 'MICHALOPOULOS DIMITRIS', role: 'activator' },
        { name: 'Karagiannis Dimitris', role: 'activator' }
    ];

    const userMapDB = {}; // name -> id

    for (const user of predefinedUsers) {
        const u = await prisma.user.upsert({
            where: { name: user.name },
            update: { role: user.role },
            create: user,
        });
        userMapDB[user.name] = u.id;
    }
    console.log('Users synced.');

    // 2. Clear old stats (Sales, Comments, etc) but KEEP Stores to preserve Geocoding
    await prisma.sale.deleteMany({});
    await prisma.comment.deleteMany({});
    await prisma.dailyStat.deleteMany({});
    // await prisma.store.deleteMany({}); // <--- CHANGED: Do not delete stores
    console.log('Old stats cleared. Updating Stores...');

    // 3. Seed Daily Stats from january.csv and february.csv
    const monthlyFiles = ['january.csv', 'february.csv'];
    for (const file of monthlyFiles) {
        const filePath = path.join(__dirname, '..', file);
        if (fs.existsSync(filePath)) {
            console.log(`Processing ${file}...`);
            const stats = await parseCSV(filePath);
            console.log(`Found ${stats.length} stats entries.`);

            for (const stat of stats) {
                // Find user by name to ensure ID (we have userMapDB but CSV names might match slightly differently? 
                // Let's assume names match or we skip.
                const userId = userMapDB[stat.userId];
                if (!userId) {
                    // Try to find if user exists but wasn't in predefined (e.g. from shops.csv later?)
                    // For now, only insert if user is known.
                    // console.warn(`Skipping stat for unknown user: ${stat.userId}`);
                    continue;
                }

                await prisma.dailyStat.upsert({
                    where: {
                        date_userId: {
                            date: stat.date,
                            userId: stat.userId
                        }
                    },
                    create: {
                        date: stat.date,
                        userId: stat.userId,
                        acquisitionP1: stat.acquisitionP1,
                        acquisitionP4: stat.acquisitionP4,
                        offtakeP5: stat.offtakeP5,
                        workingDays: stat.workingDays
                    },
                    update: {
                        acquisitionP1: stat.acquisitionP1,
                        acquisitionP4: stat.acquisitionP4,
                        offtakeP5: stat.offtakeP5,
                        workingDays: stat.workingDays
                    }
                });
            }
            console.log(`Imported stats from ${file}.`);
        } else {
            console.warn(`File not found: ${file}`);
        }
    }

    // 4. Seed Stores from shops.csv
    const storesFile = path.join(__dirname, '..', 'shops.csv');
    if (fs.existsSync(storesFile)) {
        console.log('Processing shops.csv for Stores...');
        const content = fs.readFileSync(storesFile, 'utf-8');
        const lines = content.split(/\r?\n/).filter(l => l.trim() !== '');

        // Pre-fetch existing stores to avoid re-geocoding
        // Use a "clean" name (no asterisks) for the lookup key
        const existingStores = await prisma.store.findMany();
        const storeMap = new Map(existingStores.map(s => [s.name.replace(/\*/g, '').trim(), s]));

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

        console.log(`Found ${lines.length - 1} stores in CSV.`);

        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            if (cols.length < 5) continue;

            const ta = cols[0]?.trim();
            const name = cols[1]?.trim();
            const activatorId = userMapDB[ta] || null;
            let area = cols[2]?.trim();
            let address = cols[3]?.trim();
            let zip = cols[4]?.trim();
            // Inconsistent CSV: Some lines have City, some don't.
            // If City is missing, TotalAcq might be in cols[4] instead of cols[5].
            let totalAcqStr = cols[5]?.trim();

            // Check if cols[4] is the acquisition (small number) and cols[5] is the percentage (contains % or comma)
            const col4Int = parseInt(cols[4]?.trim());
            const col5IsPercent = cols[5]?.includes('%') || cols[5]?.includes('"') || cols[5]?.includes(',');

            if (!isNaN(col4Int) && col5IsPercent) {
                // Shift detected: City is missing
                zip = ""; // Zip is likely mixed in address or missing
                totalAcqStr = cols[4]?.trim();
                // area/address adjustments might be needed but for now let's just get the acquisition right
            }

            let lat = null;
            let lng = null;

            // 1. Check for Split Coordinates (Parsing Error Recovery)
            const latInt = parseInt(cols[2]?.trim());
            const lngInt = parseInt(cols[4]?.trim());

            if (!isNaN(latInt) && latInt >= 34 && latInt <= 42 &&
                !isNaN(lngInt) && lngInt >= 19 && lngInt <= 30) {

                const latPart2 = cols[3]?.trim();
                const lngPart2 = cols[5]?.trim();

                lat = parseFloat(`${latInt}.${latPart2}`);
                lng = parseFloat(`${lngInt}.${lngPart2}`);

                totalAcqStr = cols[6]?.trim();
                area = "Coordinates";
                address = "Coordinates";
                zip = "";

                console.log(`🔧 Fixed split coords for ${name}`);
            }

            // 2. Check for Manual Coordinates (if not found yet)
            if (!lat || !lng) {
                const potentialLat = parseFloat(area?.replace(',', '.'));
                const potentialLng = parseFloat(address?.replace(',', '.'));

                if (!isNaN(potentialLat) && !isNaN(potentialLng) &&
                    potentialLat > 34 && potentialLat < 42 &&
                    potentialLng > 19 && potentialLng < 29) {

                    lat = potentialLat;
                    lng = potentialLng;

                    // Only overwrite totalAcqStr if it is empty! 
                    // If a shift was already detected, preserve that value.
                    if (!totalAcqStr || totalAcqStr === '0' || totalAcqStr === '') {
                        totalAcqStr = zip;
                    }

                    area = "Coordinates";
                    address = "Coordinates";
                }
            }

            // 3. DB Cache (if not found yet)
            if (!lat || !lng) {
                // Lookup using clean name to bridge the asterisk difference
                const cleanName = name.replace(/\*/g, '').trim();
                const existing = storeMap.get(cleanName);
                if (existing && existing.lat && existing.lng) {
                    lat = existing.lat;
                    lng = existing.lng;
                }
            }

            // 4. Geocoding / Fallback (if not found yet)
            if (!lat || !lng) {
                // Skip real geocoding for now to speed up, use falback
                const center = cityCenters[area] || cityCenters['Athina'];
                lat = center.lat + (Math.random() - 0.5) * 0.005;
                lng = center.lng + (Math.random() - 0.5) * 0.005;
                console.log(`⚠️ Fallback: ${name}`);
            }

            const totalAcq = parseInt(totalAcqStr) || 0;

            const storeData = {
                activatorName: ta,
                activatorId: activatorId,
                area,
                address,
                postCode: zip,
                totalAcquisition: totalAcq,
                lat,
                lng,
                type: name.toLowerCase().includes('kiosk') || name.toLowerCase().includes('periptero') ? 'Kiosk' : 'Store',
                isActive: true
            };

            // 1. Check for exact match
            let targetId = null;
            const exactMatch = await prisma.store.findUnique({
                where: { name: name }
            });

            if (exactMatch) {
                targetId = exactMatch.id;
            } else {
                // 2. Check for "Plain" version match (if current name is Promo)
                // This prevents duplicates when a shop becomes Promo in the CSV
                if (name.includes('*')) {
                    const plainName = name.replace(/\*/g, '').trim();
                    const plainMatch = await prisma.store.findUnique({
                        where: { name: plainName }
                    });
                    if (plainMatch) {
                        targetId = plainMatch.id;
                        console.log(`🔄 Upgrading to Promo: ${plainName} -> ${name}`);
                    }
                }
            }

            // Upsert Logic 
            if (targetId) {
                await prisma.store.update({
                    where: { id: targetId },
                    data: { name, ...storeData }
                });
            } else {
                await prisma.store.create({
                    data: { name, ...storeData }
                });
            }
            process.stdout.write('.');
        }
        console.log('\nStores synced successfully.');
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
