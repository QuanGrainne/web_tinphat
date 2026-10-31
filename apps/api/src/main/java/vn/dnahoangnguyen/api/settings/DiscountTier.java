package vn.dnahoangnguyen.api.settings;

/** Order-total discount step: orders of at least {@code threshold} VND get {@code pct} percent off. */
public record DiscountTier(long threshold, double pct) {
}
