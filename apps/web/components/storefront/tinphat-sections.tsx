import Link from "next/link";
import type { PublicSettings } from "@/lib/api/types";
import { formatPhone, telHref, zaloHref } from "@/lib/order/phone";
import { CAPABILITIES, HIGHLIGHTS, IMAGES, PROCESS_STEPS, SEASONS } from "@/lib/tinphat/content";

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
        <Link key={category.slug} href={`/danh-muc/${category.slug}`} prefetch={false}>
          {category.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- plain img by design: no image optimiser on the small VPS
            <img src={category.imageUrl} alt="" width={640} height={400} loading="lazy" decoding="async" />
          ) : null}
          <b>{category.name}</b>
        </Link>
      ))}
    </div>
  );
}

export function SectionHead({ label, title, text }: { label: string; title: string; text?: string }) {
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
    <section className="tp-sec wrap tp-about" id="gioi-thieu">
      <div>
        <span className="tp-label">Về chúng tôi</span>
        <h2>
          Không chỉ là <em>sản phẩm decor.</em>
        </h2>
        <p>
          TÍN PHÁT DECORD cung cấp đa dạng các sản phẩm trang trí phục vụ nhiều mùa lễ hội và nhu cầu sử dụng quanh năm, hướng đến cửa
          hàng, đại lý và khách hàng nhập số lượng lớn.
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
    </section>
  );
}

export function SeasonsSection() {
  return (
    <section className="tp-sec wrap">
      <SectionHead label="Mùa lễ hội" title="Sẵn sàng cho từng mùa trong năm" />
      <div className="tp-seasons">
        {SEASONS.map((season) => (
          <article key={season.name}>
            <small>{season.period}</small>
            <h3>{season.name}</h3>
            <p>{season.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function CapabilitySection() {
  return (
    <section className="tp-band">
      <div className="tp-sec wrap">
        <SectionHead label="Năng lực" title="Từ sản xuất đến đóng hàng" />
        <div className="tp-cap">
          <div className="tp-cap-imgs">
            {/* eslint-disable-next-line @next/next/no-img-element -- plain img by design: no image optimiser on the small VPS */}
            <img src={IMAGES.warehouse} alt="Nhà xưởng và kho hàng TÍN PHÁT DECORD" width={1200} height={800} loading="lazy" decoding="async" />
            {/* eslint-disable-next-line @next/next/no-img-element -- plain img by design: no image optimiser on the small VPS */}
            <img src={IMAGES.packing} alt="Khu nhà xưởng TÍN PHÁT DECORD" width={1200} height={800} loading="lazy" decoding="async" />
          </div>
          <ul>
            {CAPABILITIES.map((item) => (
              <li key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function ProcessSection() {
  return (
    <section className="tp-sec wrap">
      <SectionHead label="Quy trình" title="Hợp tác trong 5 bước" />
      <ol className="tp-steps">
        {PROCESS_STEPS.map((step, index) => (
          <li key={step.title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Dark closing band with the two ways to reach the company. */
export function ContactCta({ settings }: { settings: PublicSettings | null }) {
  const phone = settings ? settings.hotline || settings.company.phone : null;
  const zalo = settings ? zaloHref(settings.zalo) : null;
  return (
    <section className="tp-cta">
      <div className="wrap">
        <div>
          <h2>Bạn cần nhập hàng cho mùa tới?</h2>
          <p>Liên hệ để nhận tư vấn sản phẩm và báo giá theo số lượng.</p>
        </div>
        <div className="tp-acts">
          {phone && (
            <a className="btn btn-pri btn-lg" href={telHref(phone)}>
              <i className="i i-phone" aria-hidden="true" />
              Gọi {formatPhone(phone)}
            </a>
          )}
          {zalo ? (
            <a className="btn btn-lg tp-ghost" href={zalo} target="_blank" rel="noopener noreferrer">
              <i className="i i-chat" aria-hidden="true" />
              Nhắn Zalo
            </a>
          ) : (
            <Link className="btn btn-lg tp-ghost" href="/lien-he">
              Xem liên hệ
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
