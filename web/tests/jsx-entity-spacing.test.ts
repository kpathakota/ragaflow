import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Guards a real rendering bug found on /privacy and /terms.
 *
 * When a JSX text chunk follows a closing inline tag AND contains an HTML
 * entity (&rsquo;, &ldquo;, …), SWC drops the leading space during
 * `next build` — "We do not collect" + " your location" rendered as
 * "We do not collectyour location" on the pages Apple reads during App Store
 * review. Sibling paragraphs without an entity in the same text chunk keep
 * their space, which is what makes this so easy to miss.
 *
 * This is a SOURCE-level check on purpose: vitest transforms JSX with esbuild,
 * which preserves the space, so a render-and-assert test passes even against
 * the broken source. Only a production build reproduces it.
 *
 * The fix is always an explicit {" "} instead of a literal space.
 */

const INLINE_CLOSE_THEN_TEXT =
  /<\/(strong|em|b|i|span|a|code)>[ \t]+(?=\S)([^<{]*)/g;
const HTML_ENTITY = /&\w+;/;

function tsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...tsxFiles(full));
    else if (entry.endsWith(".tsx")) out.push(full);
  }
  return out;
}

describe("JSX spacing around HTML entities", () => {
  it("never relies on a literal space before an entity-bearing text chunk", () => {
    const offenders: string[] = [];

    for (const file of [...tsxFiles("app"), ...tsxFiles("components")]) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(INLINE_CLOSE_THEN_TEXT)) {
        if (!HTML_ENTITY.test(match[2])) continue;
        const line = source.slice(0, match.index).split("\n").length;
        offenders.push(`${file}:${line} — ${match[0].trim().slice(0, 60)}`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
