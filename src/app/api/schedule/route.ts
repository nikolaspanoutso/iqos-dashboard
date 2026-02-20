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
    const { userId, date, status, notes, storeId, shift, requestingUserRole, requestingUserId } = body;

    if (!userId || !date || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Permission Check
    if (requestingUserRole === 'specialist') {
        // Specialist can only update their OWN status to specific values
        if (userId !== requestingUserId) {
            return NextResponse.json({ error: 'Unauthorized: Cannot edit others' }, { status: 403 });
        }
        // Prevent editing store or shift
        if (storeId !== undefined || shift !== undefined) {
             // Ideally we'd throw an error or just ignore these fields. Let's ignore them to be safe and only update status/notes.
             // But for strictness let's assume the frontend sends what's changed.
        }
    }

    // Upsert
    const updateData: any = { status, notes };
    if (requestingUserRole !== 'specialist') {
        // Admin/Activator can update everything
        if (storeId !== undefined) updateData.storeId = storeId;
        if (shift !== undefined) updateData.shift = shift;
    }

    const createData: any = {
        userId,
        date: new Date(date),
        status,
        notes,
        storeId: storeId || null,
        shift: shift || null
    };

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
  } catch (error) {
    console.error('Error updating schedule:', error);
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
  }
}
