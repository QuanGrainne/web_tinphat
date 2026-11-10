import Link from "next/link";
import type { ProductCard as ProductCardData } from "@/lib/api/types";
import { CatalogImage } from "@/components/catalog-image";
import { formatVnd } from "@/lib/format/money";

/** Catalogue card: image, name (2 lines), price or "Liên hệ", and a direct contact button instead of a cart. */
export function ProductCard({
  card,
  contactHref = "/lien-he",
}: {
  card: ProductCardData;
  contactHref?: string;
}) {
  const href = `/san-pham/${card.slug}`;
  const external = contactHref.startsWith("http");
  return (
    <article className={card.discontinued ? "card tp-off" : "card"}>
      <Link
        className="ph"
        href={href}
        prefetch={false}
        tabIndex={-1}
        aria-hidden="true"
      >
        {card.imageUrl ? (
          <CatalogImage
            src={card.imageUrl}
            fill
            sizes="(min-width: 1240px) 240px, (min-width: 960px) 30vw, 50vw"
          />
        ) : (
          <i className="i i-image" />
        )}
        {card.discontinued && (
          <span className="tp-off-badge">Ngừng kinh doanh</span>
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
          {card.discontinued ? (
            <span className="tp-ask">Ngừng kinh doanh</span>
          ) : card.fromPrice !== null ? (
            <b>{`${card.hasMultipleUnits ? "Từ " : ""}${formatVnd(card.fromPrice)}`}</b>
          ) : (
            <span className="tp-ask">Liên hệ báo giá</span>
          )}
        </div>
        {card.discontinued ? (
          <Link className="btn btn-out" href={href} prefetch={false}>
            Xem chi tiết
          </Link>
        ) : (
          <a
            className="btn btn-pri"
            href={contactHref}
            aria-label={`Liên hệ ngay về ${card.name}`}
            {...(external
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
          >
            Liên hệ ngay
          </a>
        )}
      </div>
    </article>
  );
}
