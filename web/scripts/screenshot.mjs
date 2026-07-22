#!/usr/bin/env node
/**
 * Visual snapshot harness (automation D4).
 *
 * Captures one screen (or all) at mobile + desktop widths against a running
 * Next.js server, writing PNGs to an output directory. The /modernize-screen
 * worker calls this twice — once on `dev` (before) and once on the feature
 * branch (after) — then uploads the pair to the PR.
 *
 * Usage:
 *   node scripts/screenshot.mjs --screen player --out ../.automation/shots/after
 *   node scripts/screenshot.mjs --all --out /tmp/before --base-url http://localhost:3000
 *
 * Flags:
 *   --screen <name>   one of: home, auth, explore, track-list, player, profile
 *   --all             capture every screen (ignores --screen)
 *   --out <dir>       output directory (created if missing). Default: ./.automation/shots
 *   --base-url <url>  server to hit. Default: http://localhost:3000
 *
 * Requires a server already running at --base-url with Supabase env configured
 * (otherwise pages render empty). Start it with `npm run dev` first.
 */

import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

// Screen → how to reach it. `prepare` runs after the initial goto for screens
// behind a dynamic route (e.g. the player needs a real trackId).
const SCREENS = {
  home: { path: "/" },
  auth: { path: "/auth" },
  explore: { path: "/explore" },
  "track-list": { path: "/mode/focus" },
  player: {
    path: "/mode/focus",
    prepare: async (page) => {
      // The player lives behind a dynamic /mode/focus/<trackId> route, so we
      // reach it by clicking the first track card. This needs seeded content —
      // fail fast with an actionable message if the scenario has no tracks.
      const firstTrack = page.locator('a[href^="/mode/focus/"]').first();
      if ((await firstTrack.count()) === 0) {
        throw new Error(
          "no tracks on /mode/focus — player capture needs seeded content " +
            "(run supabase/seed.sql on staging, or use /upload-tracks)"
        );
      }
      await firstTrack.click({ timeout: 10000 });
      await page.waitForURL("**/mode/focus/**", { timeout: 10000 });
    },
  },
  profile: { path: "/profile" }, // redirects to /auth when signed out — that state is valid to snapshot
};

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 800 },
];

// Kill animations + caret so before/after diffs are deterministic (the player's
// breathing orb and crossfades would otherwise produce noise every run).
const FREEZE_CSS = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    caret-color: transparent !important;
  }
`;

function parseArgs(argv) {
  const args = { out: "./.automation/shots", baseUrl: "http://localhost:3000", all: false };
  for (let i = 2; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === "--all") args.all = true;
    else if (flag === "--screen") args.screen = argv[++i];
    else if (flag === "--out") args.out = argv[++i];
    else if (flag === "--base-url") args.baseUrl = argv[++i];
    else throw new Error(`Unknown flag: ${flag}`);
  }
  return args;
}

async function captureScreen(browser, baseUrl, outDir, name, spec) {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    try {
      await page.goto(`${baseUrl}${spec.path}`, { waitUntil: "networkidle", timeout: 30000 });
      if (spec.prepare) await spec.prepare(page);
      await page.addStyleTag({ content: FREEZE_CSS });
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(800); // let fonts/layout settle
      const file = resolve(outDir, `${name}-${vp.name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log(`  ✓ ${name}-${vp.name}.png`);
    } catch (err) {
      console.error(`  ✗ ${name}-${vp.name}: ${err.message}`);
      throw err;
    } finally {
      await context.close();
    }
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const outDir = resolve(process.cwd(), args.out);
  await mkdir(outDir, { recursive: true });

  const targets = args.all
    ? Object.keys(SCREENS)
    : [args.screen].filter(Boolean);

  if (targets.length === 0) {
    console.error("Specify --screen <name> or --all. Screens: " + Object.keys(SCREENS).join(", "));
    process.exit(2);
  }
  for (const name of targets) {
    if (!SCREENS[name]) {
      console.error(`Unknown screen "${name}". Screens: ${Object.keys(SCREENS).join(", ")}`);
      process.exit(2);
    }
  }

  console.log(`Capturing [${targets.join(", ")}] from ${args.baseUrl} → ${outDir}`);
  const browser = await chromium.launch();
  const failed = [];
  try {
    for (const name of targets) {
      console.log(`${name}:`);
      try {
        await captureScreen(browser, args.baseUrl, outDir, name, SCREENS[name]);
      } catch (err) {
        // Don't let one screen abort an --all run; record and move on.
        console.error(`  ✗ ${name} skipped: ${err.message.split("\n")[0]}`);
        failed.push(name);
      }
    }
  } finally {
    await browser.close();
  }

  if (failed.length > 0) {
    console.error(`Done with ${failed.length} failure(s): ${failed.join(", ")}`);
    process.exit(1);
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
