import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { AppFrame } from "@/components/app-frame";
import ModeLayout from "@/app/mode/layout";
import ExploreLayout from "@/app/explore/layout";
import ProfileLayout from "@/app/profile/layout";
import AuthLayout from "@/app/auth/layout";
import PrivacyPage from "@/app/privacy/page";
import TermsPage from "@/app/terms/page";
import SupportPage from "@/app/support/page";
import LandingPage from "@/app/landing/page";

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

describe("content pages are not framed", () => {
  const pages = [
    ["privacy", PrivacyPage],
    ["terms", TermsPage],
    ["support", SupportPage],
    ["landing", LandingPage],
  ] as const;

  for (const [name, Page] of pages) {
    it(`/${name} stays full-width on desktop`, () => {
      const { container } = render(<Page />);
      expect(container.querySelector(".app-frame")).toBeNull();
    });
  }
});
