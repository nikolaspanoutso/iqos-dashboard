import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const comments = await prisma.comment.findMany({
      orderBy: { timestamp: 'desc' },
      take: 500 // Limit for performance
    });
    return NextResponse.json(comments);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { storeId, userId, text } = body;
    
    const comment = await prisma.comment.create({
      data: { storeId, userId, text }
    });
    
    return NextResponse.json(comment);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
