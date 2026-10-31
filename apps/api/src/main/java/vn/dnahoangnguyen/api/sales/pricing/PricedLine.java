package vn.dnahoangnguyen.api.sales.pricing;

/**
 * One repriced basket line. {@code unavailable} lines (missing, unpublished, discontinued or hidden SKU) carry empty
 * strings and null prices. A line whose price is hidden has {@code priceVisible=false} and every price field null,
 * and never counts towards a total. {@code unitPrice} is the effective price (promotion already applied).
 */
public record PricedLine(
        long skuId, boolean unavailable,
        String code, String productName, String productSlug, String unitName, int conversion, int qty,
        boolean priceVisible, boolean orderable,
        Long listPrice, Long unitPrice, Long lineTotal) {

    public static PricedLine unavailable(long skuId, int qty) {
        return new PricedLine(skuId, true, "", "", "", "", 0, qty, false, false, null, null, null);
    }
}
