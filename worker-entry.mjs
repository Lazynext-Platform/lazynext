// Custom worker entry that wraps the OpenNext worker and adds a Cloudflare
// Cron Trigger `scheduled` handler. The scheduled handler dispatches an
// internal Request to /api/publish/process-scheduled with the CRON_SECRET
// authorization header, so scheduled posts are processed automatically.
//
// This file is referenced by wrangler.jsonc `main` and imports the built
// OpenNext worker at `.open-next/worker.js`. Re-run `npm run build` to
// regenerate `.open-next/worker.js` after code changes; this wrapper is
// stable and does not need rebuilding.
//
// The scheduled handler invokes openNextHandler.fetch() directly (an
// in-isolate subrequest) rather than making an outbound HTTP fetch to the
// public domain. This avoids DNS/egress issues and works regardless of
// whether the custom domain is live.

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
    // Use a localhost URL for the internal subrequest. The OpenNext handler
    // routes based on the pathname, not the host, so this works correctly
    // without any external DNS resolution or network egress.
    const url = "http://localhost/api/publish/process-scheduled";
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
