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
            <b>TÍN PHÁT</b>
            <span>DECORD</span>
          </Link>
          {company && (
            <p style={{ marginTop: 8 }}>
              {company.name}
              {company.taxCode && (
                <>
                  <br />
                  Mã số doanh nghiệp: {company.taxCode}
                </>
              )}
            </p>
          )}
        </div>
        {company && (
          <div>
            <h3>Địa chỉ</h3>
            <p>
              {company.address}
              {company.warehouse && (
                <>
                  <br />
                  Kho: {company.warehouse}
                </>
              )}
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
          <h3>Khám phá</h3>
          <ul>
            <li>
              <Link href="/gioi-thieu">Giới thiệu</Link>
            </li>
            <li>
              <Link href="/san-pham">Sản phẩm</Link>
            </li>
            <li>
              <Link href="/lien-he">Liên hệ</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="ft-b">© {new Date().getFullYear()} TÍN PHÁT DECORD</div>
    </footer>
  );
}
