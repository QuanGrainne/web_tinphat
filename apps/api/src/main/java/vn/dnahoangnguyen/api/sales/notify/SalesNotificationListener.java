package vn.dnahoangnguyen.api.sales.notify;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import vn.dnahoangnguyen.api.notify.NotificationPort;
import vn.dnahoangnguyen.api.sales.notify.SalesEvents.BankReviewRecorded;
import vn.dnahoangnguyen.api.sales.notify.SalesEvents.OrderCreated;
import vn.dnahoangnguyen.api.sales.notify.SalesEvents.QuoteCreated;

/**
 * Forwards sales events to the notification port once the data is committed. Runs on another thread and never
 * throws: a failed notification must not affect the order that caused it (the admin bell still shows it).
 */
@Component
public class SalesNotificationListener {

    private static final Logger log = LoggerFactory.getLogger(SalesNotificationListener.class);

    private final NotificationPort port;

    public SalesNotificationListener(NotificationPort port) {
        this.port = port;
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderCreated(OrderCreated event) {
        try {
            port.newOrder(event.code(), event.customerName(), event.total(), event.paymentMethod());
        } catch (RuntimeException e) {
            log.error("Could not notify about order {}", event.code(), e);
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onQuoteCreated(QuoteCreated event) {
        try {
            port.newQuote(event.code(), event.customerName(), event.hasContactLines());
        } catch (RuntimeException e) {
            log.error("Could not notify about quote {}", event.code(), e);
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onBankReviewRecorded(BankReviewRecorded event) {
        try {
            port.bankReviewPending(event.transactionId(), event.amount(), event.content());
        } catch (RuntimeException e) {
            log.error("Could not notify about bank transaction {}", event.transactionId(), e);
        }
    }
}
