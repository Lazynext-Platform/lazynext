import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// List the authenticated user's products.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const products = await prisma.adProduct.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ products });
}

// Create a product. Validates required fields and length limits.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  if (!name) return NextResponse.json({ error: 'name_required' }, { status: 400 });
  if (!description) return NextResponse.json({ error: 'description_required' }, { status: 400 });
  const imageUrl = typeof body.imageUrl === 'string' && /^https?:\/\//.test(body.imageUrl) ? body.imageUrl : null;
  const sourceUrl = typeof body.sourceUrl === 'string' && /^https?:\/\//.test(body.sourceUrl) ? body.sourceUrl : null;

  const product = await prisma.adProduct.create({
    data: {
      userId: session.user.id,
      name: name.slice(0, 120),
      description: description.slice(0, 2000),
      imageUrl,
      sourceUrl,
    },
  });
  return NextResponse.json({ product }, { status: 201 });
}
