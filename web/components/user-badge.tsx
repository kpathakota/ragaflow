"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";

export function UserBadge() {
  const { user, loading } = useAuth();

  if (loading || !user) return null;

  const initial = (user.email?.[0] ?? "?").toUpperCase();

  return (
    <Link
      href="/profile"
      className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-800 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700 hover:text-white"
      title="Profile"
    >
      {initial}
    </Link>
  );
}
