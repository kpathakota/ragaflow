"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AuthForm() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);

    const sb = createClient()!;

    if (isSignUp) {
      const { error: err } = await sb.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (err) {
        setError(err.message);
      } else {
        setMessage("Check your email for a confirmation link.");
      }
    } else {
      const { error: err } = await sb.auth.signInWithPassword({
        email,
        password,
      });
      if (err) {
        setError(err.message);
      } else {
        router.replace("/");
      }
    }

    setSubmitting(false);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <header className="mb-10 w-full max-w-sm">
        <Link
          href="/"
          className="text-sm text-stone-500 transition-colors hover:text-stone-300"
        >
          &larr; Back
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          {isSignUp ? "Create account" : "Sign in"}
        </h1>
      </header>

      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="rounded-lg border border-stone-700 bg-stone-900 px-4 py-3 text-sm text-stone-100 placeholder:text-stone-500 focus:border-stone-500 focus:outline-none"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="rounded-lg border border-stone-700 bg-stone-900 px-4 py-3 text-sm text-stone-100 placeholder:text-stone-500 focus:border-stone-500 focus:outline-none"
        />

        {error && <p className="text-sm text-red-400">{error}</p>}
        {message && <p className="text-sm text-[#9CAF88]">{message}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-stone-100 px-4 py-3 text-sm font-medium text-stone-900 transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting
            ? "..."
            : isSignUp
              ? "Sign up"
              : "Sign in"}
        </button>

        <button
          type="button"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError(null);
            setMessage(null);
          }}
          className="text-sm text-stone-400 transition-colors hover:text-stone-200"
        >
          {isSignUp
            ? "Already have an account? Sign in"
            : "Need an account? Sign up"}
        </button>
      </form>
    </div>
  );
}
