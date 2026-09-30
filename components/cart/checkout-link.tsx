import { NavLink } from "@/components/ui/nav-link";
import { isAvailable } from "@/lib/nav";

export const CHECKOUT_HREF = "/checkout";

/**
 * "Proceed to checkout" entry point. The checkout itself is built in the next slice, so until "/checkout" is in
 * AVAILABLE_ROUTES this renders as an intentionally unavailable link and says so, instead of leading to a 404.
 */
export function CheckoutLink({ count, className = "" }: { count: number; className?: string }) {
  const ready = isAvailable(CHECKOUT_HREF);
  return (
    <div className={className}>
      <NavLink
        href={CHECKOUT_HREF}
        data-shell="proceed-to-checkout"
        className="flex min-h-[var(--tap)] w-full items-center justify-center rounded-full bg-cta px-4 py-2.5 text-center text-sm text-ink hover:bg-cta-hover aria-disabled:opacity-60"
      >
        Proceed to checkout ({count} {count === 1 ? "item" : "items"})
      </NavLink>
      {!ready && <p className="mt-2 text-xs text-muted">Checkout is not available in this build yet.</p>}
    </div>
  );
}
