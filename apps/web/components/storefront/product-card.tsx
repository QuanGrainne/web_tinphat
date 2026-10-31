import Link from "next/link";
import type { ProductCard as ProductCardData } from "@/lib/api/types";
import { formatVnd } from "@/lib/format/money";

/** Catalogue card: name (2 lines), "Từ 8.570đ / gói" or "Liên hệ", unit chips (desktop), one button. */
export function ProductCard({ card }: { card: ProductCardData }) {
  const href = `/san-pham/${card.slug}`;
  const unit = card.fromUnitName?.toLowerCase();
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
        <div className="pr">
          {card.fromPrice !== null ? (
            <>
              <b>
                {card.hasMultipleUnits ? "Từ " : ""}
                {formatVnd(card.fromPrice)}
              </b>
              {unit && <small>/ {unit}</small>}
            </>
          ) : (
            <b>Liên hệ</b>
          )}
        </div>
        {card.units.length > 0 && (
          <div className="chips">
            {card.units.map((u) => (
              <i key={u.name}>{u.priceVisible ? u.name : `${u.name}: Liên hệ`}</i>
            ))}
          </div>
        )}
        <Link className="btn btn-pri" href={href} prefetch={false} aria-label={`Chọn mua ${card.name}`}>
          Chọn mua
        </Link>
      </div>
    </article>
  );
}
