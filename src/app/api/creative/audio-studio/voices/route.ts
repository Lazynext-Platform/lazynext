import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { getVoiceProfiles, type VoiceGender, type VoiceTone, type VoiceLanguage } from '@/lib/creative/audio-studio';

async function __byokGET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const gender = (url.searchParams.get('gender') || undefined)?.slice(0, 50) as VoiceGender | undefined;
  const tone = (url.searchParams.get('tone') || undefined)?.slice(0, 50) as VoiceTone | undefined;
  const language = (url.searchParams.get('language') || undefined)?.slice(0, 20) as VoiceLanguage | undefined;

  const voices = getVoiceProfiles({ gender, tone, language });
  return NextResponse.json({ voices });
}

export const GET = withAtlas(__byokGET);
