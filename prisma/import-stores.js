const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Bounding Box of Greece for Nominatim
const GREECE_VIEWBOX = "19.3,41.8,28.5,34.8";
const CITY_CENTERS = {
    'athina': { lat: 37.9838, lng: 23.7275 },
    'zografou': { lat: 37.9715, lng: 23.7610 },
    'galatsi': { lat: 38.0093, lng: 23.7571 },
    'vironas': { lat: 37.9593, lng: 23.7507 },
    'kesariani': { lat: 37.9667, lng: 23.7667 },
    'chania': { lat: 35.5138, lng: 24.0180 },
    'moschato': { lat: 37.9546, lng: 23.6811 },
    'menemeni': { lat: 40.6558, lng: 22.9095 }
};
const DEFAULT_CENTER = CITY_CENTERS['athina'];

const AREA_MAPPING = {
    'byron': 'vironas',
    'μενεμένη': 'athina',
    'gkizi': 'gyzi',
    'athens': 'athina'
};

function normalizeCity(city) {
    if (!city) return 'athina';
    const low = city.toLowerCase().trim();
    return AREA_MAPPING[low] || low;
}


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
const getCoordinates = async (address, city, zip, ptpName) => {
    const cleanAddr = address.replace(/"/g, '').replace(/\*/g, '').trim().toLowerCase();
    const cleanCity = normalizeCity(city.replace(/"/g, ''));
    const cleanPtp = ptpName.replace(/"/g, '').replace(/\(.*\)/, '').replace(/O\.?E\.?/i, '').replace(/I\.?K\.?E\.?/i, '').trim().toLowerCase();
    const streetNorm = normalizeAddress(address).toLowerCase();


    const streetOnly = streetNorm.replace(/leoforos\s+/i, '').replace(/l\.\s+/i, '').replace(/platia\s+/i, '').trim();

    // List of providers - STRICTLY NOMINATIM per request
    const providers = [
        {
            name: 'Nominatim',
            baseUrl: 'https://nominatim.openstreetmap.org/search',
            queries: [
                `${address.replace(/"/g, '').trim()}, ${cleanCity}, Greece`, // 🌟 Raw CSV ADDRESS
                `${streetNorm}, ${zip}, ${cleanCity}, Greece`,              // Normalised + Zip
                `${streetNorm}, ${cleanCity}, Greece`,                       // Normalised
                `${streetOnly}, ${cleanCity}, Greece`,                       // Street Only
                `${cleanPtp}, ${cleanCity}, Greece`                          // Store Name
            ],
            delay: 1800 // Mandatory 1.5 - 2s delay
        }
    ];

    for (const provider of providers) {
        for (const query of provider.queries) {
            console.log(`      🔍 [${provider.name}] Querying: ${query}`);
            let retryCount = 0;
            const maxRetries = 1;

            while (retryCount <= maxRetries) {
                try {
                    let url;
                    if (provider.name === 'Nominatim') {
                        url = `${provider.baseUrl}?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1&viewbox=${GREECE_VIEWBOX}&bounded=1`;
                    } else {
                        url = `${provider.baseUrl}?q=${encodeURIComponent(query)}&api_key=67c7625902061619890455zrj8860bc`;
                    }

                    const response = await fetch(url, {
                        headers: {
                            'User-Agent': 'IQOS-Dashboard-Geocoding-Tool/1.0 (nikolaspanoutso@gmail.com) Node.js-Fetch',
                            'Accept': 'application/json'
                        }
                    });

                    if (!response.ok) {
                        if (response.status === 429) {
                            console.warn(`      ⚠️ [${provider.name}] Rate limited. Waiting 10s...`);
                            await new Promise(r => setTimeout(r, 10000));
                            retryCount++;
                            continue;
                        }
                        break;
                    }

                    const data = await response.json();
                    if (data && data.length > 0) {
                        const lat = parseFloat(data[0].lat);
                        const lon = parseFloat(data[0].lon || data[0].lng);
                        return { coords: { lat, lng: lon }, status: `✅ Found (${provider.name})` };
                    }
                    break;

                } catch (e) {
                    break;
                }
            }
            await new Promise(r => setTimeout(r, provider.delay));
        }
    }

    const center = CITY_CENTERS[cleanCity] || DEFAULT_CENTER;
    // Add subtle jitter (approx 200-500m) so markers don't stack perfectly
    const jitterLat = (Math.random() - 0.5) * 0.006;
    const jitterLng = (Math.random() - 0.5) * 0.006;

    return {
        coords: {
            lat: center.lat + jitterLat,
            lng: center.lng + jitterLng
        },
        status: '❌ Failed (Fallback)'
    };
};

async function main() {
    console.log('🚀 Starting PERFECT Store Import from Stores1.csv...');

    const filePath = path.join(__dirname, '..', 'Stores1.csv');
    if (!fs.existsSync(filePath)) {
        console.error('❌ Stores1.csv not found!');
        return;
    }

    // 1. Clear Database

    // 2. Mark all existing stores as inactive (we will reactivate those found in the CSV)
    console.log('🔄 Syncing stores (avoiding full wipe)...');
    await prisma.store.updateMany({
        data: { isActive: false }
    });
    console.log('✅ Status reset. Syncing from CSV...');

    // 3. User Map
    const users = await prisma.user.findMany();
    const userMap = new Map(users.map(u => [u.name.toLowerCase(), u.id]));

    // 4. Parse & Import
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/).filter(l => l.trim() !== '');
    const dataRows = lines.slice(1);
    console.log(`📊 Processing ${dataRows.length} stores...`);

    const summary = { success: 0, fallback: 0 };
    const failedAddresses = [];

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

        const activatorId = taName ? userMap.get(taName.toLowerCase()) : null;

        // FIX: Numeric parsing for Total Acquisition
        // Handle cases where it might be a string with commas or just a number
        let totalAcquisition = 0;
        if (rawAcq && !rawAcq.startsWith('=')) {
            // Remove any non-numeric characters except decimals if needed, then parse
            totalAcquisition = parseInt(rawAcq.replace(/[^0-9]/g, '')) || 0;
        }

        const result = await getCoordinates(address, city, zip, ptpName);
        const { coords, status } = result;

        if (status.includes('Found')) summary.success++;
        else {
            summary.fallback++;
            failedAddresses.push(`${ptpName} [${address}, ${city}]`);
        }

        console.log(`[${i + 1}/${dataRows.length}] ${status.padEnd(16)} | 🏪 ${ptpName.substring(0, 30).padEnd(30)} | Acq: ${totalAcquisition.toString().padEnd(4)}`);

        // Save/Sync Store
        try {
            await prisma.store.upsert({
                where: { name: ptpName },
                update: {
                    activatorName: taName,
                    activatorId: activatorId,
                    area: city,
                    address: address,
                    postCode: zip,
                    // We preserve the current totalAcquisition if it's already in the DB
                    // to avoid losing UI-based sales during sync.
                    isActive: true,
                    type: ptpName.toLowerCase().includes('kiosk') || ptpName.toLowerCase().includes('periptero') ? 'Kiosk' : 'Store'
                },
                create: {
                    name: ptpName,
                    activatorName: taName,
                    activatorId: activatorId,
                    area: city,
                    address: address,
                    postCode: zip,
                    totalAcquisition: totalAcquisition,
                    lat: coords.lat,
                    lng: coords.lng,
                    type: ptpName.toLowerCase().includes('kiosk') || ptpName.toLowerCase().includes('periptero') ? 'Kiosk' : 'Store',
                    isActive: true
                }
            });
        } catch (e) {
            console.error(`   ❌ DB Error for ${ptpName}: ${e.message}`);
        }

        // Delay between stores to respect Nominatim limits (1.5 - 2s)
        await new Promise(r => setTimeout(r, 1800));
    }

    // Update a "last_import" setting to notify the frontend
    try {
        await prisma.setting.upsert({
            where: { key: 'last_import_timestamp' },
            update: { value: Date.now().toString() },
            create: { key: 'last_import_timestamp', value: Date.now().toString() }
        });
    } catch (e) { }

    console.log('\n' + '='.repeat(60));
    console.log('🏁 IMPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully Found:      ${summary.success}`);
    console.log(`❌ Failed (City Fallback):  ${summary.fallback}`);
    console.log('='.repeat(60));

    if (failedAddresses.length > 0) {
        console.log('\n📍 ADDRESSES THAT NEED MANUAL ATTENTION (Used City Fallback):');
        failedAddresses.forEach((addr, idx) => console.log(`${idx + 1}. ${addr}`));
    }
    console.log('\n✨ Database is now synchronized with current CSV data.');
}

main().then(async () => await prisma.$disconnect()).catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
});
