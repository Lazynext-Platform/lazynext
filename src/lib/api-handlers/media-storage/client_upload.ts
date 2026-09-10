import { auth } from '@/../auth';
import { handleClientUploadRequest } from '@/lib/media-storage';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  return handleClientUploadRequest(request, async () => {
    const session = await auth();
    if (!session?.user?.id) throw new Error('unauthorized');
    return session.user.id;
  });
}
