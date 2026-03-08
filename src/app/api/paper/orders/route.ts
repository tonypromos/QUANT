import { NextResponse, type NextRequest } from 'next/server';
import { requireSession } from '@/lib/guards';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const guard = await requireSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const orders = await prisma.paperOrder.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      fills: true
    }
  });

  return NextResponse.json({ orders });
}
