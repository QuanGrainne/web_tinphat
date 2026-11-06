import Link from "next/link";
import type { ProductCard as ProductCardData } from "@/lib/api/types";
import { formatVnd } from "@/lib/format/money";

/** Catalogue card: image, name (2 lines), price or "Liên hệ", and a direct contact button instead of a cart. */
export function ProductCard({ card, contactHref = "/lien-he" }: { card: ProductCardData; contactHref?: string }) {
  const href = `/san-pham/${card.slug}`;
  const external = contactHref.startsWith("http");
  return (
    <article className="card">
      <Link className="ph" href={href} prefetch={false} tabIndex={-1} aria-hidden="true">
        {card.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- plain img by design: no image optimiser on the small VPS
          <img src={card.imageUrl} alt="" width={600} height={600} loading="lazy" decoding="async" />
        ) : (
          <i className="i i-image" />
        )}
      </Link>
      <div className="card-b">
        <h3 className="nm">
          <Link href={href} prefetch={false}>
            {card.name}
          </Link>
        </h3>
        {card.specLine && <p className="tp-spec">{card.specLine}</p>}
        <div className="pr">
          <b>{card.fromPrice !== null ? `${card.hasMultipleUnits ? "Từ " : ""}${formatVnd(card.fromPrice)}` : "Liên hệ"}</b>
        </div>
        <a
          className="btn btn-pri"
          href={contactHref}
          aria-label={`Liên hệ ngay về ${card.name}`}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          Liên hệ ngay
        </a>
      </div>
    </article>
  );
}
