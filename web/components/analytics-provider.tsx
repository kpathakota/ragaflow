"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { trackEvent } from "@/lib/analytics";

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  useEffect(() => {
    trackEvent("app_open", {}, user?.id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- fire once on mount

  return <>{children}</>;
}
