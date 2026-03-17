import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthForm } from "./auth-form";

export default async function AuthPage() {
  const supabase = await createClient();

  if (!supabase) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <p className="text-neutral-400">
          Auth is not configured. Set Supabase environment variables to enable sign-in.
        </p>
      </div>
    );
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  return <AuthForm />;
}
