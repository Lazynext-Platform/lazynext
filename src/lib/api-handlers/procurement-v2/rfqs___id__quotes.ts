import { NextRequest, NextResponse } from 'next/server';
import { RFQService } from '@/lib/services/rfq-service';

/** GET /api/procurement-v2/rfqs/[id]/quotes — get all quotes for an RFQ */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const quotes = await RFQService.getQuotes(id);
  return NextResponse.json({ quotes });
}

/** POST /api/procurement-v2/rfqs/[id]/quotes — add a supplier quote */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const vendorId = String(body.vendorId || '').trim();
  const vendorName = String(body.vendorName || '').trim();
  if (!vendorId || !vendorName) {
    return NextResponse.json({ error: 'vendor_required' }, { status: 400 });
  }
  if (!Array.isArray(body.items)) {
    return NextResponse.json({ error: 'items_required' }, { status: 400 });
  }

  try {
    const rfq = await RFQService.addQuote(id, {
      vendorId,
      vendorName,
      items: body.items,
      totalQuote: Number(body.totalQuote) || 0,
      validUntil: body.validUntil,
      notes: body.notes,
    });
    if (!rfq) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ rfq }, { status: 201 });
  } catch (e) {
    console.error('[procurement-v2/rfqs/quotes] add error:', e);
    return NextResponse.json({ error: 'failed_to_add_quote' }, { status: 500 });
  }
}
