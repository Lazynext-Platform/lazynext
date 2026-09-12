// Minimal mock of next/server for test environment.
// Provides NextRequest and NextResponse stubs that work without a full Next.js runtime.

export class NextRequest extends Request {
  constructor(input, init) {
    super(input, init);
    this.url = typeof input === 'string' ? input : input.toString();
    this.method = (init && init.method) || 'GET';
    this.headers = new Headers((init && init.headers) || undefined);
  }
}

export class NextResponse extends Response {
  static json(body, init) {
    const bodyStr = JSON.stringify(body);
    const headers = { 'Content-Type': 'application/json' };
    if (init && init.headers) {
      if (init.headers instanceof Headers) {
        for (const [k, v] of init.headers.entries()) headers[k] = v;
      } else {
        Object.assign(headers, init.headers);
      }
    }
    return new NextResponse(bodyStr, {
      ...init,
      headers,
    });
  }

  constructor(body, init) {
    super(body, init);
  }

  async json() {
    const text = await super.text();
    return JSON.parse(text);
  }
}
