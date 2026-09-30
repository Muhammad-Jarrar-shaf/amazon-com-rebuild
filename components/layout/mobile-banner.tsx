"use client";

import { useState } from "react";
import { CloseIcon } from "@/components/icons";
import { SITE } from "@/lib/site";

/**
 * Mobile-only info strip. amazon.com shows an "install our app" strip here; this build has no app, so the
 * strip carries the project disclaimer instead and its dismiss button really dismisses it (docs/ux-spec.md).
 */
export function MobileBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div data-shell="banner-strip" className="flex items-center gap-3 bg-banner py-1 pr-1 pl-3 text-ink md:hidden">
      <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-md bg-nav text-lg font-bold text-cart-count">
        A
      </span>
      <p className="min-w-0 flex-1 leading-tight">
        <span className="block text-base font-bold">{SITE.name}</span>
        <span className="block text-sm">An assignment project. Not affiliated with Amazon.</span>
      </p>
      <button
        type="button"
        aria-label="Dismiss banner"
        onClick={() => setDismissed(true)}
        className="flex size-[var(--tap)] shrink-0 items-center justify-center rounded-md hover:bg-black/10"
      >
        <CloseIcon className="size-5" />
      </button>
    </div>
  );
}
