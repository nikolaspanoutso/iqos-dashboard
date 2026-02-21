import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// export const dynamic = 'force-dynamic'; // Removed duplicate
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const role = searchParams.get('role');
  const showAll = searchParams.get('all') === 'true'; // For stats

  try {
    const whereClause: any = {};
    
    // Default: Hide inactive stores unless 'all=true' is requested
    if (!showAll) {
        whereClause.isActive = true;
    }

    // Scoping Logic:
    if (role === 'activator' && userId) {
        whereClause.activatorId = userId;
    }

    // ALWAYS hide system adjustment store from regular lists
    whereClause.name = { not: 'System - Specialist Adjustments' };

    const stores = await prisma.store.findMany({
      where: whereClause,
      include: {
        _count: {
          select: { sales: true }
        }
      }
    });
    
    return NextResponse.json(stores);
  } catch (error) {
    console.error("Failed to fetch stores", error);
    return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, action, name } = body;

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        if (action === 'delete') {
            const updated = await prisma.store.update({
                where: { id },
                data: { isActive: false }
            });
            return NextResponse.json(updated);
        }

        if (action === 'update') {
            const updateData: any = {};
            if (name !== undefined) updateData.name = name;
            if (body.totalAcquisition !== undefined) {
                updateData.totalAcquisition = Number(body.totalAcquisition);
            }
            
            const updated = await prisma.store.update({
                where: { id },
                data: updateData
            });
            return NextResponse.json(updated);
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error("Failed to update store", error);
        return NextResponse.json({ error: 'Failed to update store' }, { status: 500 });
    }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, type, address, area, lat, lng, activatorId } = body;

    if (!name || !lat || !lng) {
        return NextResponse.json({ error: 'Name and Location are required' }, { status: 400 });
    }

    const newStore = await prisma.store.create({
        data: {
            name,
            type,
            address,
            area,
            lat,
            lng,
            activatorId: activatorId || null, // Link to creator
            totalAcquisition: 0 // Start with 0
        }
    });

    return NextResponse.json(newStore);
  } catch (error) {
    console.error("Failed to create store", error);
    return NextResponse.json({ error: 'Failed to create store' }, { status: 500 });
  }
}
