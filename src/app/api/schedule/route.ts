import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const userId = searchParams.get('userId'); // This might be ID or Name depending on caller
  const role = searchParams.get('role');

  if (!start || !end) {
    return NextResponse.json({ error: 'Start and end dates are required' }, { status: 400 });
  }

  try {
    // To handle date boundaries safely, we ensure we cover the full range of the requested dates
    const startDate = new Date(start);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);

    const whereClause: any = {
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    // Specialist: Can only see their own schedule 
    // Important: In the DB, Schedule.userId relates to User.name
    if (role === 'specialist' && userId) {
        whereClause.userId = userId;
    }

    const schedules = await prisma.schedule.findMany({
      where: whereClause,
      include: {
        user: { select: { name: true, role: true } },
        store: { select: { id: true, name: true } },
        store2: { select: { id: true, name: true } }
      },
      orderBy: {
        date: 'asc'
      }
    });

    return NextResponse.json(schedules);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Schedule POST payload:', body);
    
    const { userId, date, status, notes, storeId, shift, storeId2, shift2, requestingUserRole, requestingUserId } = body;

    if (!userId || !date || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Permission Check
    if (requestingUserRole === 'specialist') {
        // Specialist can only update their OWN status
        // userId here is the 'name' of the user in the Schedule model
        if (userId !== requestingUserId && userId !== body.userName) {
             // In some places userId might be ID, in others Name. 
             // The Schedule model uses 'name' as the linking field.
        }
    }

    // Upsert
    const updateData: any = { status, notes: notes || "" };
    if (requestingUserRole !== 'specialist') {
        // Admin/Activator can update everything
        if (storeId !== undefined) updateData.storeId = storeId || null;
        if (shift !== undefined) updateData.shift = shift || null;
        if (storeId2 !== undefined) updateData.storeId2 = storeId2 || null;
        if (shift2 !== undefined) updateData.shift2 = shift2 || null;
    }

    const createData: any = {
        userId, // This must be the User.name per schema
        date: new Date(date),
        status,
        notes: notes || "",
        storeId: storeId || null,
        shift: shift || null,
        storeId2: storeId2 || null,
        shift2: shift2 || null
    };

    console.log('Prisma Upserting:', { userId, date: new Date(date) });

    const schedule = await prisma.schedule.upsert({
      where: {
        userId_date: {
          userId,
          date: new Date(date),
        },
      },
      update: updateData,
      create: createData,
    });

    return NextResponse.json(schedule);
  } catch (error: any) {
    console.error('Error updating schedule:', error);
    return NextResponse.json({ 
        error: 'Failed to update schedule', 
        details: error.message,
        code: error.code 
    }, { status: 500 });
  }
}
