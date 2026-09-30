"use client";

import type { ReactNode } from "react";
import { NAV_DRAWER_ID } from "@/lib/nav";

/**
 * Opens the shared menu drawer. Two triggers exist (desktop "All", mobile hamburger); the drawer is a native
 * modal <dialog>, so the browser handles the focus trap, Esc, inert background and returning focus to
 * whichever trigger opened it.
 */
export function MenuButton({ className = "", label, children }: { className?: string; label?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-controls={NAV_DRAWER_ID}
      aria-label={label}
      className={className}
      onClick={() => {
        const drawer = document.getElementById(NAV_DRAWER_ID);
        if (drawer instanceof HTMLDialogElement && !drawer.open) drawer.showModal();
      }}
    >
      {children}
    </button>
  );
}
