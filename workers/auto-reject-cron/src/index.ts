/**
 * Stand-alone Cloudflare Worker: pings the main app's auto-reject-orders
 * cron route hourly, since Vercel Hobby only allows daily cron jobs (see
 * ../../vercel.json, where the same route runs once a day at 3am UTC as
 * the fallback/baseline). Deployed and scheduled independently of the
 * Next.js app itself — this touches no app code, no database directly.
 *
 * Targets the stable *.vercel.app URL rather than the custom domain, so
 * this keeps working regardless of DNS/certificate state on the custom
 * domain.
 *
 * Setup (one-time):
 *   cd workers/auto-reject-cron
 *   npx wrangler secret put CRON_SECRET   # paste the same value as Vercel's CRON_SECRET
 *   npx wrangler deploy
 */

export interface Env {
  CRON_SECRET: string;
}

const TARGET_URL = "https://le-sillage.vercel.app/api/cron/auto-reject-orders";

// scheduled-only — no fetch handler, so this Worker has no public HTTP
// route at all (no workers.dev subdomain needed either). Check activity
// via `npx wrangler tail` or the dashboard's Logs tab.
export default {
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(run(env));
  },
};

async function run(env: Env): Promise<{ status: number; body: string }> {
  const response = await fetch(TARGET_URL, {
    headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
  });
  const body = await response.text();
  if (!response.ok) {
    console.error(`auto-reject-orders ping failed: ${response.status} ${body}`);
  } else {
    console.log(`auto-reject-orders ping ok: ${body}`);
  }
  return { status: response.status, body };
}
