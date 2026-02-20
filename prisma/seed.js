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

    // 2. Clear old stats and stores to prevent duplicates
    // We must delete child records (Sale, Comment) before deleting Store due to FK constraints
    await prisma.sale.deleteMany({});
    await prisma.comment.deleteMany({});
    await prisma.dailyStat.deleteMany({});
    await prisma.store.deleteMany({});
    console.log('Old data cleared (Stats, Sales, Comments, Stores).');

    // ... (Stats parsing remains the same)

    // 4. Seed Stores from shops.csv
    const storesFile = path.join(__dirname, '..', 'shops.csv');
    if (fs.existsSync(storesFile)) {
        console.log('Processing shops.csv for Stores...');
        const content = fs.readFileSync(storesFile, 'utf-8');
        const lines = content.split(/\r?\n/).filter(l => l.trim() !== '');

        const storeEntries = [];

        // Fallback centers just in case API fails completely
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

        // Skip header (i=1)
        console.log(`Found ${lines.length - 1} stores to process. Starting Geocoding (this will take time)...`);

        for (let i = 1; i < lines.length; i++) {
            // Regex for CSV split
            const cols = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

            if (cols.length < 5) continue;

            const ta = cols[0]?.trim();
            const name = cols[1]?.trim().replace(/\*/g, '');

            // Resolve Activator ID
            const activatorId = userMapDB[ta] || null;

            let area = cols[2]?.trim();
            let address = cols[3]?.trim();
            let zip = cols[4]?.trim(); // Might be acquisition if shifted?

            // Check if parsing alignment is correct or shifted due to missing columns?
            // Standard: TA, Name, Area, Address, Zip, TotalAcq
            // Coord row: TA, Name, Lat, Lng, TotalAcq, %

            let totalAcqStr = cols[5]?.trim();

            let lat = null;
            let lng = null;

            // Check if Area/Address are actually coordinates
            // Replace comma with dot for Greek notation
            const potentialLat = parseFloat(area?.replace(',', '.'));
            const potentialLng = parseFloat(address?.replace(',', '.'));

            if (!isNaN(potentialLat) && !isNaN(potentialLng) &&
                potentialLat > 34 && potentialLat < 42 && // Roughly Greece Lat
                potentialLng > 19 && potentialLng < 29) { // Roughly Greece Lng

                lat = potentialLat;
                lng = potentialLng;

                // If these are coords, then Zip is likely TotalAcquisition based on CSV structure for these rows?
                // Let's look at line 17: ... ,37.957444, 23.756611,8,"1,06..."
                // Col 4 is '8' which is TotalAcq.
                // So if Coords detected:
                // Area -> Lat, Address -> Lng, Zip -> TotalAcq

                totalAcqStr = zip;
                area = "Coordinates"; // Placeholder
                address = "Coordinates";
                console.log(`📍 Using provided coords for ${name}: ${lat}, ${lng}`);
            } else {
                // Standard Geocoding Flow
                // Wait 1.1 second to respect OSM rate limits (absolute requirement)
                await new Promise(r => setTimeout(r, 1100));
                const coords = await getCoordinates(address, area, zip);

                if (coords) {
                    lat = coords.lat;
                    lng = coords.lng;
                    console.log(`✅ Found: ${name} -> ${lat}, ${lng}`);
                } else {
                    const center = cityCenters[area] || cityCenters['Athina'];
                    lat = center.lat + (Math.random() - 0.5) * 0.005;
                    lng = center.lng + (Math.random() - 0.5) * 0.005;
                    console.log(`⚠️ Fallback: ${name}`);
                }
            }

            const totalAcq = parseInt(totalAcqStr) || 0;

            storeEntries.push({
                name,
                activatorName: ta,
                activatorId: activatorId, // Link to User
                area,
                address,
                postCode: zip,
                totalAcquisition: totalAcq,
                lat,
                lng,
                type: name.toLowerCase().includes('kiosk') || name.toLowerCase().includes('periptero') ? 'Kiosk' : 'Store'
            });


        }

        console.log(`Geocoding finished. Upserting ${storeEntries.length} stores...`);

        for (const s of storeEntries) {
            await prisma.store.create({ data: s });
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
