import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AuthForm } from "@/app/auth/auth-form";
import { createClient } from "@/lib/supabase/client";

const mockSignIn = vi.fn().mockResolvedValue({ error: null });
const mockSignUp = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword: mockSignIn,
      signUp: mockSignUp,
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
  mockSignIn.mockResolvedValue({ error: null });
  mockSignUp.mockResolvedValue({ error: null });
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

  it("clears error message when toggling modes", async () => {
    mockSignIn.mockResolvedValue({ error: { message: "Invalid credentials" } });
    render(<AuthForm />);

    // Fill form and submit to trigger an error
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "test@test.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "password123" } });
    fireEvent.submit(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });

    // Toggle to sign-up — error should be cleared
    fireEvent.click(screen.getByText(/Need an account/));
    expect(screen.queryByText("Invalid credentials")).not.toBeInTheDocument();
  });
});

describe("AuthForm submission", () => {
  it("calls signInWithPassword on sign-in submit", async () => {
    render(<AuthForm />);
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "secret123" } });
    fireEvent.submit(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "secret123",
      });
    });
  });

  it("redirects to home on successful sign-in", async () => {
    render(<AuthForm />);
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "secret123" } });
    fireEvent.submit(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/");
    });
  });

  it("displays error on failed sign-in", async () => {
    mockSignIn.mockResolvedValue({ error: { message: "Invalid login credentials" } });
    render(<AuthForm />);
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "bad@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "wrong" } });
    fireEvent.submit(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByText("Invalid login credentials")).toBeInTheDocument();
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("calls signUp on sign-up submit", async () => {
    mockSearchParams = new URLSearchParams("reason=favorites");
    render(<AuthForm />);
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "new@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "newpass123" } });
    fireEvent.submit(screen.getByRole("button", { name: "Sign up" }));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: "new@example.com",
        password: "newpass123",
        options: { emailRedirectTo: expect.stringContaining("/auth/callback") },
      });
    });
  });

  it("shows confirmation message on successful sign-up", async () => {
    mockSearchParams = new URLSearchParams("reason=favorites");
    render(<AuthForm />);
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "new@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "newpass123" } });
    fireEvent.submit(screen.getByRole("button", { name: "Sign up" }));

    await waitFor(() => {
      expect(screen.getByText("Check your email for a confirmation link.")).toBeInTheDocument();
    });
  });

  it("displays error on failed sign-up", async () => {
    mockSignUp.mockResolvedValue({ error: { message: "User already registered" } });
    mockSearchParams = new URLSearchParams("reason=favorites");
    render(<AuthForm />);
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "exists@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "pass123" } });
    fireEvent.submit(screen.getByRole("button", { name: "Sign up" }));

    await waitFor(() => {
      expect(screen.getByText("User already registered")).toBeInTheDocument();
    });
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
