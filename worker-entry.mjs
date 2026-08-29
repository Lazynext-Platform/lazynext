// Custom worker entry that wraps the OpenNext worker and adds a Cloudflare
// Cron Trigger `scheduled` handler. The scheduled handler dispatches an
// internal Request to /api/publish/process-scheduled with the CRON_SECRET
// authorization header, so scheduled posts are processed automatically.
//
// This file is referenced by wrangler.jsonc `main` and imports the built
// OpenNext worker at `.open-next/worker.js`. Re-run `npm run build` to
// regenerate `.open-next/worker.js` after code changes; this wrapper is
// stable and does not need rebuilding.

//@ts-expect-error: resolved by wrangler build
import openNextHandler from "./.open-next/worker.js";

export default {
  fetch: openNextHandler.fetch.bind(openNextHandler),

  async scheduled(event, env, ctx) {
    const cronSecret = env.CRON_SECRET;
    if (!cronSecret) {
      console.warn("[scheduled] CRON_SECRET not set — skipping scheduled post processing");
      return;
    }
    // Determine the base URL. Prefer the custom domain, fall back to the
    // workers.dev URL, and finally to a localhost fallback for `wrangler dev`.
    const base =
      env.LAZYNEXT_BASE_URL ||
      "https://lazynext.com";
    const url = `${base}/api/publish/process-scheduled`;
    const req = new Request(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${cronSecret}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
    });
    ctx.waitUntil(
      (async () => {
        try {
          const res = await openNextHandler.fetch(req, env, ctx);
          const text = await res.text();
          console.log(`[scheduled] process-scheduled status=${res.status} body=${text.slice(0, 500)}`);
        } catch (e) {
          console.error("[scheduled] process-scheduled failed:", String(e));
        }
      })()
    );
  },
};
