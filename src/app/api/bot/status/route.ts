import { NextResponse, type NextRequest } from 'next/server';
import { requireSession } from '@/lib/guards';
import { getBotStatus } from '@/lib/services/bot';

export async function GET(request: NextRequest) {
  const guard = await requireSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const status = await getBotStatus();
  return NextResponse.json({ status });
}
