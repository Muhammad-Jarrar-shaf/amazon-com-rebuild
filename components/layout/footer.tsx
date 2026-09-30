import { GlobeIcon } from "@/components/icons";
import { Logo } from "@/components/layout/logo";
import { NavLink } from "@/components/ui/nav-link";
import { DEPARTMENTS, departmentHref } from "@/lib/departments";
import { PAGE_TOP_ID } from "@/lib/nav";

const FOOTER_COLUMNS = [
  {
    title: "Shop",
    links: DEPARTMENTS.map((department) => ({ label: department.label, href: departmentHref(department.slug) })),
  },
  {
    title: "Let Us Help You",
    links: [
      { label: "Your Account", href: "/account" },
      { label: "Your Orders", href: "/orders" },
      { label: "Shipping & Delivery", href: "/shipping" },
      { label: "Returns & Replacements", href: "/returns" },
      { label: "Help", href: "/help" },
    ],
  },
  {
    title: "Get to Know Us",
    links: [
      { label: "About this project", href: "/about" },
      { label: "Conditions of Use", href: "/terms" },
      { label: "Privacy Notice", href: "/privacy" },
    ],
  },
];

/** Footer (FR-NAV-3): back-to-top bar, grouped links, lower strip. Links to unbuilt routes are inert (NavLink). */
export function Footer() {
  return (
    <footer data-shell="footer" data-surface="dark">
      <a href={`#${PAGE_TOP_ID}`} className="block bg-strip py-[15px] text-center text-[13px] text-white hover:bg-strip-hover">
        Back to top
      </a>
      <nav aria-label="Footer" className="bg-subnav text-footer-link">
        <div className="mx-auto grid max-w-[1000px] gap-8 px-6 py-10 sm:grid-cols-2 lg:grid-cols-4">
          {FOOTER_COLUMNS.map((column) => (
            <section key={column.title}>
              <h2 className="mb-2 text-base font-bold text-white">{column.title}</h2>
              <ul className="space-y-1">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <NavLink href={link.href} className="inline-block py-0.5 text-sm [a&]:hover:underline">
                      {link.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <section>
            <h2 className="mb-2 text-base font-bold text-white">About this build</h2>
            <p className="text-sm">A rebuild of the amazon.com shopping experience for an engineering assignment.</p>
          </section>
        </div>
      </nav>
      <div className="bg-footer-deep px-6 py-6 text-center text-footer-link">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <Logo />
          <span className="flex items-center gap-1 text-sm">
            <GlobeIcon className="size-4" />
            English
          </span>
          <span className="text-sm">United States</span>
        </div>
        <p className="mt-3 text-xs">An assignment project. Not affiliated with or endorsed by Amazon.</p>
      </div>
    </footer>
  );
}
