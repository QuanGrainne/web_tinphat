package vn.dnahoangnguyen.api.notify;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("!mail")
public class LogNotificationAdapter implements NotificationPort {

    private static final Logger log = LoggerFactory.getLogger(LogNotificationAdapter.class);

    @Override
    public void newOrder(String code, String customerName, long total, String paymentMethod) {
        log.info("[notify] new order {} from '{}' total={} payment={}", code, customerName, total, paymentMethod);
    }

    @Override
    public void newQuote(String code, String customerName, boolean hasContactLines) {
        log.info("[notify] new quote {} from '{}' contactLines={}", code, customerName, hasContactLines);
    }

    @Override
    public void bankSettingsChanged(String changedBy, String summary) {
        log.info("[notify] bank settings changed by {}: {}", changedBy, summary);
    }

    @Override
    public void bankReviewPending(long transactionId, long amount, String content) {
        log.info("[notify] bank transaction {} needs review amount={} content='{}'", transactionId, amount, content);
    }
}
