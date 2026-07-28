import Link from "next/link";

type ProsePageProps = {
  title: string;
  /** Optional line under the title, e.g. "Last updated: …". */
  subtitle?: string;
  children: React.ReactNode;
};

/**
 * Shared layout for static text pages (privacy, terms, support). Matches the
 * app's warm dark theme and serif brand lockup. Not boxed into the phone frame
 * — these are public pages reached from search results and the App Store
 * listing, so they widen to a comfortable reading measure on desktop.
 */
export function ProsePage({ title, subtitle, children }: ProsePageProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0F0B07] px-5 pt-2 pb-16 sm:px-8 sm:pb-24 flex flex-col items-center">
      {/* ~78 characters per line at 16px — max-w-2xl measured ~90, too wide. */}
      <div className="relative w-full max-w-sm sm:max-w-xl">
        <div className="pt-1 sm:pt-4">
          <Link
            href="/"
            className="text-sm text-[#E6DCCA]/55 transition-colors hover:text-[#E6DCCA]/85"
          >
            &larr; Back
          </Link>
        </div>

        <header className="pt-7 pb-8 sm:pt-10 sm:pb-10">
          <h1 className="font-serif text-[32px] font-medium leading-tight tracking-[-0.01em] text-[#E6DCCA] sm:text-[42px]">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-sm text-[#E6DCCA]/50">{subtitle}</p>
          ) : null}
        </header>

        <div className="prose-legal space-y-6 text-[15px] leading-relaxed text-[#E6DCCA]/80 sm:text-base sm:leading-[1.75]">
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
