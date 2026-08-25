import { serveMedia } from '@/lib/media-storage';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  return serveMedia(request, key, true);
}

export async function HEAD(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  return serveMedia(request, key, false);
}
