/**
 * Stand-alone Cloudflare Worker: pings every one of the main app's cron
 * routes hourly, since Vercel Hobby only allows daily cron jobs (see
 * ../../vercel.json, where each route also runs once a day as the
 * fallback/baseline — every route is safe to run twice). Deployed and
 * scheduled independently of the Next.js app itself — this touches no app
 * code, no database directly. A new /api/cron route belongs in JOBS below.
 *
 * The Worker's name predates the other jobs. Renaming it in wrangler.jsonc
 * would deploy a second Worker next to this one, not rename it.
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

const APP_URL = "https://le-sillage.vercel.app";

// Run one after another, in this order. Each cutoff job goes before the
// email for the same order clock, so an order that is due for both in one
// tick (say, after a missed run) is closed out rather than emailed and then
// closed a second later.
const JOBS = [
  "auto-reject-orders",
  "payment-reminders",
  "delivery-auto-complete",
  "delivery-followups",
  "archive-sweep",
] as const;

// scheduled-only — no fetch handler, so this Worker has no public HTTP
// route at all (no workers.dev subdomain needed either). Check activity
// via `npx wrangler tail` or the dashboard's Logs tab.
export default {
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runAll(env));
  },
};

// One job failing does not stop the rest. The run still throws at the end
// so the dashboard's cron events show it, instead of a 401 hiding in logs.
async function runAll(env: Env): Promise<void> {
  const failed: string[] = [];
  for (const job of JOBS) {
    if (!(await run(job, env))) failed.push(job);
  }
  if (failed.length > 0) {
    throw new Error(`cron pings failed: ${failed.join(", ")}`);
  }
}

async function run(job: (typeof JOBS)[number], env: Env): Promise<boolean> {
  try {
    const response = await fetch(`${APP_URL}/api/cron/${job}`, {
      headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
    });
    const body = await response.text();
    if (!response.ok) {
      console.error(`${job} ping failed: ${response.status} ${body}`);
      return false;
    }
    console.log(`${job} ping ok: ${body}`);
    return true;
  } catch (error) {
    console.error(`${job} ping threw: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}
