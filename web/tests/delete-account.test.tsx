import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DeleteAccountSection } from "@/app/profile/delete-account";

const mockInvoke = vi.fn();
const mockSignOut = vi.fn(); // defaults set in beforeEach

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    functions: { invoke: mockInvoke },
    auth: { signOut: mockSignOut },
  })),
}));

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
}));

// jsdom doesn't implement navigation — replace location with a mock so the
// hard-navigation fallback is observable.
const mockLocationAssign = vi.fn();
const originalLocation = window.location;

beforeAll(() => {
  Object.defineProperty(window, "location", {
    value: { ...originalLocation, assign: mockLocationAssign },
    writable: true,
  });
});

afterAll(() => {
  Object.defineProperty(window, "location", {
    value: originalLocation,
    writable: true,
  });
});

beforeEach(() => {
  vi.clearAllMocks();
  mockInvoke.mockResolvedValue({ data: { success: true }, error: null });
  mockSignOut.mockResolvedValue({ error: null });
});

// ---------------------------------------------------------------------------
// Reveal / cancel
// ---------------------------------------------------------------------------

describe("DeleteAccountSection reveal and cancel", () => {
  it("initially shows only the Delete account button — no warning panel", () => {
    render(<DeleteAccountSection />);
    expect(
      screen.getByRole("button", { name: "Delete account" })
    ).toBeInTheDocument();
    expect(screen.queryByText("Delete your account?")).not.toBeInTheDocument();
  });

  it("tapping Delete account reveals the warning panel without deleting", () => {
    render(<DeleteAccountSection />);
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));

    expect(screen.getByText("Delete your account?")).toBeInTheDocument();
    expect(
      screen.getByText(/favorites,\s*listening history,\s*certifications,\s*and default tracks/)
    ).toBeInTheDocument();
    expect(screen.getByText(/cannot be\s*undone/)).toBeInTheDocument();
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("Cancel dismisses the panel and returns to the button", () => {
    render(<DeleteAccountSection />);
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByText("Delete your account?")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete account" })
    ).toBeInTheDocument();
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("moves keyboard focus to the panel on reveal and back to the trigger on cancel", async () => {
    render(<DeleteAccountSection />);
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));

    const panel = screen.getByRole("group", { name: "Delete your account?" });
    await waitFor(() => {
      expect(panel).toHaveFocus();
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Delete account" })
      ).toHaveFocus();
    });
  });
});

// ---------------------------------------------------------------------------
// Confirm — success path
// ---------------------------------------------------------------------------

describe("DeleteAccountSection confirm", () => {
  it("invokes the edge function, signs out locally, and redirects to /", async () => {
    render(<DeleteAccountSection />);
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    fireEvent.click(screen.getByRole("button", { name: "Permanently delete" }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("delete-account", {
        method: "POST",
      });
      expect(mockSignOut).toHaveBeenCalledWith({ scope: "local" });
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });

  it("shows Deleting… and disables both buttons while in flight", async () => {
    let resolveInvoke: (v: { data: unknown; error: null }) => void;
    mockInvoke.mockReturnValue(
      new Promise((resolve) => {
        resolveInvoke = resolve;
      })
    );

    render(<DeleteAccountSection />);
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    fireEvent.click(screen.getByRole("button", { name: "Permanently delete" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Deleting…" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    });

    resolveInvoke!({ data: { success: true }, error: null });
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/"));
  });
});

// ---------------------------------------------------------------------------
// Error paths — account left intact
// ---------------------------------------------------------------------------

describe("DeleteAccountSection errors", () => {
  it("409 shows the active-subscription message with a portal link", async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { name: "FunctionsHttpError", context: { status: 409 } },
    });

    render(<DeleteAccountSection />);
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    fireEvent.click(screen.getByRole("button", { name: "Permanently delete" }));

    await waitFor(() => {
      expect(
        screen.getByText(/You have an active subscription/)
      ).toBeInTheDocument();
    });
    const portalLink = screen.getByRole("link", { name: "Manage subscription" });
    expect(portalLink).toHaveAttribute("href", "/api/portal");

    // No sign-out, no redirect — the account is intact
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
    // Panel is interactive again for retry
    expect(
      screen.getByRole("button", { name: "Permanently delete" })
    ).toBeEnabled();
  });

  it("generic error shows the fallback message with support email", async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { name: "FunctionsHttpError", context: { status: 500 } },
    });

    render(<DeleteAccountSection />);
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    fireEvent.click(screen.getByRole("button", { name: "Permanently delete" }));

    await waitFor(() => {
      expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
    });
    expect(
      screen.getByRole("link", { name: "support@ragaflow.io" })
    ).toHaveAttribute("href", "mailto:support@ragaflow.io");
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("network-level error (no context) is treated as generic", async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { name: "FunctionsFetchError" },
    });

    render(<DeleteAccountSection />);
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    fireEvent.click(screen.getByRole("button", { name: "Permanently delete" }));

    await waitFor(() => {
      expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
    });
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it("error clears when retrying and succeeds on second attempt", async () => {
    mockInvoke.mockResolvedValueOnce({
      data: null,
      error: { name: "FunctionsHttpError", context: { status: 500 } },
    });

    render(<DeleteAccountSection />);
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    fireEvent.click(screen.getByRole("button", { name: "Permanently delete" }));

    await waitFor(() => {
      expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
    });

    // Hold the second invoke pending to prove the error clears on submit,
    // not as a side effect of success
    let resolveInvoke: (v: { data: unknown; error: null }) => void;
    mockInvoke.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveInvoke = resolve;
      })
    );
    fireEvent.click(screen.getByRole("button", { name: "Permanently delete" }));

    await waitFor(() => {
      expect(screen.queryByText(/Something went wrong/)).not.toBeInTheDocument();
    });

    resolveInvoke!({ data: { success: true }, error: null });
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledWith({ scope: "local" });
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });

  it("thrown invoke error shows generic message instead of stranding the panel", async () => {
    mockInvoke.mockRejectedValue(new Error("network down"));

    render(<DeleteAccountSection />);
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    fireEvent.click(screen.getByRole("button", { name: "Permanently delete" }));

    await waitFor(() => {
      expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: "Permanently delete" })
    ).toBeEnabled();
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("hard-navigates when sign-out resolves with an error — session may be stale", async () => {
    // supabase-js signOut resolves { error } rather than throwing; on failure
    // the local session may not have been removed, so the component must force
    // a full reload instead of a soft client-side navigation.
    mockSignOut.mockResolvedValue({
      error: { name: "AuthRetryableFetchError", message: "fetch failed" },
    });

    render(<DeleteAccountSection />);
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    fireEvent.click(screen.getByRole("button", { name: "Permanently delete" }));

    await waitFor(() => {
      expect(mockLocationAssign).toHaveBeenCalledWith("/");
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("hard-navigates when sign-out throws — the account is already deleted", async () => {
    mockSignOut.mockRejectedValue(new Error("session missing"));

    render(<DeleteAccountSection />);
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    fireEvent.click(screen.getByRole("button", { name: "Permanently delete" }));

    await waitFor(() => {
      expect(mockLocationAssign).toHaveBeenCalledWith("/");
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("Cancel after an error resets the panel and the error", async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { name: "FunctionsHttpError", context: { status: 409 } },
    });

    render(<DeleteAccountSection />);
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    fireEvent.click(screen.getByRole("button", { name: "Permanently delete" }));
    await waitFor(() => {
      expect(
        screen.getByText(/You have an active subscription/)
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText("Delete your account?")).not.toBeInTheDocument();

    // Re-opening starts clean
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    expect(
      screen.queryByText(/You have an active subscription/)
    ).not.toBeInTheDocument();
  });

  it("announces errors via role=alert for screen readers", async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { name: "FunctionsHttpError", context: { status: 409 } },
    });

    render(<DeleteAccountSection />);
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    fireEvent.click(screen.getByRole("button", { name: "Permanently delete" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        /You have an active subscription/
      );
    });
  });

  it("missing supabase client shows generic error without invoking", async () => {
    const { createClient } = await import("@/lib/supabase/client");
    vi.mocked(createClient).mockReturnValueOnce(
      null as unknown as ReturnType<typeof createClient>
    );

    render(<DeleteAccountSection />);
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    fireEvent.click(screen.getByRole("button", { name: "Permanently delete" }));

    await waitFor(() => {
      expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
    });
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});
