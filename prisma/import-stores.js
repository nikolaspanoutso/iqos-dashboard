const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Bounding Box of Greece for Nominatim
const GREECE_VIEWBOX = "19.3,41.8,28.5,34.8";

/**
 * Normalizes address for Greek context (e.g., "116 Imittou" -> "Imittou 116")
 */
function normalizeAddress(address) {
    if (!address) return '';
    let clean = address.replace(/"/g, '').replace(/\*/g, '').trim();

    // Check for "Number Name" (e.g., "116 Imittou") and flip to "Name Number"
    const match = clean.match(/^(\d+)\s+(.+)$/);
    if (match) {
        return `${match[2]} ${match[1]}`;
    }
    return clean;
}

/**
 * Robust geocoding using the "proven" headers and logic
 */
const getCoordinates = async (address, city, zip, ptpName, cache) => {
    // 1. Cache Check
    const cleanAddr = address.trim();
    const cleanCity = city.trim();
    const cacheKey = `${cleanAddr}|${cleanCity}`.toLowerCase();

    if (cache && cache.has(cacheKey)) {
        console.log(`   💎 Cached: ${ptpName}`);
        return cache.get(cacheKey);
    }

    // 2. Query Formations
    const streetNorm = normalizeAddress(address);
    const queries = [
        `${streetNorm}, ${zip}, ${cleanCity}, Greece`, // Full
        `${streetNorm}, ${cleanCity}, Greece`,        // City only
        `${cleanAddr}, ${cleanCity}, Greece`,         // Original
    ];

    for (const query of queries) {
        try {
            console.log(`   🔍 Search: ${query}`);
            // Use search?q= format with viewbox for better accuracy
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1&viewbox=${GREECE_VIEWBOX}&bounded=1`;

            const response = await fetch(url, {
                headers: {
                    // EXACT headers from successful run-geocoding-audit.js
                    'User-Agent': 'IQOS-Dashboard-Geocoding-Tool/1.0 (nikolaspanoutso@gmail.com) Node.js-Fetch',
                    'Accept': 'application/json',
                    'Referer': 'https://iqos-dashboard-deploy.vercel.app/'
                }
            });

            if (!response.ok) {
                console.warn(`      ⚠️ HTTP ${response.status}`);
                if (response.status === 429) {
                    console.log('      🛑 Rate limited. Cooling down 10s...');
                    await new Promise(r => setTimeout(r, 10000));
                }
                continue;
            }

            const data = await response.json();
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);
                console.log(`      ✅ Found: ${lat}, ${lon}`);
                return { lat, lng: lon };
            }

            // Normal delay per query
            await new Promise(r => setTimeout(r, 1500));
        } catch (e) {
            console.warn(`      ⚠️ Failed: ${e.message}`);
        }
    }

    return null;
};

async function main() {
    console.log('🚀 Starting Proven Store Import from Stores1.csv...');

    const filePath = path.join(__dirname, '..', 'Stores1.csv');
    if (!fs.existsSync(filePath)) {
        console.error('❌ Stores1.csv not found!');
        return;
    }

    // 1. Snapshot existing coords
    const existing = await prisma.store.findMany();
    const coordinateCache = new Map();
    const ATHENS_LAT = 37.9838;
    const ATHENS_LNG = 23.7275;

    existing.forEach(s => {
        // Only cache if they are NOT the default Athens center (i.e. if they were found before)
        const isNotDefault = (Math.abs(s.lat - ATHENS_LAT) > 0.0001) || (Math.abs(s.lng - ATHENS_LNG) > 0.0001);
        if (s.address && s.area && s.lat && s.lng && isNotDefault) {
            coordinateCache.set(`${s.address}|${s.area}`.toLowerCase(), { lat: s.lat, lng: s.lng });
        }
    });

    // 2. Clear Database (Cascade delete dependent records)
    console.log('🗑️ Emptying the base...');
    await prisma.sale.deleteMany({});
    await prisma.comment.deleteMany({});
    await prisma.schedule.deleteMany({});
    await prisma.store.deleteMany({});
    console.log('✅ Base cleared.');

    // 3. User Map
    const users = await prisma.user.findMany();
    const userMap = new Map(users.map(u => [u.name.toLowerCase(), u.id]));

    // 4. Parse & Import
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/).filter(l => l.trim() !== '');
    const dataRows = lines.slice(1);
    console.log(`📊 Processing ${dataRows.length} stores...`);

    for (let i = 0; i < dataRows.length; i++) {
        const cols = dataRows[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        if (cols.length < 5) continue;

        const taName = cols[0]?.replace(/"/g, '').trim();
        const ptpName = cols[1]?.replace(/"/g, '').trim();
        const city = cols[2]?.replace(/"/g, '').trim();
        const address = cols[3]?.replace(/"/g, '').trim();
        const zip = cols[4]?.replace(/"/g, '').trim();
        const rawAcq = cols[5]?.replace(/"/g, '').trim();

        if (!ptpName) continue;

        console.log(`[${i + 1}/${dataRows.length}] 🏪 ${ptpName}`);

        const activatorId = taName ? userMap.get(taName.toLowerCase()) : null;
        let totalAcquisition = 0;
        if (rawAcq && !rawAcq.startsWith('=')) {
            totalAcquisition = parseInt(rawAcq) || 0;
        }

        const isCached = coordinateCache.has(`${address}|${city}`.toLowerCase());
        const coords = await getCoordinates(address, city, zip, ptpName, coordinateCache);

        // Save
        try {
            await prisma.store.create({
                data: {
                    name: ptpName,
                    activatorName: taName,
                    activatorId: activatorId,
                    area: city,
                    address: address,
                    postCode: zip,
                    totalAcquisition: totalAcquisition,
                    lat: coords?.lat || ATHENS_LAT,
                    lng: coords?.lng || ATHENS_LNG,
                    type: ptpName.toLowerCase().includes('kiosk') || ptpName.toLowerCase().includes('periptero') ? 'Kiosk' : 'Store',
                    isActive: true
                }
            });
        } catch (e) {
            console.error(`   ❌ DB Error: ${e.message}`);
        }

        // Delay between stores only if NOT cached
        if (!isCached) {
            await new Promise(r => setTimeout(r, 1500));
        }
    }

    console.log('✨ Import finished using proven geocoding logic.');
}

main().then(async () => await prisma.$disconnect()).catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
});
