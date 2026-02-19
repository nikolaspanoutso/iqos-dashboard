import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: Fetch team performance data (Working Days, Daily Stats, Recent Sales)
export async function GET() {
  try {
    // In a real app, we would authenticate the user here
    
    // Fetch all daily stats
    const dailyStats = await prisma.dailyStat.findMany();
    
    // Fetch recent sales (e.g., last 24h or just all for now to demo)
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

    return NextResponse.json({ 
      dailyStats, 
      recentSales,
      aggregatedStats 
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
    
    // OPTIONAL: Update a "Today" DailyStat record immediately?
    // Or just let the frontend sum it up?
    // Let's update the DailyStat for today to keep totals in sync.
    const today = new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY

    // Upsert DailyStat for this user/today
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
        workingDays: 1 // Assume working if selling
      }
    });

    return NextResponse.json(sale);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to record sale' }, { status: 500 });
  }
}
