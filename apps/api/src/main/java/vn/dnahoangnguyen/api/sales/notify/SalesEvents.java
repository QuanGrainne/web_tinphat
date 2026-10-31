package vn.dnahoangnguyen.api.sales.notify;

/** Facts published inside a transaction; staff are notified only after it commits. */
public final class SalesEvents {

    private SalesEvents() {
    }

    public record OrderCreated(String code, String customerName, long total, String paymentMethod) {
    }

    public record QuoteCreated(String code, String customerName, boolean hasContactLines) {
    }

    public record BankReviewRecorded(long transactionId, long amount, String content) {
    }
}
