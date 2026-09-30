import { ChevronRightIcon } from "@/components/icons";
import { NavLink } from "@/components/ui/nav-link";

export function Breadcrumb({ items }: { items: { label: string; href: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-1">
            {index > 0 && <ChevronRightIcon className="size-3" />}
            <NavLink href={item.href} className="[a&]:hover:text-price-sale [a&]:hover:underline">
              {item.label}
            </NavLink>
          </li>
        ))}
      </ol>
    </nav>
  );
}
