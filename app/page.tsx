import Link from "next/link";

const modes = [
  {
    key: "focus",
    label: "Focus",
    subtitle: "Sharpen your mind with ragas for deep work",
    accent: "border-blue-500/40 hover:border-blue-400/60",
    accentText: "text-blue-400",
  },
  {
    key: "sleep",
    label: "Sleep",
    subtitle: "Drift into rest with soothing evening ragas",
    accent: "border-indigo-500/40 hover:border-indigo-400/60",
    accentText: "text-indigo-400",
  },
  {
    key: "meditate",
    label: "Meditate",
    subtitle: "Find stillness with ragas for contemplation",
    accent: "border-amber-500/40 hover:border-amber-400/60",
    accentText: "text-amber-400",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Ragaflow</h1>
        <p className="mt-3 text-lg text-neutral-400">
          Indian classical ragas for focus, sleep &amp; meditation
        </p>
      </header>

      <main className="flex w-full max-w-sm flex-col gap-4">
        {modes.map((mode) => (
          <Link
            key={mode.key}
            href={`/mode/${mode.key}`}
            className={`block rounded-xl border ${mode.accent} bg-neutral-900/60 px-6 py-5 transition-colors`}
          >
            <h2 className={`text-xl font-medium ${mode.accentText}`}>
              {mode.label}
            </h2>
            <p className="mt-1 text-sm text-neutral-400">{mode.subtitle}</p>
          </Link>
        ))}
      </main>
    </div>
  );
}
