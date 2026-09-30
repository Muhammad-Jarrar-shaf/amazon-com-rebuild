"use client";

import { useRef, type ReactNode } from "react";
import { ChevronRightIcon, CloseIcon, PersonIcon } from "@/components/icons";
import { NavLink } from "@/components/ui/nav-link";
import { DEPARTMENTS, departmentHref } from "@/lib/departments";
import { NAV_DRAWER_ID, isAvailable } from "@/lib/nav";

const HELP_LINKS = [
  { label: "Your Account", href: "/account" },
  { label: "Your Orders", href: "/orders" },
  { label: "Customer Service", href: "/help" },
] as const;

function MenuRow({ href, label }: { href: string; label: string }) {
  return (
    <li className="border-b border-[#e7e7e7]">
      <NavLink href={href} className="flex min-h-[var(--tap)] items-center justify-between px-6 text-sm text-ink [a&]:hover:bg-page-gray">
        <span>{label}</span>
        {isAvailable(href) ? (
          <ChevronRightIcon className="size-4 text-[#767676]" />
        ) : (
          <span className="text-xs text-[#767676]">Soon</span>
        )}
      </NavLink>
    </li>
  );
}

function MenuSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="px-6 pt-4 pb-2 text-lg font-bold">{title}</h2>
      <ul>{children}</ul>
    </section>
  );
}

/** Slide-in menu (FR-NAV-2, FR-NAV-4). Native modal <dialog>: Esc, focus trap and focus restore are built in. */
export function NavDrawer() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const close = () => dialogRef.current?.close();

  return (
    <dialog
      id={NAV_DRAWER_ID}
      ref={dialogRef}
      aria-label="Main menu"
      className="nav-drawer"
      // The panel fills the dialog box, so only a click on the ::backdrop targets the dialog itself.
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="flex h-full flex-col">
        <div data-surface="dark" className="flex min-h-[60px] shrink-0 items-center justify-between bg-subnav pr-2 pl-6 text-white">
          <span className="flex items-center gap-2 text-lg font-bold">
            <PersonIcon className="size-7" />
            Hello, sign in
          </span>
          <button type="button" aria-label="Close menu" onClick={close} className="nav-item flex size-[var(--tap)] items-center justify-center">
            <CloseIcon className="size-6" />
          </button>
        </div>
        <nav
          aria-label="Menu"
          className="flex-1 overflow-y-auto pb-6"
          onClick={(event) => {
            if (event.target instanceof Element && event.target.closest("a")) close();
          }}
        >
          <ul>
            <MenuRow href="/" label="Home" />
          </ul>
          <MenuSection title="Shop by Department">
            {DEPARTMENTS.map((department) => (
              <MenuRow key={department.slug} href={departmentHref(department.slug)} label={department.label} />
            ))}
          </MenuSection>
          <MenuSection title="Help & Settings">
            {HELP_LINKS.map((link) => (
              <MenuRow key={link.label} href={link.href} label={link.label} />
            ))}
          </MenuSection>
        </nav>
      </div>
    </dialog>
  );
}
