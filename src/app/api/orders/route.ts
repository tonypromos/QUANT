import { NextResponse, type NextRequest } from 'next/server';
import { OrderStatus } from '@prisma/client';
import { requireSession } from '@/lib/guards';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const guard = await requireSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const status = request.nextUrl.searchParams.get('status');

  const statusFilter = status && Object.values(OrderStatus).includes(status as OrderStatus) ? (status as OrderStatus) : undefined;

  const orders = await prisma.liveOrder.findMany({
    where: statusFilter ? { status: statusFilter } : {},
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      fills: true
    }
  });

  return NextResponse.json({ orders });
}
