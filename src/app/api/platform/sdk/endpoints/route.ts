import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SdkGenerator } from '@/lib/services/sdk-generator';

export async function GET() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const endpoints = SdkGenerator.getEndpointList();
  return NextResponse.json({ endpoints });
}
