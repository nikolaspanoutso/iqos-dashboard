import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// PUT: Update historical data for a specific day/user
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { date, userId } = body;
    const p1 = Number(body.p1);
    const p4 = Number(body.p4);
    const p5 = Number(body.p5);

    if (!date || !userId || isNaN(p1) || isNaN(p4) || isNaN(p5)) {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
    }

    console.log(`[History Update] User: ${userId}, Date: ${date}, New P1: ${p1}`);

    // 1. Get current value to calculate delta for P1
    const currentStat = await prisma.dailyStat.findUnique({
      where: { date_userId: { date, userId } }
    });

    const oldP1 = currentStat?.acquisitionP1 || 0;
    const deltaP1 = p1 - oldP1;

    // 2. Upsert the daily stat override
    const updatedStat = await prisma.dailyStat.upsert({
      where: {
        date_userId: {
          date,
          userId
        }
      },
      update: {
        acquisitionP1: p1,
        acquisitionP4: p4,
        offtakeP5: p5
      },
      create: {
        date,
        userId,
        acquisitionP1: p1,
        acquisitionP4: p4,
        offtakeP5: p5,
        workingDays: 1
      }
    });

    // 3. Sync the delta with a virtual "System - Specialist Adjustments" store
    // This ensure the Team Total (sum of stores) remains accurate after history edits.
    if (deltaP1 !== 0) {
        // Use findFirst since upsert-by-name might have lint issues if generate wasn't run
        const adjustmentStore = await prisma.store.findFirst({
            where: { name: 'System - Specialist Adjustments' }
        });

        if (adjustmentStore) {
            await prisma.store.update({
                where: { id: adjustmentStore.id },
                data: {
                    totalAcquisition: { increment: deltaP1 }
                }
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

    return NextResponse.json(updatedStat);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update history' }, { status: 500 });
  }
}
