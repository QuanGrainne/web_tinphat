import Link from "next/link";
import type { PublicSettings } from "@/lib/api/types";
import { telHref } from "./shell-data";

export function SiteFooter({ settings }: { settings: PublicSettings | null }) {
  const company = settings?.company ?? null;
  return (
    <footer className="ft">
      <div className="wrap">
        <div>
          <Link className="logo" href="/">
            <b>DNA</b>
            <span>Hoàng Nguyên</span>
          </Link>
          {company && (
            <p style={{ marginTop: 8 }}>
              {company.name}
              <br />
              Mã số doanh nghiệp: {company.taxCode}
            </p>
          )}
        </div>
        {company && (
          <div>
            <h3>Địa chỉ</h3>
            <p>
              Trụ sở: {company.address}
              <br />
              Kho: {company.warehouse}
            </p>
          </div>
        )}
        {company && (
          <div>
            <h3>Liên hệ</h3>
            <p>
              <a href={telHref(company.phone)}>{company.phone}</a>
              <br />
              <a href={`mailto:${company.email}`}>{company.email}</a>
            </p>
          </div>
        )}
        <div>
          <h3>Hỗ trợ</h3>
          <ul>
            <li>
              <Link href="/gioi-thieu">Giới thiệu</Link>
            </li>
            <li>
              <Link href="/chinh-sach">Chính sách</Link>
            </li>
            <li>
              <Link href="/lien-he">Liên hệ</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="ft-b">© {new Date().getFullYear()} DNA Hoàng Nguyên · Giá đã gồm VAT</div>
    </footer>
  );
}
