import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { AppFrame } from "@/components/app-frame";
import ModeLayout from "@/app/mode/layout";
import ExploreLayout from "@/app/explore/layout";
import ProfileLayout from "@/app/profile/layout";
import AuthLayout from "@/app/auth/layout";

/**
 * The phone frame applies to the interactive app surfaces only. The public
 * content pages (`/`, `/landing`, `/privacy`, `/terms`, `/support`) lay out
 * full-width on desktop — people reach those from search results and the App
 * Store listing, so boxing them at 430px wastes the viewport.
 */
describe("AppFrame", () => {
  it("wraps children in the frame", () => {
    const { container } = render(
      <AppFrame>
        <p>boxed</p>
      </AppFrame>,
    );
    const frame = container.querySelector(".app-frame");
    expect(frame).not.toBeNull();
    expect(frame).toHaveTextContent("boxed");
  });
});

describe("app route segments are framed", () => {
  const layouts = [
    ["mode", ModeLayout],
    ["explore", ExploreLayout],
    ["profile", ProfileLayout],
    ["auth", AuthLayout],
  ] as const;

  for (const [name, Layout] of layouts) {
    it(`/${name} keeps the phone frame`, () => {
      const { container } = render(<Layout>
        <p>{name}</p>
      </Layout>);
      expect(container.querySelector(".app-frame")).not.toBeNull();
    });
  }
});

/**
 * The frame is applied by layouts, never by the page components — so asserting
 * that a page component renders no `.app-frame` proves nothing (it never could).
 * The real invariants are structural: the root layout must not reintroduce a
 * global frame, and the content routes must not gain a layout that adds one.
 */
describe("content routes stay unframed", () => {
  const CONTENT_ROUTES = ["", "landing", "privacy", "terms", "support"];

  it("the root layout applies no global frame", () => {
    const root = readFileSync(join("app", "layout.tsx"), "utf8");
    expect(root).not.toContain("app-frame");
    expect(root).not.toContain("AppFrame");
  });

  for (const route of CONTENT_ROUTES) {
    it(`/${route} has no layout reintroducing the frame`, () => {
      const layout = join("app", route, "layout.tsx");
      // The root layout is the only layout on these routes. If someone adds a
      // segment layout here later, it must not pull in AppFrame.
      if (route !== "" && existsSync(layout)) {
        expect(readFileSync(layout, "utf8")).not.toContain("AppFrame");
      }
    });
  }
});
