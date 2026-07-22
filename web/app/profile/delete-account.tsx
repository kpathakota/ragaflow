"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type DeleteError = "subscription" | "generic" | null;

export function DeleteAccountSection() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<DeleteError>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);

  // Keyboard/screen-reader focus management: revealing the panel unmounts the
  // trigger button, so move focus onto the panel (which carries the warning);
  // canceling restores focus to the trigger.
  useEffect(() => {
    if (confirming) {
      panelRef.current?.focus();
    } else if (wasConfirming.current) {
      triggerRef.current?.focus();
    }
    wasConfirming.current = confirming;
  }, [confirming]);

  async function handleDelete() {
    const supabase = createClient();
    if (!supabase) {
      setError("generic");
      return;
    }
    setDeleting(true);
    setError(null);

    try {
      const { error: invokeError } = await supabase.functions.invoke(
        "delete-account",
        { method: "POST" }
      );

      if (invokeError) {
        const status = (invokeError as { context?: { status?: number } })
          .context?.status;
        setError(status === 409 ? "subscription" : "generic");
        setDeleting(false);
        return;
      }
    } catch {
      // invoke resolves { error } for HTTP/network failures, but never let a
      // thrown error strand the panel on a disabled "Deleting…"
      setError("generic");
      setDeleting(false);
      return;
    }

    // Deletion succeeded. The server session is already gone — a global
    // sign-out would fail because the user no longer exists. Local scope
    // clears this browser. signOut resolves { error } rather than throwing,
    // and on failure the local session may NOT have been removed — so a soft
    // client-side navigation would leave the UI looking signed in on a dead
    // account. Hard-navigate in that case to force a full reload and session
    // re-evaluation (getUser() fails → signed-out state everywhere).
    let signOutOk = false;
    try {
      const { error: signOutError } = await supabase.auth.signOut({
        scope: "local",
      });
      signOutOk = !signOutError;
    } catch {
      // treat as sign-out failure — account is deleted either way
    }

    if (signOutOk) {
      router.push("/");
    } else {
      window.location.assign("/");
    }
  }

  if (!confirming) {
    return (
      <button
        ref={triggerRef}
        onClick={() => setConfirming(true)}
        className="rounded-xl border border-red-500/40 bg-stone-900/60 px-5 py-3 text-sm text-red-400 transition-colors hover:border-red-500/70 hover:text-red-300"
      >
        Delete account
      </button>
    );
  }

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      role="group"
      aria-labelledby="delete-account-heading"
      className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 outline-none focus-visible:ring-1 focus-visible:ring-red-500/50"
    >
      <p id="delete-account-heading" className="text-sm font-medium text-red-400">
        Delete your account?
      </p>
      <p className="mt-2 text-xs text-stone-400">
        This permanently deletes your account and all of your data — favorites,
        listening history, certifications, and default tracks. This cannot be
        undone.
      </p>

      {error === "subscription" && (
        <p role="alert" className="mt-3 text-xs text-red-400">
          You have an active subscription. Please cancel it first, then delete
          your account.{" "}
          <a
            href="/api/portal"
            className="underline underline-offset-2 hover:text-red-300"
          >
            Manage subscription
          </a>
        </p>
      )}
      {error === "generic" && (
        <p role="alert" className="mt-3 text-xs text-red-400">
          Something went wrong. Please try again, or email{" "}
          <a
            href="mailto:support@ragaflow.io"
            className="underline underline-offset-2 hover:text-red-300"
          >
            support@ragaflow.io
          </a>
          .
        </p>
      )}

      <div className="mt-4 flex gap-3">
        <button
          onClick={() => {
            setConfirming(false);
            setError(null);
          }}
          disabled={deleting}
          className="flex-1 rounded-lg bg-stone-200 px-4 py-2 text-xs font-medium text-stone-900 transition-colors hover:bg-white disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex-1 rounded-lg border border-red-500/60 px-4 py-2 text-xs font-medium text-red-400 transition-colors hover:border-red-500 hover:text-red-300 disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Permanently delete"}
        </button>
      </div>
    </div>
  );
}
