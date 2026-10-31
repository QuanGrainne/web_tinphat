import type { ProductCard as ProductCardData } from "@/lib/api/types";
import { ProductCard } from "./product-card";

/** 2 columns on mobile; 4 (listing) or 5 (home / related, 4 cards shown on mobile) on desktop. */
export function ProductGrid({ cards, variant }: { cards: ProductCardData[]; variant: "grid-4" | "grid-5" }) {
  return (
    <div className={`grid ${variant}`}>
      {cards.map((card) => (
        <ProductCard key={card.id} card={card} />
      ))}
    </div>
  );
}
