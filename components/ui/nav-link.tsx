import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import { UNAVAILABLE_HINT, isAvailable } from "@/lib/nav";

type NavLinkProps = Omit<ComponentPropsWithoutRef<"a">, "href"> & { href: string };

/**
 * A link to a destination that may not be built yet. Built routes render a real link; the rest render
 * as an intentionally unavailable link (a disabled `role="link"`, not focusable, no hover affordance, with
 * a tooltip) so the shell never sends anyone to a 404. The gate is `isAvailable` in lib/nav.ts.
 */
export function NavLink({ href, className = "", children, ...rest }: NavLinkProps) {
  if (isAvailable(href)) {
    return (
      <Link href={href} prefetch={href.startsWith("/s") ? false : undefined} className={className} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <span role="link" aria-disabled="true" title={UNAVAILABLE_HINT} className={`cursor-default ${className}`} {...rest}>
      {children}
    </span>
  );
}
