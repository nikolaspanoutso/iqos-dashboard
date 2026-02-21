const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Bounding Box of Greece for Nominatim
// Form: left,top,right,bottom (min_lon, max_lat, max_lon, min_lat)
const GREECE_VIEWBOX = "19.3,41.8,28.5,34.8";

async function geocodeNominatim(query) {
    // We use search.php which is sometimes more stable for JSON requests
    // We also remove the strict viewbox temporarily to ensure the base search works
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`;

    try {
        const response = await fetch(url, {
            headers: {
                // Using a very descriptive User-Agent as required by Nominatim
                'User-Agent': 'IQOS-Dashboard-Geocoding-Tool/1.0 (nikolaspanoutso@gmail.com) Node.js-Fetch',
                'Accept': 'application/json',
                'Referer': 'https://iqos-dashboard-deploy.vercel.app/'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.warn(`      ⚠️ API Error ${response.status}: ${errorText.substring(0, 100)}...`);
            return null;
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.warn(`      ⚠️ API returned non-JSON response (${contentType}). Likely a block or error page.`);
            // if it's small, maybe it's a helpful message?
            if (text.length < 500) console.log(`      📝 Response: ${text}`);
            return null;
        }

        const data = await response.json();

        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon)
            };
        }
    } catch (e) {
        console.error(`      ⚠️ Fetch Error: ${e.message}`);
    }
    return null;
}

// Helper to normalize address strings
function normalizeAddress(address) {
    if (!address) return '';
    let clean = address.replace(/\*/g, '').trim();

    // Check for "Number Name" (e.g., "116 Imittou") and flip to "Name Number"
    const match = clean.match(/^(\d+)\s+(.+)$/);
    if (match) {
        return `${match[2]} ${match[1]}`;
    }
    return clean;
}

async function runPrecisionSync() {
    console.log('🏁 Starting BOUNDED PRECISION Geocoding Sync...');

    const csvPath = path.join(__dirname, '..', 'shops.csv');
    if (!fs.existsSync(csvPath)) {
        console.error('❌ shops.csv not found.');
        return;
    }

    const lines = fs.readFileSync(csvPath, 'utf-8').split(/\r?\n/).filter(l => l.trim() !== '');
    const entries = lines.slice(1);

    console.log(`📋 Processing ${entries.length} shops.\n`);

    const stats = { exact: 0, search: 0, failed: [] };

    for (let i = 0; i < entries.length; i++) {
        const cols = entries[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        if (cols.length < 5) continue;

        const shopName = cols[1]?.trim();
        const cityCol = cols[2]?.trim();
        const addrCol = cols[3]?.trim();
        const zip = cols[4]?.trim();

        console.log(`[${i + 1}/${entries.length}] 🏪 ${shopName}`);

        let coords = null;
        let method = '';

        // 1. DATA FIX: Check if coordinates are shifted into City/Address columns
        const latVal = parseFloat(cityCol?.replace(',', '.'));
        const lngVal = parseFloat(addrCol?.replace(',', '.'));

        if (!isNaN(latVal) && latVal > 34 && latVal < 42 &&
            !isNaN(lngVal) && lngVal > 19 && lngVal < 30) {
            coords = { lat: latVal, lng: lngVal };
            method = 'CSV_DIRECT';
            stats.exact++;
        }

        // 2. NORMALIZED SEARCH
        if (!coords) {
            const streetInfo = normalizeAddress(addrCol);
            const cityName = cityCol || 'Athens';
            // Construction: "Street Name Number, Zip, City, Greece"
            const query = `${streetInfo}, ${zip}, ${cityName}, Greece`.replace(/, ,/g, ', ');

            console.log(`   🔍 Bounded Search: ${query}`);
            coords = await geocodeNominatim(query);
            await sleep(1000); // Strict 1s delay after initial search

            // --- SMART RECOVERY (If first try fails) ---
            if (!coords) {
                // Try combinations because of shifted CSV columns
                // Many failed rows have Address in City column or vice-versa
                const combos = [
                    `${normalizeAddress(cityCol)}, ${zip}, Greece`,
                    `${normalizeAddress(cityCol)}, ${addrCol}, Greece`,
                    `${normalizeAddress(addrCol)}, Greece`
                ];

                for (const altQuery of combos) {
                    if (!altQuery || altQuery.length < 10) continue;
                    console.log(`   🔄 Retrying Smart Combo: ${altQuery}`);
                    coords = await geocodeNominatim(altQuery);
                    if (coords) {
                        method = 'API_SMART_RECOVERY';
                        stats.search++;
                        break;
                    }
                    await sleep(1000);
                }
            } else {
                method = 'API_BOUNDED';
                stats.search++;
            }
        }

        // 3. UPDATE DB
        if (coords) {
            const cleanName = shopName.replace(/\*/g, '').trim();
            const store = await prisma.store.findFirst({
                where: { OR: [{ name: shopName }, { name: cleanName }] }
            });

            if (store) {
                await prisma.store.update({
                    where: { id: store.id },
                    data: { lat: coords.lat, lng: coords.lng }
                });
                console.log(`   ✅ [${method}] SAVED: ${coords.lat}, ${coords.lng}`);
            }
        } else {
            stats.failed.push(shopName);
            console.log(`   ❌ NOT FOUND (Even with Bounded Search)`);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🏁 SYNC COMPLETE');
    console.log('='.repeat(60));
    console.log(`Data Extraction: ${stats.exact}`);
    console.log(`API Found:       ${stats.search}`);
    console.log(`Failed:          ${stats.failed.length}`);

    if (stats.failed.length > 0) {
        console.log('\n📍 STILL FAILED:');
        stats.failed.forEach((name, idx) => console.log(`${idx + 1}. ${name}`));
    }
    console.log('\n' + '='.repeat(60));
}

runPrecisionSync()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
