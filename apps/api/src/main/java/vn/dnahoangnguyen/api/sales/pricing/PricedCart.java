package vn.dnahoangnguyen.api.sales.pricing;

import java.util.List;

/**
 * Result of repricing a basket. {@code subtotal} sums the priced lines only; {@code total = subtotal - discountTotal}
 * (shipping is added by staff when they confirm the order).
 */
public record PricedCart(
        List<PricedLine> lines, long subtotal, long discountTotal, String discountNote, long total,
        boolean hasContactLines) {

    public boolean allOrderable() {
        return !lines.isEmpty() && lines.stream().allMatch(PricedLine::orderable);
    }
}
