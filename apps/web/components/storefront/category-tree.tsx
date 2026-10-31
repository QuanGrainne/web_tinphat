import Link from "next/link";
import type { NavCategory } from "@/lib/api/types";

/** "Danh mục" block of the desktop filter column: level-1 categories, children of the active branch nested. */
export function CategoryTree({ categories, activeSlug }: { categories: NavCategory[]; activeSlug: string }) {
  return (
    <div className="blk cats-blk">
      <span className="blk-t">Danh mục</span>
      <nav className="cats" aria-label="Danh mục">
        {categories.map((category) => {
          const inBranch = category.slug === activeSlug || category.children.some((child) => child.slug === activeSlug);
          return (
            <div key={category.id}>
              <Link
                href={`/danh-muc/${category.slug}`}
                prefetch={false}
                className={category.slug === activeSlug ? "on" : undefined}
                aria-current={category.slug === activeSlug ? "page" : undefined}
              >
                {category.name}
                <small>{category.productCount}</small>
              </Link>
              {inBranch &&
                category.children.map((child) => (
                  <Link
                    key={child.id}
                    href={`/danh-muc/${child.slug}`}
                    prefetch={false}
                    className={`sub${child.slug === activeSlug ? " on" : ""}`}
                    aria-current={child.slug === activeSlug ? "page" : undefined}
                  >
                    {child.name}
                    <small>{child.productCount}</small>
                  </Link>
                ))}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
