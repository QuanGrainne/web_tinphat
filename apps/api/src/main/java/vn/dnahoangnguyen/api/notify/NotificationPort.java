package vn.dnahoangnguyen.api.notify;

/** Outbound staff notifications. The default adapter only logs; the {@code mail} profile sends email. */
public interface NotificationPort {

    void newOrder(String code, String customerName, long total, String paymentMethod);

    void newQuote(String code, String customerName, boolean hasContactLines);

    void bankSettingsChanged(String changedBy, String summary);

    void bankReviewPending(long transactionId, long amount, String content);
}
