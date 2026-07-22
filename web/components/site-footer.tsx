import Link from "next/link";

/** Footer with legal + support links, shared across marketing pages. */
export function SiteFooter() {
  return (
    <footer className="mt-20 w-full border-t border-[#E6DCCA]/10 pt-8 pb-4">
      <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-[#E6DCCA]/50">
        <Link href="/privacy" className="transition-colors hover:text-[#E6DCCA]/85">
          Privacy
        </Link>
        <Link href="/terms" className="transition-colors hover:text-[#E6DCCA]/85">
          Terms
        </Link>
        <Link href="/support" className="transition-colors hover:text-[#E6DCCA]/85">
          Support
        </Link>
      </nav>
      <p className="mt-6 text-center text-xs text-[#E6DCCA]/35">
        &copy; {new Date().getFullYear()}{" "}Ragaflow · Indian classical ragas
        for focus, sleep &amp; meditation
      </p>
    </footer>
  );
}
