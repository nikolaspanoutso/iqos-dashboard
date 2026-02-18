import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// PUT: Update historical data for a specific day/user
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { date, userId, p1, p4 } = body;

    if (!date || !userId || p1 === undefined || p4 === undefined) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Upsert the daily stat override
    const updatedStat = await prisma.dailyStat.upsert({
      where: {
        date_userId: {
          date,
          userId
        }
      },
      update: {
        acquisitionP1: p1,
        acquisitionP4: p4
      },
      create: {
        date,
        userId,
        acquisitionP1: p1,
        acquisitionP4: p4,
        workingDays: 1 // Default if creating new
      }
    });

    return NextResponse.json(updatedStat);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update history' }, { status: 500 });
  }
}
