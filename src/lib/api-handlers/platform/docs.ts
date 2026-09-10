import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SdkGenerator } from '@/lib/services/sdk-generator';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const baseUrl = req.nextUrl.searchParams.get('baseUrl') || 'https://api.lazynext.com';
  const docs = SdkGenerator.generateDocs(baseUrl);
  return NextResponse.json({ docs });
}
