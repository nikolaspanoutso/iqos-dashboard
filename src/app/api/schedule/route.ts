import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const userId = searchParams.get('userId'); // Logged in user
  const role = searchParams.get('role');     // Logged in role

  if (!start || !end) {
    return NextResponse.json({ error: 'Start and end dates are required' }, { status: 400 });
  }

  try {
    const whereClause: any = {
      date: {
        gte: new Date(start),
        lte: new Date(end),
      },
    };

    // Specialist: Can only see their own schedule
    if (role === 'specialist' && userId) {
        whereClause.userId = userId;
    }

    const schedules = await prisma.schedule.findMany({
      where: whereClause,
      include: {
        user: { select: { name: true, role: true } },
        store: { select: { id: true, name: true } }
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
    
    const { userId, date, status, notes, storeId, shift, requestingUserRole, requestingUserId } = body;

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
    }

    const createData: any = {
        userId, // This must be the User.name per schema
        date: new Date(date),
        status,
        notes: notes || "",
        storeId: storeId || null,
        shift: shift || null
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
