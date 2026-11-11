import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import type { PublicSettings } from "@/lib/api/types";
import {
  facebookHref,
  facebookLabel,
  formatPhone,
  telHref,
  zaloHref,
  zaloLabel,
} from "@/lib/order/phone";
import {
  BRAND,
  CAPABILITIES,
  HIGHLIGHTS,
  IMAGES,
  MAP,
  PROCESS_STEPS,
  SEASONS,
} from "@/lib/tinphat/content";
import { FacebookIcon, ZaloMark } from "./brand-icons";
import { CatalogImage } from "@/components/catalog-image";

export interface CategoryTile {
  name: string;
  slug: string;
  imageUrl: string | null;
}

/** Large category images near the top of the home page, name over the picture. */
export function CategoryTiles({ categories }: { categories: CategoryTile[] }) {
  return (
    <div className="tp-tiles">
      {categories.map((category) => (
        <Link
          key={category.slug}
          href={`/danh-muc/${category.slug}`}
          prefetch={false}
        >
          {category.imageUrl ? (
            <CatalogImage
              src={category.imageUrl}
              fill
              sizes="(min-width: 960px) 420px, 50vw"
            />
          ) : null}
          <b>{category.name}</b>
        </Link>
      ))}
    </div>
  );
}

export function SectionHead({
  label,
  title,
  text,
}: {
  label: string;
  title: string;
  text?: string;
}) {
  return (
    <div className="tp-head">
      <span className="tp-label">{label}</span>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
    </div>
  );
}

export function AboutSection() {
  return (
    <section className="tp-about-sec" id="gioi-thieu">
      <div className="tp-sec wrap tp-about">
        <div>
          <span className="tp-label">Về chúng tôi</span>
          <h2>
            Không chỉ là <em>sản phẩm decor.</em>
          </h2>
          <p>
            TÍN PHÁT DECOR cung cấp đa dạng các sản phẩm trang trí phục vụ nhiều
            mùa lễ hội và nhu cầu sử dụng quanh năm, hướng đến cửa hàng, đại lý
            và khách hàng nhập số lượng lớn.
          </p>
        </div>
        <ol className="tp-points">
          {HIGHLIGHTS.map((item, index) => (
            <li key={item.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function SeasonsSection() {
  return (
    <section className="tp-seasons-sec" id="mua-le-hoi">
      <div className="tp-sec wrap">
        <SectionHead
          label="Mùa lễ hội"
          title="Sẵn sàng cho từng mùa trong năm"
        />
        <div className="tp-seasons">
          {SEASONS.map((season, index) => (
            <article
              key={season.name}
              style={
                {
                  "--s-acc": season.accent,
                  "--s-bg": season.tint,
                } as CSSProperties
              }
            >
              <b className="tp-season-n" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </b>
              <small>{season.period}</small>
              <h3>{season.name}</h3>
              <p>{season.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Line icons (Lucide, ISC licence) for the five capabilities, in CAPABILITIES order. */
const CAPABILITY_ICONS = [
  <>
    <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
    <path d="M17 18h1M12 18h1M7 18h1" />
  </>,
  <>
    <rect x="16" y="16" width="6" height="6" rx="1" />
    <rect x="2" y="16" width="6" height="6" rx="1" />
    <rect x="9" y="2" width="6" height="6" rx="1" />
    <path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3M12 12V8" />
  </>,
  <>
    <path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z" />
    <path d="m7 16.5-4.74-2.85M7 16.5l5-3M7 16.5v5.17" />
    <path d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z" />
    <path d="m17 16.5-5-3M17 16.5l4.74-2.85M17 16.5v5.17" />
    <path d="M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z" />
    <path d="M12 8 7.26 5.15M12 8l4.74-2.85M12 13.5V8" />
  </>,
  <>
    <path d="m16 16 2 2 4-4" />
    <path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14" />
    <path d="m7.5 4.27 9 5.15M3.29 7 12 12l8.71-5M12 22V12" />
  </>,
  <>
    <path d="M3 3v18h18M18 17V9M13 17V5M8 17v-3" />
  </>,
];

/** "Năng lực": heading beside its intro, photos pinned on the left, capability rows on the right. */
export function CapabilitySection() {
  return (
    <section className="tp-capx" id="nang-luc">
      <div className="tp-sec wrap">
        <div className="tp-capx-h">
          <span className="tp-label">Năng lực</span>
          <div className="tp-capx-hc">
            <h2>
              Đằng sau
              <br />
              <em>mỗi sản phẩm.</em>
            </h2>
            <p>
              {BRAND.name} tham gia trực tiếp vào nhiều công đoạn của chuỗi cung
              ứng — từ sản xuất đến tay khách hàng.
            </p>
          </div>
        </div>
        <div className="tp-capx-grid">
          <div className="tp-capx-imgs">
            <CatalogImage
              className="tp-capx-main"
              src={IMAGES.warehouse}
              alt={`Nhà xưởng và kho hàng ${BRAND.name}`}
              width={1200}
              height={800}
              sizes="(min-width: 960px) 50vw, 100vw"
            />
            <CatalogImage
              className="tp-capx-sub"
              src={IMAGES.packing}
              alt={`Khu đóng hàng ${BRAND.name}`}
              width={1200}
              height={800}
              sizes="50vw"
            />
          </div>
          <ul className="tp-capx-list">
            {CAPABILITIES.map((item, index) => (
              <li key={item.title}>
                <span className="tp-capx-ico" aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {CAPABILITY_ICONS[index % CAPABILITY_ICONS.length]}
                  </svg>
                </span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/** Lucide line icon (ISC licence) drawn at the size its box gives it. */
function LineIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** Icons for the five steps, in PROCESS_STEPS order: talk, advise, confirm, pack, deliver. */
const STEP_ICONS = [
  <path
    key="talk"
    d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
  />,
  <path
    key="advise"
    d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5M9 18h6M10 22h4"
  />,
  <path key="confirm" d="M22 11.08V12a10 10 0 1 1-5.93-9.14M9 11l3 3L22 4" />,
  <path
    key="pack"
    d="m7.5 4.27 9 5.15M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16ZM3.3 7l8.7 5 8.7-5M12 22V12"
  />,
  <g key="deliver">
    <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2M15 18H9M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
    <circle cx="17" cy="18" r="2" />
    <circle cx="7" cy="18" r="2" />
  </g>,
];

/** "Quy trình hợp tác": five steps joined by arrows on desktop, a vertical timeline on phones. */
export function ProcessSection() {
  return (
    <section className="tp-proc" id="quy-trinh">
      <div className="tp-sec wrap">
        <div className="tp-proc-h">
          <span className="tp-label">Quy trình</span>
          <h2>
            Quy trình <em>hợp tác.</em>
          </h2>
          <p>
            Đơn giản, minh bạch và thuận tiện — từ lần liên hệ đầu tiên đến khi
            hàng về tay bạn.
          </p>
        </div>
        <ol className="tp-flow">
          {PROCESS_STEPS.map((step, index) => (
            <li key={step.title}>
              <div className="tp-flow-top">
                <span className="tp-flow-ico">
                  <LineIcon>{STEP_ICONS[index % STEP_ICONS.length]}</LineIcon>
                </span>
                <span className="tp-flow-num">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <div className="tp-flow-body">
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** Dark closing band: the invitation, the contact cards (each in its own colour), then the map with a directions link. */
export function ContactCta({ settings }: { settings: PublicSettings | null }) {
  const company = settings?.company ?? null;
  const phone = settings ? settings.hotline || settings.company.phone : null;
  const zalo = settings?.zalo ?? null;
  const zaloLink = zaloHref(zalo);
  const facebook = facebookHref(settings?.facebook ?? null);
  return (
    <section className="tp-cta" id="lien-he">
      <div className="wrap tp-cta-top">
        <div className="tp-cta-copy">
          <span className="tp-label">Liên hệ hợp tác</span>
          <h2>
            Bạn đang tìm
            <br />
            <em>nguồn hàng decor?</em>
          </h2>
          <p>
            Liên hệ với {BRAND.name} để trao đổi về sản phẩm và nhu cầu hợp tác.
            Chúng tôi sẵn sàng tư vấn và hỗ trợ đơn hàng số lượng lớn cho cửa
            hàng và đại lý.
          </p>
          {phone ? (
            <a className="btn btn-pri btn-lg tp-cta-btn" href={telHref(phone)}>
              Liên hệ ngay
            </a>
          ) : (
            <Link className="btn btn-pri btn-lg tp-cta-btn" href="/lien-he">
              Liên hệ ngay
            </Link>
          )}
        </div>
        <ul className="tp-cta-cards">
          {phone && (
            <li className="tp-c-phone">
              <span className="tp-cta-ico">
                <LineIcon>
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </LineIcon>
              </span>
              <div>
                <small>Hotline</small>
                <a href={telHref(phone)}>{formatPhone(phone)}</a>
              </div>
            </li>
          )}
          {zalo && zaloLink && (
            <li className="tp-c-zalo">
              <span className="tp-cta-ico">
                <ZaloMark />
              </span>
              <div>
                <small>Zalo</small>
                <a href={zaloLink} target="_blank" rel="noopener noreferrer">
                  {zaloLabel(zalo)}
                </a>
              </div>
            </li>
          )}
          {facebook && (
            <li className="tp-c-fb">
              <span className="tp-cta-ico">
                <FacebookIcon />
              </span>
              <div>
                <small>Facebook</small>
                <a href={facebook} target="_blank" rel="noopener noreferrer">
                  {facebookLabel(facebook)}
                </a>
              </div>
            </li>
          )}
          {company?.email && (
            <li className="tp-c-mail">
              <span className="tp-cta-ico">
                <LineIcon>
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </LineIcon>
              </span>
              <div>
                <small>Email</small>
                <a href={`mailto:${company.email}`}>{company.email}</a>
              </div>
            </li>
          )}
          {company?.address && (
            <li className="tp-c-map">
              <span className="tp-cta-ico">
                <LineIcon>
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </LineIcon>
              </span>
              <div>
                <small>Địa chỉ</small>
                <a
                  href={MAP.directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {company.address}
                </a>
              </div>
            </li>
          )}
        </ul>
      </div>
      <div className="wrap">
        <div className="tp-cta-map">
          <div className="tp-cta-maph">
            <span className="tp-cta-pin">
              <LineIcon>
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </LineIcon>
            </span>
            <span className="tp-cta-addr">
              {company?.address ?? "Cầu chợ Trâu, Hải Hưng, Ninh Bình"}
            </span>
            <a
              href={MAP.directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Xem đường đi →
            </a>
          </div>
          <iframe
            className="tp-cta-mapf"
            title={`Bản đồ ${BRAND.name}`}
            src={MAP.embedUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  );
}
