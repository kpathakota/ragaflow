import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PrivacyPage from "@/app/privacy/page";
import SupportPage from "@/app/support/page";
import TermsPage from "@/app/terms/page";
import LandingPage from "@/app/landing/page";

const CONTACT_EMAIL = "support@ragaflow.io";

describe("Privacy page", () => {
  it("renders the policy with required sections", () => {
    render(<PrivacyPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /privacy policy/i }),
    ).toBeInTheDocument();
    for (const heading of [
      /what we collect/i,
      /how we use it/i,
      /where your data lives/i,
      /your choices/i,
      /children/i,
      /contact/i,
    ]) {
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    }
  });

  it("exposes a working contact mailto (required for account deletion)", () => {
    render(<PrivacyPage />);
    const link = screen.getByRole("link", { name: CONTACT_EMAIL });
    expect(link).toHaveAttribute("href", `mailto:${CONTACT_EMAIL}`);
  });

  it("states we do not sell data", () => {
    render(<PrivacyPage />);
    expect(screen.getByText(/we do not sell your personal information/i)).toBeInTheDocument();
  });

  it("describes in-app account deletion (App Store 5.1.1(v))", () => {
    render(<PrivacyPage />);
    expect(
      screen.getByText(/delete your account in the app \(Profile → Delete\s*account\)/i),
    ).toBeInTheDocument();
  });
});

describe("Support page", () => {
  it("renders with a contact mailto and a link to the privacy policy", () => {
    render(<SupportPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /support/i }),
    ).toBeInTheDocument();

    const mailtos = screen
      .getAllByRole("link")
      .filter((el) => el.getAttribute("href") === `mailto:${CONTACT_EMAIL}`);
    expect(mailtos.length).toBeGreaterThan(0);

    const privacyLink = screen.getByRole("link", { name: /privacy policy/i });
    expect(privacyLink).toHaveAttribute("href", "/privacy");
  });

  it("mentions the in-app account deletion path", () => {
    render(<SupportPage />);
    expect(
      screen.getByText(/Go to Profile → Delete account/i),
    ).toBeInTheDocument();
  });
});

describe("Terms page", () => {
  it("renders the terms with required sections", () => {
    render(<TermsPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /terms of service/i }),
    ).toBeInTheDocument();
    for (const heading of [
      /the service/i,
      /your account/i,
      /acceptable use/i,
      /payments and subscriptions/i,
      /limitation of liability/i,
      /governing law/i,
      /contact/i,
    ]) {
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    }
  });

  it("exposes the contact mailto and links to the privacy policy", () => {
    render(<TermsPage />);
    const mailto = screen.getByRole("link", { name: CONTACT_EMAIL });
    expect(mailto).toHaveAttribute("href", `mailto:${CONTACT_EMAIL}`);
    expect(
      screen.getByRole("link", { name: /privacy policy/i }),
    ).toHaveAttribute("href", "/privacy");
  });
});

describe("Landing page", () => {
  it("renders the hero, CTAs, and the three moods", () => {
    render(<LandingPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /ragaflow/i }),
    ).toBeInTheDocument();

    // Both primary CTAs point at the app (same-origin "/" until NEXT_PUBLIC_APP_URL is set).
    const startLinks = screen
      .getAllByRole("link", { name: /start listening/i });
    expect(startLinks.length).toBeGreaterThanOrEqual(2);
    for (const link of startLinks) {
      expect(link).toHaveAttribute("href", "/");
    }

    for (const mood of [/focus/i, /sleep/i, /meditate/i]) {
      expect(screen.getByRole("heading", { name: mood })).toBeInTheDocument();
    }
  });

  it("footer links to privacy, terms, and support", () => {
    render(<LandingPage />);
    expect(screen.getByRole("link", { name: /^privacy$/i })).toHaveAttribute(
      "href",
      "/privacy",
    );
    expect(screen.getByRole("link", { name: /^terms$/i })).toHaveAttribute(
      "href",
      "/terms",
    );
    expect(screen.getByRole("link", { name: /^support$/i })).toHaveAttribute(
      "href",
      "/support",
    );
  });
});
