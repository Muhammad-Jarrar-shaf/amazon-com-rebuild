import Link from "next/link";
import { SITE } from "@/lib/site";

// Our own text wordmark (no Amazon logo asset is used or imitated).
export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label={`${SITE.name}, home`}
      className={`nav-item flex min-h-[var(--tap)] min-w-0 items-center overflow-hidden px-1 text-[18px] font-bold tracking-tight whitespace-nowrap text-white md:px-2 md:text-xl lg:text-2xl ${className}`}
    >
      Amazon<span className="ml-1 text-cart-count">Rebuild</span>
    </Link>
  );
}
