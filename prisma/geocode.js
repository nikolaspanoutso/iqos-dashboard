const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const ERROR_LOG_FILE = path.join(__dirname, 'geocoding_errors.log');

/**
 * Normalizes a string by removing asterisks and trimming.
 */
function clean(str) {
    if (!str) return '';
    return str.replace(/\*/g, '').trim();
}

/**
 * Fetches coordinates from OpenStreetMap (Nominatim) API.
 */
async function getOSMCoords(address, area) {
    const cleanAddress = clean(address);
    const cleanArea = clean(area);

    // Construct query: Address + Area helps accuracy
    const query = `${cleanAddress}, ${cleanArea}, Greece`;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'IQOS_Dashboard_Geocoding_Script/1.1'
            }
        });
        const data = await response.json();

        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon),
                display_name: data[0].display_name
            };
        } else {
            return { error: 'ZERO_RESULTS' };
        }
    } catch (e) {
        return { error: e.message };
    }
}

async function main() {
    console.log('--- Starting OpenStreetMap Geocoding ---');

    if (fs.existsSync(ERROR_LOG_FILE)) {
        fs.unlinkSync(ERROR_LOG_FILE); // Clear old logs
    }

    try {
        const stores = await prisma.store.findMany({
            where: { isActive: true }
        });

        console.log(`Processing ${stores.length} stores...`);
        let updatedCount = 0;
        let errorCount = 0;

        for (const store of stores) {
            // Skip if it's already generic "Coordinates" area but has no real address
            if (store.address === 'Coordinates' && !store.lat) {
                console.log(`Skipping placeholder: ${store.name}`);
                continue;
            }

            console.log(`Geocoding: ${store.name} (${store.address}, ${store.area})...`);

            const result = await getOSMCoords(store.address, store.area);

            if (result.lat && result.lng) {
                await prisma.store.update({
                    where: { id: store.id },
                    data: {
                        lat: result.lat,
                        lng: result.lng
                    }
                });
                console.log(`✅ Success: ${result.lat}, ${result.lng}`);
                updatedCount++;
            } else {
                const errorMsg = `❌ Failed: ${store.name} | Address: ${store.address} | Error: ${result.error}\n`;
                console.log(errorMsg.trim());
                fs.appendFileSync(ERROR_LOG_FILE, errorMsg);
                errorCount++;
            }

            // Respect OpenStreetMap Nominatim Usage Policy (1 request per second)
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log('\n--- Geocoding Complete ---');
        console.log(`Successfully updated: ${updatedCount}`);
        console.log(`Errors logged: ${errorCount}`);
        if (errorCount > 0) {
            console.log(`Check ${ERROR_LOG_FILE} for details.`);
        }

    } catch (error) {
        console.error('Fatal Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
