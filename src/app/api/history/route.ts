import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// PUT: Update historical data for a specific day/user
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { date, userId, status } = body;
    const p1 = body.p1 !== undefined ? Number(body.p1) : undefined;
    const p4 = body.p4 !== undefined ? Number(body.p4) : undefined;
    const p5 = body.p5 !== undefined ? Number(body.p5) : undefined;

    if (!date || !userId) {
      return NextResponse.json({ error: 'Date and userId required' }, { status: 400 });
    }

    console.log(`[History Update] User: ${userId}, Date: ${date}, Mode: ${status ? 'Status' : 'Sales'}`);

    // Case 1: Updating Sales Stats (P1, P4, P5)
    if (p1 !== undefined && p4 !== undefined && p5 !== undefined) {
        // 1. Get current value to calculate delta for P1
        const currentStat = await prisma.dailyStat.findUnique({
          where: { date_userId: { date, userId } }
        });

        const oldP1 = currentStat?.acquisitionP1 || 0;
        const deltaP1 = p1 - oldP1;

        // 2. Upsert the daily stat override
        await prisma.dailyStat.upsert({
          where: { date_userId: { date, userId } },
          update: { acquisitionP1: p1, acquisitionP4: p4, offtakeP5: p5 },
          create: { date, userId, acquisitionP1: p1, acquisitionP4: p4, offtakeP5: p5, workingDays: 1 }
        });

        // 3. Sync the delta with a virtual "System - Specialist Adjustments" store
        if (deltaP1 !== 0) {
            const adjustmentStore = await prisma.store.findFirst({
                where: { name: 'System - Specialist Adjustments' }
            });

            if (adjustmentStore) {
                await prisma.store.update({
                    where: { id: adjustmentStore.id },
                    data: { totalAcquisition: { increment: deltaP1 } }
                });
            } else {
                await prisma.store.create({
                    data: {
                        name: 'System - Specialist Adjustments',
                        type: 'SYSTEM',
                        lat: 0,
                        lng: 0,
                        totalAcquisition: deltaP1,
                        isActive: true
                    }
                });
            }
        }
    }

    // Case 2: Updating Status (Work, Sick, Off, etc.)
    if (status) {
        // Parse date for Schedule model (it uses DateTime, not string)
        const [day, month, year] = date.split('/').map(Number);
        const dateObj = new Date(year, month - 1, day, 12, 0, 0); // Noon to avoid TZ issues
        
        await prisma.schedule.upsert({
            where: {
                userId_date: {
                    userId,
                    date: dateObj
                }
            },
            update: { status },
            create: {
                userId,
                date: dateObj,
                status,
                storeId: "History Override" // Placeholder
            }
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update history' }, { status: 500 });
  }
}
