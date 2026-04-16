"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { trackEvent } from "@/lib/analytics";

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const hasFiredOpen = useRef(false);
  const hasFiredAuthed = useRef(false);

  useEffect(() => {
    if (!hasFiredOpen.current) {
      hasFiredOpen.current = true;
      trackEvent("app_open");
    }
  }, []);

  useEffect(() => {
    if (user && !hasFiredAuthed.current) {
      hasFiredAuthed.current = true;
      trackEvent("app_open", {}, user.id);
    }
  }, [user]);

  return <>{children}</>;
}
