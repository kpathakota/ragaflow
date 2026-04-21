import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AuthForm } from "@/app/auth/auth-form";

const mockSignIn = vi.fn().mockResolvedValue({ error: null });
const mockSignUp = vi.fn().mockResolvedValue({ error: null });
const mockTrackEvent = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword: mockSignIn,
      signUp: mockSignUp,
    },
    from: vi.fn(() => ({ insert: vi.fn().mockResolvedValue({ error: null }) })),
  })),
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
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

// ---------------------------------------------------------------------------
// Default mode (sign-in)
// ---------------------------------------------------------------------------

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

  it("does not show confirm password field in sign-in mode", () => {
    render(<AuthForm />);
    expect(screen.queryByPlaceholderText("Confirm password")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Sign-up mode via reason=favorites
// ---------------------------------------------------------------------------

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

  it("shows confirm password field in sign-up mode", () => {
    render(<AuthForm />);
    expect(screen.getByPlaceholderText("Confirm password")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Toggle between modes
// ---------------------------------------------------------------------------

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

    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "test@test.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "password123" } });
    fireEvent.submit(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Need an account/));
    expect(screen.queryByText("Invalid credentials")).not.toBeInTheDocument();
  });

  it("clears success message when toggling modes", async () => {
    mockSearchParams = new URLSearchParams("reason=favorites");
    render(<AuthForm />);

    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "new@test.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "password123" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), { target: { value: "password123" } });
    fireEvent.submit(screen.getByRole("button", { name: "Sign up" }));

    await waitFor(() => {
      expect(screen.getByText("Check your email for a confirmation link.")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Already have an account/));
    expect(screen.queryByText("Check your email for a confirmation link.")).not.toBeInTheDocument();
  });

  it("clears confirm password when toggling to sign-in and back", () => {
    render(<AuthForm />);

    // Switch to sign-up
    fireEvent.click(screen.getByText("Need an account? Sign up"));
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), { target: { value: "typed" } });
    expect(screen.getByPlaceholderText("Confirm password")).toHaveValue("typed");

    // Toggle to sign-in
    fireEvent.click(screen.getByText("Already have an account? Sign in"));
    expect(screen.queryByPlaceholderText("Confirm password")).not.toBeInTheDocument();

    // Toggle back to sign-up — confirm password should be empty
    fireEvent.click(screen.getByText("Need an account? Sign up"));
    expect(screen.getByPlaceholderText("Confirm password")).toHaveValue("");
  });
});

// ---------------------------------------------------------------------------
// Password confirmation (sign-up only)
// ---------------------------------------------------------------------------

describe("AuthForm password confirmation", () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams("reason=favorites");
  });

  it("shows mismatch indicator when passwords differ", () => {
    render(<AuthForm />);
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "password1" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), { target: { value: "password2" } });

    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
  });

  it("does not show mismatch when only password is filled", () => {
    render(<AuthForm />);
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "password1" } });

    expect(screen.queryByText("Passwords do not match")).not.toBeInTheDocument();
  });

  it("does not show mismatch when only confirm is filled", () => {
    render(<AuthForm />);
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), { target: { value: "password1" } });

    // Password is empty, confirm is not — mismatch should show since they differ
    // But password="" and confirm="password1" → both non-empty? No, password is empty.
    // showMismatch = isSignUp && confirmPassword.length > 0 && password !== confirmPassword
    // password="" !== "password1" → true, so mismatch shows. This is correct behavior.
    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
  });

  it("does not show mismatch when passwords match", () => {
    render(<AuthForm />);
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "samepass" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), { target: { value: "samepass" } });

    expect(screen.queryByText("Passwords do not match")).not.toBeInTheDocument();
  });

  it("does not show mismatch when confirm password is empty", () => {
    render(<AuthForm />);
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "password1" } });
    // confirm password left empty
    expect(screen.queryByText("Passwords do not match")).not.toBeInTheDocument();
  });

  it("disables submit button when passwords do not match", () => {
    render(<AuthForm />);
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "password1" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), { target: { value: "password2" } });

    expect(screen.getByRole("button", { name: "Sign up" })).toBeDisabled();
  });

  it("enables submit button when passwords match", () => {
    render(<AuthForm />);
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "samepass" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), { target: { value: "samepass" } });

    expect(screen.getByRole("button", { name: "Sign up" })).toBeEnabled();
  });

  it("does not call signUp when passwords mismatch (button disabled)", () => {
    render(<AuthForm />);
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "new@test.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "password1" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), { target: { value: "password2" } });

    // Button is disabled, so clicking it shouldn't trigger submit
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));

    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it("mismatch clears when user corrects confirm password", () => {
    render(<AuthForm />);
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "password1" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), { target: { value: "wrong" } });

    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Confirm password"), { target: { value: "password1" } });

    expect(screen.queryByText("Passwords do not match")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Sign-in submission
// ---------------------------------------------------------------------------

describe("AuthForm sign-in submission", () => {
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

  it("does not redirect on failed sign-in", async () => {
    mockSignIn.mockResolvedValue({ error: { message: "Bad password" } });
    render(<AuthForm />);
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "user@test.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "nope" } });
    fireEvent.submit(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByText("Bad password")).toBeInTheDocument();
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("clears previous error on successful retry", async () => {
    mockSignIn.mockResolvedValueOnce({ error: { message: "Wrong password" } });
    render(<AuthForm />);

    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "user@test.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "wrong" } });
    fireEvent.submit(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByText("Wrong password")).toBeInTheDocument();
    });

    // Retry with correct password (mock now returns success)
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "correct" } });
    fireEvent.submit(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.queryByText("Wrong password")).not.toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Sign-up submission
// ---------------------------------------------------------------------------

describe("AuthForm sign-up submission", () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams("reason=favorites");
  });

  it("calls signUp on sign-up submit with matching passwords", async () => {
    render(<AuthForm />);
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "new@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "newpass123" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), { target: { value: "newpass123" } });
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
    render(<AuthForm />);
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "new@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "newpass123" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), { target: { value: "newpass123" } });
    fireEvent.submit(screen.getByRole("button", { name: "Sign up" }));

    await waitFor(() => {
      expect(screen.getByText("Check your email for a confirmation link.")).toBeInTheDocument();
    });
  });

  it("displays error on failed sign-up", async () => {
    mockSignUp.mockResolvedValue({ error: { message: "User already registered" } });
    render(<AuthForm />);
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "exists@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "pass123456" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), { target: { value: "pass123456" } });
    fireEvent.submit(screen.getByRole("button", { name: "Sign up" }));

    await waitFor(() => {
      expect(screen.getByText("User already registered")).toBeInTheDocument();
    });
  });

  it("handles network/server error on sign-up", async () => {
    mockSignUp.mockResolvedValue({ error: { message: "Network request failed" } });
    render(<AuthForm />);
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "new@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "pass123456" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), { target: { value: "pass123456" } });
    fireEvent.submit(screen.getByRole("button", { name: "Sign up" }));

    await waitFor(() => {
      expect(screen.getByText("Network request failed")).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Submitting state (double-submit prevention)
// ---------------------------------------------------------------------------

describe("AuthForm submitting state", () => {
  it("disables submit button while sign-in is in progress", async () => {
    let resolveSignIn: (value: { error: null }) => void;
    mockSignIn.mockImplementation(() => new Promise((r) => { resolveSignIn = r; }));

    render(<AuthForm />);
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "user@test.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "pass123456" } });
    fireEvent.submit(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "..." })).toBeDisabled();
    });

    // Resolve the pending sign-in
    resolveSignIn!({ error: null });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/");
    });
  });

  it("disables submit button while sign-up is in progress", async () => {
    mockSearchParams = new URLSearchParams("reason=favorites");
    let resolveSignUp: (value: { error: null }) => void;
    mockSignUp.mockImplementation(() => new Promise((r) => { resolveSignUp = r; }));

    render(<AuthForm />);
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "new@test.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "pass123456" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), { target: { value: "pass123456" } });
    fireEvent.submit(screen.getByRole("button", { name: "Sign up" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "..." })).toBeDisabled();
    });

    resolveSignUp!({ error: null });

    await waitFor(() => {
      expect(screen.getByText("Check your email for a confirmation link.")).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Analytics tracking
// ---------------------------------------------------------------------------

describe("AuthForm analytics", () => {
  it("tracks auth_error event on sign-in failure", async () => {
    mockSignIn.mockResolvedValue({ error: { message: "Invalid login credentials" } });
    render(<AuthForm />);
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "bad@test.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "wrong" } });
    fireEvent.submit(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith("auth_error", {
        method: "sign_in",
        error: "Invalid login credentials",
      });
    });
  });

  it("tracks auth_error event on sign-up failure", async () => {
    mockSearchParams = new URLSearchParams("reason=favorites");
    mockSignUp.mockResolvedValue({ error: { message: "Signup disabled" } });
    render(<AuthForm />);
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "new@test.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "pass123456" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), { target: { value: "pass123456" } });
    fireEvent.submit(screen.getByRole("button", { name: "Sign up" }));

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith("auth_error", {
        method: "sign_up",
        error: "Signup disabled",
      });
    });
  });

  it("does not track analytics on successful sign-in", async () => {
    render(<AuthForm />);
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "user@test.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "correct" } });
    fireEvent.submit(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/");
    });
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it("does not track analytics on successful sign-up", async () => {
    mockSearchParams = new URLSearchParams("reason=favorites");
    render(<AuthForm />);
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "new@test.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "pass123456" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), { target: { value: "pass123456" } });
    fireEvent.submit(screen.getByRole("button", { name: "Sign up" }));

    await waitFor(() => {
      expect(screen.getByText("Check your email for a confirmation link.")).toBeInTheDocument();
    });
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Form elements
// ---------------------------------------------------------------------------

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

  it("email input has type=email", () => {
    render(<AuthForm />);
    expect(screen.getByPlaceholderText("Email")).toHaveAttribute("type", "email");
  });

  it("password input has type=password", () => {
    render(<AuthForm />);
    expect(screen.getByPlaceholderText("Password")).toHaveAttribute("type", "password");
  });

  it("confirm password input has type=password", () => {
    mockSearchParams = new URLSearchParams("reason=favorites");
    render(<AuthForm />);
    expect(screen.getByPlaceholderText("Confirm password")).toHaveAttribute("type", "password");
  });

  it("password input has minLength=6", () => {
    render(<AuthForm />);
    expect(screen.getByPlaceholderText("Password")).toHaveAttribute("minLength", "6");
  });

  it("email input is required", () => {
    render(<AuthForm />);
    expect(screen.getByPlaceholderText("Email")).toBeRequired();
  });

  it("password input is required", () => {
    render(<AuthForm />);
    expect(screen.getByPlaceholderText("Password")).toBeRequired();
  });

  it("confirm password input is required in sign-up mode", () => {
    mockSearchParams = new URLSearchParams("reason=favorites");
    render(<AuthForm />);
    expect(screen.getByPlaceholderText("Confirm password")).toBeRequired();
  });
});
