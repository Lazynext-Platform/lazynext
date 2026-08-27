// Empty stub used to alias away Node.js built-in modules (e.g. `async_hooks`)
// in client/browser bundles. The real module is only used server-side; client
// component graphs can transitively import it (page → atlas.ts →
// request-context.ts), but the client never calls those functions, so the stub
// is safe. This mirrors the webpack `resolve.fallback: { async_hooks: false }`
// pattern in next.config.mjs for Turbopack (which ignores webpack config).
//
// Turbopack validates that named exports exist in the target module, so we
// export a mock class matching the `AsyncLocalStorage` interface. It is never
// instantiated or called in the browser (the store is created lazily and only
// invoked from server-side route handlers).

export class AsyncLocalStorage<T> {
  run<R>(_store: T, callback: () => R): R {
    return callback();
  }
  getStore(): T | undefined {
    return undefined;
  }
  enterWith(_store: T): void {}
  disable(): void {}
  exit<R>(callback: () => R): R {
    return callback();
  }
}
