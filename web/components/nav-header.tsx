import Link from "next/link";

type NavHeaderProps = {
  backHref: string;
  title: string;
  titleClass?: string;
};

export function NavHeader({ backHref, title, titleClass = "" }: NavHeaderProps) {
  return (
    <header className="mb-10 w-full max-w-sm">
      <Link
        href={backHref}
        className="text-sm text-stone-500 transition-colors hover:text-stone-300"
      >
        &larr; Back
      </Link>
      <h1
        className={`mt-4 text-3xl font-semibold tracking-tight ${titleClass}`}
      >
        {title}
      </h1>
    </header>
  );
}
