/**
 * Instrumentation hook for Next.js.
 *
 * This file exists to satisfy the Node.js middleware runtime's
 * `getInstrumentationModule` require call. Without it, the proxy.ts
 * (Node.js middleware) throws "Dynamic require of instrumentation.js
 * is not supported" because the file is missing from the bundle.
 *
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // No-op — instrumentation is not used by this project.
}

const instrumentation = { register };
export default instrumentation;
