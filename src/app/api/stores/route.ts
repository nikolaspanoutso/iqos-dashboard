import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const stores = await prisma.store.findMany({
      include: {
        _count: {
          select: { sales: true } // Optional: Get simple sale count
        }
      }
    });
    
    // Transform or validate if needed
    return NextResponse.json(stores);
  } catch (error) {
    console.error("Failed to fetch stores", error);
    return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 });
  }
}
