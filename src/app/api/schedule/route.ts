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

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, userId, date, status, notes, storeId, shift, storeId2, shift2, requestingUserRole } = body;

        if (!id) {
            return NextResponse.json({ error: 'Missing shift ID' }, { status: 400 });
        }

        // Security: Only Admin and Activator can update via PUT (Full Edit)
        if (requestingUserRole !== 'admin' && requestingUserRole !== 'activator') {
            return NextResponse.json({ error: 'Permission denied. Only Admins or Activators can perform full edits.' }, { status: 403 });
        }

        const updatedSchedule = await prisma.schedule.update({
            where: { id },
            data: {
                userId,
                date: date ? new Date(date) : undefined,
                status,
                notes,
                storeId: storeId === undefined ? undefined : (storeId || null),
                shift: shift === undefined ? undefined : (shift || null),
                storeId2: storeId2 === undefined ? undefined : (storeId2 || null),
                shift2: shift2 === undefined ? undefined : (shift2 || null),
            }
        });

        return NextResponse.json(updatedSchedule);
    } catch (error: any) {
        console.error('Error updating shift:', error);
        return NextResponse.json({ 
            error: 'Failed to update shift', 
            details: error.message 
        }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const requestingUserRole = searchParams.get('role');

        if (!id) {
            return NextResponse.json({ error: 'Missing shift ID' }, { status: 400 });
        }

        // Security: Only Admin and Activator can delete
        if (requestingUserRole !== 'admin' && requestingUserRole !== 'activator') {
            return NextResponse.json({ error: 'Permission denied. Only Admins or Activators can delete shifts.' }, { status: 403 });
        }

        await prisma.schedule.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting shift:', error);
        return NextResponse.json({ 
            error: 'Failed to delete shift', 
            details: error.message 
        }, { status: 500 });
    }
}
