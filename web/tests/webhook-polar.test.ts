import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// --- Mocks ---

// vi.hoisted runs before vi.mock hoisting, so these are available in mock factories
const { webhookConfig, mockRpc } = vi.hoisted(() => ({
  webhookConfig: {} as Record<string, Function>,
  mockRpc: vi.fn(),
}));

vi.mock("@polar-sh/nextjs", () => ({
  Webhooks: (config: Record<string, Function>) => {
    Object.assign(webhookConfig, config);
    return vi.fn();
  },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";
const mockCreateAdminClient = vi.mocked(createAdminClient);

// Force module load so Webhooks() captures config
import "@/app/api/webhooks/polar/route";

// --- Helpers ---

function subscriptionPayload(
  externalId: string | null | undefined,
  customerId: string
) {
  return {
    data: {
      customer: { externalId },
      customerId,
    },
  };
}

function orderPayload(
  externalId: string | null | undefined,
  customerId: string,
  billingReason: string
) {
  return {
    data: {
      customer: { externalId },
      customerId,
      billingReason,
    },
  };
}

// --- Tests ---

beforeEach(() => {
  vi.clearAllMocks();
  mockRpc.mockResolvedValue({ error: null });
  mockCreateAdminClient.mockReturnValue({ rpc: mockRpc } as any);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("webhook: updateRasika via event handlers", () => {
  describe("onSubscriptionActive", () => {
    it("sets subscription_status to 'active'", async () => {
      await webhookConfig.onSubscriptionActive(
        subscriptionPayload("user-1", "polar-cust-1")
      );
      expect(mockRpc).toHaveBeenCalledWith("update_rasika_subscription", {
        p_rasika_id: "user-1",
        p_polar_customer_id: "polar-cust-1",
        p_subscription_status: "active",
      });
    });
  });

  describe("onSubscriptionCanceled", () => {
    it("sets subscription_status to 'canceled'", async () => {
      await webhookConfig.onSubscriptionCanceled(
        subscriptionPayload("user-2", "polar-cust-2")
      );
      expect(mockRpc).toHaveBeenCalledWith("update_rasika_subscription", {
        p_rasika_id: "user-2",
        p_polar_customer_id: "polar-cust-2",
        p_subscription_status: "canceled",
      });
    });
  });

  describe("onSubscriptionRevoked", () => {
    it("sets subscription_status to 'expired'", async () => {
      await webhookConfig.onSubscriptionRevoked(
        subscriptionPayload("user-3", "polar-cust-3")
      );
      expect(mockRpc).toHaveBeenCalledWith("update_rasika_subscription", {
        p_rasika_id: "user-3",
        p_polar_customer_id: "polar-cust-3",
        p_subscription_status: "expired",
      });
    });
  });

  describe("onOrderCreated", () => {
    it("sets subscription_status to 'lifetime' for one-time purchases", async () => {
      await webhookConfig.onOrderCreated(
        orderPayload("user-4", "polar-cust-4", "purchase")
      );
      expect(mockRpc).toHaveBeenCalledWith("update_rasika_subscription", {
        p_rasika_id: "user-4",
        p_polar_customer_id: "polar-cust-4",
        p_subscription_status: "lifetime",
      });
    });

    it("skips non-purchase orders (e.g. renewal)", async () => {
      await webhookConfig.onOrderCreated(
        orderPayload("user-5", "polar-cust-5", "renewal")
      );
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it("skips subscription_creation billing reason", async () => {
      await webhookConfig.onOrderCreated(
        orderPayload("user-6", "polar-cust-6", "subscription_creation")
      );
      expect(mockRpc).not.toHaveBeenCalled();
    });
  });

  describe("onPayload (catch-all)", () => {
    it("handles subscription.past_due events", async () => {
      const payload = {
        type: "subscription.past_due",
        ...subscriptionPayload("user-7", "polar-cust-7"),
      };
      await webhookConfig.onPayload(payload);
      expect(mockRpc).toHaveBeenCalledWith("update_rasika_subscription", {
        p_rasika_id: "user-7",
        p_polar_customer_id: "polar-cust-7",
        p_subscription_status: "past_due",
      });
    });

    it("ignores unknown event types", async () => {
      const payload = {
        type: "checkout.completed",
        data: { customer: { externalId: "user-8" }, customerId: "pc-8" },
      };
      await webhookConfig.onPayload(payload);
      expect(mockRpc).not.toHaveBeenCalled();
    });
  });
});

describe("webhook: updateRasika edge cases", () => {
  it("skips update when externalId is null", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await webhookConfig.onSubscriptionActive(
      subscriptionPayload(null, "polar-cust-x")
    );
    expect(mockRpc).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("Missing externalId")
    );
  });

  it("skips update when externalId is undefined", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await webhookConfig.onSubscriptionActive(
      subscriptionPayload(undefined, "polar-cust-y")
    );
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("skips update when admin client is unavailable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockCreateAdminClient.mockReturnValue(null);
    await webhookConfig.onSubscriptionActive(
      subscriptionPayload("user-9", "polar-cust-9")
    );
    expect(mockRpc).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("Admin Supabase client unavailable")
    );
  });

  it("throws when Supabase RPC fails (so Polar retries)", async () => {
    mockRpc.mockResolvedValue({
      error: { message: "rasika not found" },
    });
    await expect(
      webhookConfig.onSubscriptionActive(
        subscriptionPayload("user-10", "polar-cust-10")
      )
    ).rejects.toThrow("rasika not found");
  });

  it("is idempotent — same event twice produces same RPC calls", async () => {
    const payload = subscriptionPayload("user-11", "polar-cust-11");
    await webhookConfig.onSubscriptionActive(payload);
    await webhookConfig.onSubscriptionActive(payload);
    expect(mockRpc).toHaveBeenCalledTimes(2);
    expect(mockRpc.mock.calls[0]).toEqual(mockRpc.mock.calls[1]);
  });
});
