import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SdkGenerator } from '@/lib/services/sdk-generator';

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const language = String(body.language || 'javascript');
  const baseUrl = String(body.baseUrl || 'https://api.lazynext.com');
  const apiKey = String(body.apiKey || 'YOUR_API_KEY');

  try {
    if (language === 'all') {
      const snippets = SdkGenerator.generateAll(baseUrl, apiKey);
      return NextResponse.json({ snippets });
    }
    const generators: Record<string, (b: string, k: string) => string> = {
      javascript: (b, k) => SdkGenerator.generateJavaScript(b, k),
      python: (b, k) => SdkGenerator.generatePython(b, k),
      go: (b, k) => SdkGenerator.generateGo(b, k),
      curl: (b, k) => SdkGenerator.generateCurl(b, k),
      rust: (b, k) => SdkGenerator.generateRust(b, k),
    };
    const gen = generators[language];
    if (!gen) return NextResponse.json({ error: 'unsupported_language' }, { status: 400 });
    const code = gen(baseUrl, apiKey);
    return NextResponse.json({ language, code });
  } catch (e) {
    console.error('[platform/sdk] generate error:', e);
    return NextResponse.json({ error: 'generation_failed' }, { status: 500 });
  }
}
