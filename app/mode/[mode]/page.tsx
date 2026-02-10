import Link from "next/link";
import { notFound } from "next/navigation";
import ragamsData from "@/content/ragams.json";

const modeConfig: Record<string, { label: string; accent: string }> = {
  focus: { label: "Focus", accent: "text-blue-400" },
  sleep: { label: "Sleep", accent: "text-indigo-400" },
  meditate: { label: "Meditate", accent: "text-amber-400" },
};

const validModes = Object.keys(modeConfig);

export function generateStaticParams() {
  return validModes.map((mode) => ({ mode }));
}

export default async function ModePage({
  params,
}: {
  params: Promise<{ mode: string }>;
}) {
  const { mode } = await params;

  if (!validModes.includes(mode)) {
    notFound();
  }

  const config = modeConfig[mode];
  const ragams = ragamsData.ragams.filter((r) => r.mode === mode);

  return (
    <div className="flex min-h-screen flex-col items-center px-6 py-16">
      <header className="mb-10 w-full max-w-sm">
        <Link
          href="/"
          className="text-sm text-neutral-500 transition-colors hover:text-neutral-300"
        >
          &larr; Back
        </Link>
        <h1 className={`mt-4 text-3xl font-semibold tracking-tight ${config.accent}`}>
          {config.label}
        </h1>
      </header>

      <main className="flex w-full max-w-sm flex-col gap-3">
        {ragams.map((ragam) => (
          <Link
            key={ragam.id}
            href={`/mode/${mode}/${ragam.id}`}
            className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-5 py-4 transition-colors hover:border-neutral-600 hover:bg-neutral-800/60"
          >
            <h2 className="text-lg font-medium">{ragam.name}</h2>
            <p className="mt-1 text-sm text-neutral-400">
              {ragam.description}
            </p>
          </Link>
        ))}
      </main>
    </div>
  );
}
