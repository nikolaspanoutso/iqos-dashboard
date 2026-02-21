const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. Area Synonym & City Center Map
const cityMap = {
    'Athina': { coords: { lat: 37.9838, lng: 23.7275 }, synonyms: ['Αθήνα', 'Athina', 'Athens', 'ATHENS', 'ΑΘΗΝΑ'] },
    'Zografou': { coords: { lat: 37.9715, lng: 23.7610 }, synonyms: ['Ζωγράφου', 'Zografou', 'Zografos', 'ΖΩΓΡΑΦΟΥ'] },
    'Galatsi': { coords: { lat: 38.0093, lng: 23.7571 }, synonyms: ['Γαλάτσι', 'Galatsi', 'ΓΑΛΑΤΣΙ'] },
    'Vironas': { coords: { lat: 37.9593, lng: 23.7507 }, synonyms: ['Βύρωνας', 'Vironas', 'Viron', 'ΒΥΡΩΝΑΣ'] },
    'Kesariani': { coords: { lat: 37.9667, lng: 23.7667 }, synonyms: ['Καισαριανή', 'Kesariani', 'Kessariani', 'ΚΑΙΣΑΡΙΑΝΗ'] },
    'Chania': { coords: { lat: 35.5138, lng: 24.0180 }, synonyms: ['Χανιά', 'Chania', 'Hania', 'ΧΑΝΙΑ'] },
    'Moschato': { coords: { lat: 37.9546, lng: 23.6811 }, synonyms: ['Μοσχάτο', 'Moschato', 'ΜΟΣΧΑΤΟ'] },
    'Menemeni': { coords: { lat: 40.6558, lng: 22.9095 }, synonyms: ['Μενεμένη', 'Menemeni', 'ΜΕΝΕΜΕΝΗ'] }
};

// 2. Helper to find city entry by name (synonym)
function findCityInfo(areaName) {
    if (!areaName) return cityMap['Athina'];
    const cleanName = areaName.trim();
    for (const key in cityMap) {
        if (cityMap[key].synonyms.includes(cleanName)) {
            return cityMap[key];
        }
    }
    return cityMap['Athina']; // Default
}

// 3. Helper to extract coordinates if they are hidden in address/area strings
function extractCoords(str1, str2) {
    const lat = parseFloat(str1?.replace(',', '.'));
    const lng = parseFloat(str2?.replace(',', '.'));

    if (!isNaN(lat) && !isNaN(lng) &&
        lat > 34 && lat < 42 &&
        lng > 19 && lng < 30) {
        return { lat, lng };
    }
    return null;
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function geocodeNominatim(address, area) {
    const query = `${address}, ${area}, Greece`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;

    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'IQOS-Smart-Audit/2.0' }
        });
        const data = await response.json();
        if (data && data.length > 0) {
            return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
        return null;
    } catch (e) {
        return null;
    }
}

async function runSmartAudit() {
    console.log('🚀 Starting SMART Geocoding Audit...');

    const stores = await prisma.store.findMany({
        where: { name: { not: 'System - Specialist Adjustments' } }
    });

    console.log(`📋 Total stores to audit: ${stores.length}\n`);

    const stats = { manual: [], api: [], fallback: [], total: stores.length };

    for (let i = 0; i < stores.length; i++) {
        const store = stores[i];
        let coords = null;
        let method = '';

        // --- STEP 1: EXTRACCT COORDINATES (Manual/CSV Error) ---
        coords = extractCoords(store.area, store.address);
        if (coords) {
            method = 'MANUAL';
        }

        // --- STEP 2: API SEARCH (Nominatim) ---
        if (!coords) {
            // Apply a 1-second delay as requested
            if (i > 0) await sleep(1000);

            coords = await geocodeNominatim(store.address, store.area);
            if (coords) method = 'API';
        }

        // --- STEP 3: CITY CENTER FALLBACK ---
        if (!coords) {
            const cityInfo = findCityInfo(store.area);
            coords = {
                lat: cityInfo.coords.lat + (Math.random() - 0.5) * 0.008,
                lng: cityInfo.coords.lng + (Math.random() - 0.5) * 0.008
            };
            method = 'FALLBACK';
        }

        // Update DB
        await prisma.store.update({
            where: { id: store.id },
            data: { lat: coords.lat, lng: coords.lng }
        });

        // Log results
        const statusIcon = method === 'MANUAL' ? '🎯' : (method === 'API' ? '✅' : '🟡');
        console.log(`[${i + 1}/${stores.length}] ${statusIcon} ${store.name}: ${method} (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);

        if (method === 'MANUAL') stats.manual.push(store.name);
        else if (method === 'API') stats.api.push(store.name);
        else stats.fallback.push(store.name);
    }

    console.log('\n' + '='.repeat(60));
    console.log('🏁 SMART AUDIT REPORT');
    console.log('='.repeat(60));
    console.log(`Manual/Deducted: ${stats.manual.length}`);
    console.log(`API Found:       ${stats.api.length}`);
    console.log(`Fallback Used:    ${stats.fallback.length}`);
    console.log(`Total Managed:   ${stats.total}`);

    if (stats.fallback.length > 0) {
        console.log('\n⚠️ FALLBACK LIST (Need review):');
        stats.fallback.forEach((name, idx) => console.log(`${idx + 1}. ${name}`));
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Updated all coordinates in DB.');
}

runSmartAudit()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
