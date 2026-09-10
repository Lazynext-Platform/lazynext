import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ChurnPredictionService } from '@/lib/services/churn-prediction-service';

/** POST /api/feedback/churn/predict — predict churn for a customer */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const customerId = String(body.customerId || '').trim();
  if (!customerId) {
    return NextResponse.json({ error: 'customerId_required' }, { status: 400 });
  }

  try {
    const prediction = await ChurnPredictionService.predict(customerId);
    if (!prediction) {
      return NextResponse.json({ error: 'customer_not_found' }, { status: 404 });
    }
    return NextResponse.json({ prediction });
  } catch (e) {
    console.error('[feedback/churn/predict] error:', e);
    return NextResponse.json({ error: 'failed_to_predict' }, { status: 500 });
  }
}
