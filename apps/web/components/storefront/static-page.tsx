import Link from "next/link";
import type { ReactNode } from "react";
import "@/app/(storefront)/sales.css";
import type { CompanyInfo } from "@/lib/api/types";
import { formatPhone, telHref } from "@/lib/order/phone";

export interface Crumb {
  name: string;
  href?: string;
}

/** Page wrapper used by every page in this slice: main landmark + breadcrumb. */
export function PageFrame({
  crumbs,
  children,
}: {
  crumbs: Crumb[];
  children: ReactNode;
}) {
  return (
    <main className="wrap">
      <nav className="bc" aria-label="Breadcrumb">
        <Link href="/">Trang chủ</Link>
        {crumbs.map((c) => (
          <span key={c.name} style={{ display: "contents" }}>
            <i className="i i-right" aria-hidden="true" />
            {c.href ? <Link href={c.href}>{c.name}</Link> : <b>{c.name}</b>}
          </span>
        ))}
      </nav>
      {children}
    </main>
  );
}

/** Text page: h1 plus content blocks. */
export function StaticPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="spage">
      <h1>{title}</h1>
      {children}
    </div>
  );
}

export function InfoSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-t` : undefined}>
      <h2 id={id ? `${id}-t` : undefined}>{title}</h2>
      {children}
    </section>
  );
}

export function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="bul">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

/** Label/value list in the style of the order page. */
export function FactList({
  rows,
}: {
  rows: { label: string; value: ReactNode }[];
}) {
  return (
    <dl className="kv">
      {rows.map((r) => (
        <div key={r.label} style={{ display: "contents" }}>
          <dt>{r.label}</dt>
          <dd>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Legal and contact facts of the company, exactly as stored in the public settings. */
export function CompanyFacts({
  company,
  hotline,
}: {
  company: CompanyInfo;
  hotline: string;
}) {
  const phone = company.phone || hotline;
  return (
    <FactList
      rows={[
        { label: "Công ty", value: company.name },
        ...(company.taxCode
          ? [{ label: "Mã số thuế", value: company.taxCode }]
          : []),
        { label: "Địa chỉ", value: company.address },
        ...(company.warehouse
          ? [{ label: "Kho", value: company.warehouse }]
          : []),
        {
          label: "Điện thoại",
          value: <a href={telHref(phone)}>{formatPhone(phone)}</a>,
        },
        {
          label: "Email",
          value: <a href={`mailto:${company.email}`}>{company.email}</a>,
        },
      ]}
    />
  );
}
