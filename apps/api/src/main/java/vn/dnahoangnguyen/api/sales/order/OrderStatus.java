package vn.dnahoangnguyen.api.sales.order;

public enum OrderStatus {
    PENDING,
    CONFIRMED,
    PAID,
    ENTERED_KIOTVIET,
    SHIPPING,
    COMPLETED,
    CANCELLED;

    /** True once the customer's money has been recorded (also for orders that moved on after PAID). */
    public boolean isAtOrAfterPaid() {
        return this == PAID || this == ENTERED_KIOTVIET || this == SHIPPING || this == COMPLETED;
    }
}
