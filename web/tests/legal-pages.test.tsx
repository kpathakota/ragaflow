import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PrivacyPage from "@/app/privacy/page";
import SupportPage from "@/app/support/page";

const CONTACT_EMAIL = "kpats@hey.com";

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
});
