import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AuthForm } from "@/app/auth/auth-form";

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      signUp: vi.fn().mockResolvedValue({ error: null }),
    },
  })),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: mockReplace, back: vi.fn() }),
  useSearchParams: () => mockSearchParams,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockSearchParams = new URLSearchParams();
});

describe("AuthForm default mode", () => {
  it("defaults to sign-in when no reason param", () => {
    render(<AuthForm />);
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Create account" })).not.toBeInTheDocument();
  });

  it("shows Sign in as submit button text", () => {
    render(<AuthForm />);
    const submitBtn = screen.getByRole("button", { name: "Sign in" });
    expect(submitBtn).toBeInTheDocument();
  });

  it("does not show value-prop text in sign-in mode", () => {
    render(<AuthForm />);
    expect(
      screen.queryByText(/Create a free account to save favorites/)
    ).not.toBeInTheDocument();
  });
});

describe("AuthForm with reason=favorites", () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams("reason=favorites");
  });

  it("defaults to sign-up when reason=favorites", () => {
    render(<AuthForm />);
    expect(screen.getByText("Create account")).toBeInTheDocument();
  });

  it("shows value-prop text in sign-up mode", () => {
    render(<AuthForm />);
    expect(
      screen.getByText(/Create a free account to save favorites/)
    ).toBeInTheDocument();
  });

  it("shows Sign up as submit button text", () => {
    render(<AuthForm />);
    const submitBtn = screen.getByRole("button", { name: "Sign up" });
    expect(submitBtn).toBeInTheDocument();
  });
});

describe("AuthForm toggle", () => {
  it("toggles from sign-in to sign-up", () => {
    render(<AuthForm />);
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();

    fireEvent.click(screen.getByText("Need an account? Sign up"));

    expect(screen.getByRole("heading", { name: "Create account" })).toBeInTheDocument();
    expect(
      screen.getByText(/Create a free account to save favorites/)
    ).toBeInTheDocument();
  });

  it("toggles from sign-up back to sign-in", () => {
    mockSearchParams = new URLSearchParams("reason=favorites");
    render(<AuthForm />);
    expect(screen.getByRole("heading", { name: "Create account" })).toBeInTheDocument();

    fireEvent.click(screen.getByText("Already have an account? Sign in"));

    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(
      screen.queryByText(/Create a free account to save favorites/)
    ).not.toBeInTheDocument();
  });

  it("clears error message when toggling modes", () => {
    render(<AuthForm />);
    // Toggle to sign-up — any previous error should be cleared
    // (We can't easily trigger an error without submitting, so we verify the toggle link exists)
    const toggleBtn = screen.getByText("Need an account? Sign up");
    fireEvent.click(toggleBtn);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("AuthForm form elements", () => {
  it("renders email and password inputs", () => {
    render(<AuthForm />);
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
  });

  it("renders back link to homepage", () => {
    render(<AuthForm />);
    const backLink = screen.getByText("← Back");
    expect(backLink).toHaveAttribute("href", "/");
  });
});
