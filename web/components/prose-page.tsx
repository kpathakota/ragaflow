import Link from "next/link";

type ProsePageProps = {
  title: string;
  /** Optional line under the title, e.g. "Last updated: …". */
  subtitle?: string;
  children: React.ReactNode;
};

/**
 * Shared layout for static text pages (privacy, support). Matches the app's
 * warm dark theme and serif brand lockup, constrained to the phone frame.
 */
export function ProsePage({ title, subtitle, children }: ProsePageProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0F0B07] px-5 pt-2 pb-16 flex flex-col items-center">
      <div className="relative w-full max-w-sm">
        <div className="pt-1">
          <Link
            href="/"
            className="text-sm text-[#E6DCCA]/55 transition-colors hover:text-[#E6DCCA]/85"
          >
            &larr; Back
          </Link>
        </div>

        <header className="pt-7 pb-8">
          <h1 className="font-serif text-[32px] font-medium leading-tight tracking-[-0.01em] text-[#E6DCCA]">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-sm text-[#E6DCCA]/50">{subtitle}</p>
          ) : null}
        </header>

        <div className="prose-legal space-y-6 text-[15px] leading-relaxed text-[#E6DCCA]/80">
          {children}
        </div>
      </div>
    </div>
  );
}

/** A titled section within a ProsePage. */
export function ProseSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="font-serif text-[19px] font-medium text-[#E6DCCA]">
        {heading}
      </h2>
      {children}
    </section>
  );
}
