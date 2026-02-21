import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId'); // This is User.name per schema

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const now = new Date();
    // Reset to start of today to include today's shift if it's currently happening or upcoming
    now.setHours(0, 0, 0, 0);

    const nextShift = await prisma.schedule.findFirst({
        where: {
            userId: userId,
            date: {
                gte: now
            },
            // Include both Pending (default) and Present (checked-in)
            // but ignore Off, Sick, Leave
            status: { in: ['Work', 'Pending', 'Present'] },
            storeId: { not: null }
        },
        include: {
            store: {
                select: {
                    id: true,
                    name: true,
                    lat: true,
                    lng: true,
                    type: true,
                    area: true
                }
            },
            store2: {
                select: {
                    id: true,
                    name: true,
                    lat: true,
                    lng: true,
                    type: true,
                    area: true
                }
            }
        },
        orderBy: {
            date: 'asc'
        },
        take: 1
    });

    return NextResponse.json(nextShift || { message: 'No upcoming shifts' });
  } catch (error: any) {
    console.error('Error fetching next shift:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
