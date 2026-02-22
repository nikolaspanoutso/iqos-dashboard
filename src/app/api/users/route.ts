import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const users = await prisma.user.findMany();
    // If no users, we might want to seed?
    // frontend will handle empty list.
    return NextResponse.json(users);
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json({ error: 'Failed to fetch users', details: String(error) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { name, bonusTarget, bonusTargetType, pillarGoal, pillarGoalType, activatorTarget } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'User name is required' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { name },
      data: {
        bonusTarget: bonusTarget !== undefined ? Number(bonusTarget) : undefined,
        bonusTargetType,
        pillarGoal: pillarGoal !== undefined ? Number(pillarGoal) : undefined,
        pillarGoalType,
        activatorTarget: activatorTarget !== undefined ? parseInt(activatorTarget) : undefined,
      }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json({ error: 'Failed to update user', details: String(error) }, { status: 500 });
  }
}
