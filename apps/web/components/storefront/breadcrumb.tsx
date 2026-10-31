import Link from "next/link";
import { Fragment } from "react";
import type { Crumb } from "@/lib/api/types";

/** Visible breadcrumb for a full trail (home ... current page); the last crumb is the current page. */
export function Breadcrumb({ trail }: { trail: Crumb[] }) {
  const current = trail[trail.length - 1];
  return (
    <nav className="bc" aria-label="Breadcrumb">
      {trail.slice(0, -1).map((crumb, index) => (
        <Fragment key={`${index}-${crumb.href}`}>
          <Link href={crumb.href}>{crumb.name}</Link>
          <i className="i i-right" aria-hidden="true" />
        </Fragment>
      ))}
      {current && <b aria-current="page">{current.name}</b>}
    </nav>
  );
}
