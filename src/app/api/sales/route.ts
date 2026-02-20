import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: Fetch team performance data (Working Days, Daily Stats, Recent Sales)
export async function GET() {
  try {
    // In a real app, we would authenticate the user here
    
    // Fetch daily stats ONLY for Trade Specialists
    const dailyStats = await prisma.dailyStat.findMany({
        where: {
            user: {
                role: 'specialist'
            }
        }
    });
    
    // Fetch recent sales (last 100)
    const recentSales = await prisma.sale.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100
    });

    // Aggregate Data for the Team Performance Modal
    const aggregatedStats: any = {};
    
    dailyStats.forEach(stat => {
      if (!aggregatedStats[stat.userId]) {
        aggregatedStats[stat.userId] = { 
          acquisitionP1: 0, 
          acquisitionP4: 0, 
          offtakeP5: 0, 
          workingDays: 0 
        };
      }
      
      aggregatedStats[stat.userId].acquisitionP1 += stat.acquisitionP1;
      aggregatedStats[stat.userId].acquisitionP4 += stat.acquisitionP4;
      aggregatedStats[stat.userId].offtakeP5 += stat.offtakeP5;
      aggregatedStats[stat.userId].workingDays += stat.workingDays;
    });

    // Add recent sales to the live totals? 
    // Usually DailyStats are "closed" days, and Sales are "live".
    // For this migration, let's assume DailyStats are the source of truth for history,
    // and we just return the raw daily stats to be processed by frontend if needed.

    // Fetch list of Trade Specialists for History selector
    const specialistsList = await prisma.user.findMany({
        where: { role: 'specialist' },
        select: { name: true }
    });

    // Fetch schedules to show status (Work, Sick, etc.)
    const schedules = await prisma.schedule.findMany({
        where: {
            user: { role: 'specialist' }
        },
        select: {
            userId: true,
            date: true,
            status: true
        }
    });

    return NextResponse.json({ 
      dailyStats, 
      recentSales,
      aggregatedStats,
      specialists: specialistsList.map(s => s.name),
      schedules: schedules.map(s => ({
          userId: s.userId,
          date: s.date.toLocaleDateString('en-GB'),
          status: s.status
      }))
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch sales data' }, { status: 500 });
  }
}

// POST: Record a new Sale
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, storeId, type, count } = body;

    if (!userId || !storeId || !type || count === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const sale = await prisma.sale.create({
      data: {
        userId,
        storeId,
        type,
        count
      }
    });
    
    // 1. Fetch user role to determine if we update individual stats
    const dbUser = await prisma.user.findUnique({
      where: { name: userId },
      select: { role: true }
    });

    const isSpecialist = dbUser?.role === 'specialist';

    // 2. ONLY update Store Totals for P1 (regardless of role)
    if (type === 'P1') {
        await prisma.store.update({
            where: { id: storeId },
            data: {
                totalAcquisition: { increment: count }
            }
        });
    }

    // 3. ONLY update Individual Stats (DailyStat) for Specialists (for any type P1, P4, P5)
    if (isSpecialist) {
        const today = new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY
        
        let updateData = {};
        if (type === 'P1') updateData = { acquisitionP1: { increment: count } };
        else if (type === 'P4') updateData = { acquisitionP4: { increment: count } };
        else if (type === 'P5') updateData = { offtakeP5: { increment: count } };
        
        await prisma.dailyStat.upsert({
          where: {
            date_userId: {
              date: today,
              userId: userId
            }
          },
          update: updateData,
          create: {
            date: today,
            userId: userId,
            acquisitionP1: type === 'P1' ? count : 0,
            acquisitionP4: type === 'P4' ? count : 0,
            offtakeP5: type === 'P5' ? count : 0,
            workingDays: 1
          }
        });
    }

    return NextResponse.json(sale);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to record sale' }, { status: 500 });
  }
}
