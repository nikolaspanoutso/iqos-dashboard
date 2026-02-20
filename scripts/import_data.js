const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('Starting data import...');

    // --- Import Stores from shops.csv ---
    try {
        const shopsPath = path.join(__dirname, '../shops.csv');
        if (fs.existsSync(shopsPath)) {
            const shopsData = fs.readFileSync(shopsPath, 'utf8');
            const lines = shopsData.split('\n').filter(l => l.trim());
            // Skip header
            // Header: TA,PtP Name,City (Reev),Address,ZipCode,Total Acquisition,%

            console.log(`Found ${lines.length - 1} stores to import.`);

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                // Parse CSV line handling quotes
                // Simple regex to match fields: ((?:"[^"]*")|[^,]*)(?:,|$)
                const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
                // Actually split by comma but respect quotes is better
                // Let's use a simpler approach since data seems consistent: custom splitter
                // Or just regex:
                const parts = [];
                let current = '';
                let inQuote = false;
                for (let char of line) {
                    if (char === '"') { inQuote = !inQuote; continue; }
                    if (char === ',' && !inQuote) {
                        parts.push(current.trim());
                        current = '';
                    } else {
                        current += char;
                    }
                }
                parts.push(current.trim());

                if (parts.length < 6) continue;

                const [taName, ptpName, city, address, zip, totalAcqStr] = parts;

                // Clean up Total Acquisition (might have quotes or % or just number)
                // Expected: "62" or "62"
                let totalAcq = parseInt(totalAcqStr.replace(/[^0-9]/g, '')) || 0;

                // Create/Update Store
                // We also need to find or create the User (TA)
                let activator = null;
                if (taName) {
                    activator = await prisma.user.upsert({
                        where: { name: taName },
                        update: {},
                        create: { name: taName, role: 'specialist' }
                    });
                }

                await prisma.store.upsert({
                    where: { id: ptpName }, // Using Name as ID for upsert might be risky if IDs are CUIDs. 
                    // But looking at seed.js, usually we might use name as unique if possible, or just create.
                    // Store schema: id is CUID. name is not unique.
                    // But we want to update existing.
                    // existing stores might have been seeded.
                    // Let's try to find by name first.
                    create: {
                        name: ptpName,
                        type: 'Retail',
                        area: city,
                        address: address,
                        postCode: zip,
                        totalAcquisition: totalAcq,
                        activatorId: activator ? activator.id : undefined,
                        activatorName: taName
                    },
                    update: {
                        totalAcquisition: totalAcq,
                        activatorId: activator ? activator.id : undefined,
                        activatorName: taName,
                        area: city,
                        address: address,
                        postCode: zip
                    },
                    where: { id: 'placeholder' } // This won't work for upsert if we don't know ID.
                }).catch(async () => {
                    // Fallback: Find by name
                    const existing = await prisma.store.findFirst({ where: { name: ptpName } });
                    if (existing) {
                        await prisma.store.update({
                            where: { id: existing.id },
                            data: {
                                totalAcquisition: totalAcq,
                                activatorId: activator ? activator.id : undefined,
                                activatorName: taName,
                                area: city,
                                address: address,
                                postCode: zip
                            }
                        });
                    } else {
                        await prisma.store.create({
                            data: {
                                name: ptpName,
                                type: 'Retail',
                                area: city,
                                address: address,
                                postCode: zip,
                                totalAcquisition: totalAcq,
                                activatorId: activator ? activator.id : undefined,
                                activatorName: taName
                            }
                        });
                    }
                });
            }
            console.log('Stores imported.');
        }
    } catch (e) {
        console.error('Error importing stores:', e);
    }

    // --- Import Performance from january.csv / february.csv ---
    const perfFiles = ['../january.csv', '../february.csv'];

    for (const fileRel of perfFiles) {
        try {
            const perfPath = path.join(__dirname, fileRel);
            if (!fs.existsSync(perfPath)) continue;

            console.log(`Importing performance from ${fileRel}...`);
            const csvData = fs.readFileSync(perfPath, 'utf8');
            const lines = csvData.split('\n').filter(l => l.trim());

            if (lines.length < 3) continue;

            // Line 1: Date, Maria Tasiou,,, Nikos Mousas,,, ...
            const headerLine = lines[0];
            const headerParts = headerLine.split(',');

            // Identify Users
            // Index 1: Maria Tasiou
            // Index 4: Nikos Mousas
            // Index 7: Giwrgos Grimanis
            // Index 10: Nikolas Panoutsopoulos
            // Index 13: Nefeli Merko

            const userMap = {}; // index -> userName
            for (let i = 1; i < headerParts.length; i += 3) {
                const name = headerParts[i]?.trim();
                if (name && name !== 'Average') {
                    userMap[i] = name;
                    // Ensure user exists
                    await prisma.user.upsert({
                        where: { name: name },
                        update: {},
                        create: { name: name, role: 'specialist' }
                    });
                }
            }

            // Iterate Data Rows (starting from line 3, index 2)
            // Line 2 is headers (Acquisition P1, ...)
            for (let i = 2; i < lines.length; i++) {
                const line = lines[i];
                const parts = line.split(',');
                const dateStr = parts[0];
                // Date format: DD/MM/YYYY

                if (!dateStr || !dateStr.includes('/')) continue;

                for (const [colIndexStr, userName] of Object.entries(userMap)) {
                    const colIndex = parseInt(colIndexStr);
                    const p1 = parseInt(parts[colIndex]) || 0;
                    const p4 = parseInt(parts[colIndex + 1]) || 0;
                    const p5 = parseInt(parts[colIndex + 2]) || 0;

                    if (p1 === 0 && p4 === 0 && p5 === 0) continue; // Skip empty days? Or record as 0? 
                    // If all 0, maybe user didn't work. But "0" is explicit. "Empty" is null.
                    // split returns "" for empty. parseInt("") is NaN -> 0.
                    // If the CSV has data 0, it means 0. If empty, it means 0.
                    // Let's assume meaningful data if any > 0 or if there's an explicit 0 (hard to distinguish from empty string with clean split).
                    // But standard logic: Record it.

                    await prisma.dailyStat.upsert({
                        where: {
                            date_userId: {
                                date: dateStr,
                                userId: userName
                            }
                        },
                        update: {
                            acquisitionP1: p1,
                            acquisitionP4: p4,
                            offtakeP5: p5,
                            workingDays: (p1 > 0 || p4 > 0 || p5 > 0) ? 1 : 0 // Naive calculation
                        },
                        create: {
                            date: dateStr,
                            userId: userName,
                            acquisitionP1: p1,
                            acquisitionP4: p4,
                            offtakeP5: p5,
                            workingDays: (p1 > 0 || p4 > 0 || p5 > 0) ? 1 : 0
                        }
                    });
                }
            }
        } catch (e) {
            console.error(`Error importing ${fileRel}:`, e);
        }
    }

    console.log('Import completed.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
