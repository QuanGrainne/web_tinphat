package vn.dnahoangnguyen.api.sales.bank;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import vn.dnahoangnguyen.api.admin.audit.AuditActor;
import vn.dnahoangnguyen.api.sales.bank.BankTransactionRepository.BankTx;
import vn.dnahoangnguyen.api.sales.bank.BankTransactionRepository.NewBankTx;
import vn.dnahoangnguyen.api.sales.bank.PaymentMatcher.Accounts;
import vn.dnahoangnguyen.api.sales.bank.PaymentMatcher.AutoPaid;
import vn.dnahoangnguyen.api.sales.bank.PaymentMatcher.Incoming;
import vn.dnahoangnguyen.api.sales.bank.PaymentMatcher.OrderFacts;
import vn.dnahoangnguyen.api.sales.bank.PaymentMatcher.Outcome;
import vn.dnahoangnguyen.api.sales.bank.PaymentMatcher.Review;
import vn.dnahoangnguyen.api.sales.notify.SalesEvents.BankReviewRecorded;
import vn.dnahoangnguyen.api.sales.order.AdminOrderService;
import vn.dnahoangnguyen.api.sales.order.OrderRepository;
import vn.dnahoangnguyen.api.sales.order.OrderRepository.OrderRow;
import vn.dnahoangnguyen.api.sales.order.OrderStatusMachine.Actor;
import vn.dnahoangnguyen.api.sales.order.OrderStatusMachine.Command;
import vn.dnahoangnguyen.api.sales.order.OrderStatus;
import vn.dnahoangnguyen.api.settings.SettingsService;

/**
 * Stores every bank notification first (own transaction, unique per vendor transaction id) and only then decides
 * what it means. A failure while matching leaves the row RECEIVED; the webhook reply never depends on matching.
 */
@Service
public class BankTransactionIngestService {

    public static final String SYSTEM_ACTOR = "BANK_WEBHOOK";

    private static final Logger log = LoggerFactory.getLogger(BankTransactionIngestService.class);

    private final BankTransactionRepository transactions;
    private final OrderRepository orders;
    private final AdminOrderService orderService;
    private final SettingsService settings;
    private final SepayProperties properties;
    private final ApplicationEventPublisher events;
    private final TransactionTemplate storeTx;
    private final TransactionTemplate matchTx;

    public BankTransactionIngestService(BankTransactionRepository transactions, OrderRepository orders,
                                        AdminOrderService orderService, SettingsService settings,
                                        SepayProperties properties, ApplicationEventPublisher events,
                                        PlatformTransactionManager transactionManager) {
        this.transactions = transactions;
        this.orders = orders;
        this.orderService = orderService;
        this.settings = settings;
        this.properties = properties;
        this.events = events;
        this.storeTx = new TransactionTemplate(transactionManager);
        this.storeTx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        this.matchTx = new TransactionTemplate(transactionManager);
        this.matchTx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    /** Stores the notification; empty when the vendor transaction id was already stored (a replay). */
    public Optional<Long> store(NewBankTx tx) {
        return storeTx.execute(status -> transactions.insertIfAbsent(tx));
    }

    /** Matches a stored notification, never throwing: any failure is logged and the row stays RECEIVED. */
    public void processQuietly(long id) {
        try {
            matchTx.executeWithoutResult(status -> process(id));
        } catch (RuntimeException e) {
            log.error("Bank transaction {} stays RECEIVED: matching failed", id, e);
        }
    }

    private void process(long id) {
        Optional<BankTx> locked = transactions.lockById(id);
        if (locked.isEmpty() || !"RECEIVED".equals(locked.get().status())) {
            return;
        }
        BankTx tx = locked.get();
        Accounts accounts = new Accounts(settings.bank().accountNo(), properties.accountNo());
        Outcome outcome = PaymentMatcher.match(
                new Incoming(tx.accountNo(), tx.incoming(), tx.amount(), tx.content()),
                this::lockedOrderFacts, accounts);
        switch (outcome) {
            case AutoPaid paid -> autoPay(tx, paid.order());
            case Review review -> {
                transactions.markReview(id, review.reason().name(), review.order() == null ? null : review.order().id());
                events.publishEvent(new BankReviewRecorded(id, tx.amount(), tx.content()));
                log.info("Bank transaction {} (account {}) needs review: {}", id,
                        BankTransactionRepository.maskAccount(tx.accountNo()), review.reason());
            }
            default -> transactions.markIgnored(id, null, null);
        }
    }

    /** Looks the order up with a row lock so a concurrent manual "paid" cannot interleave with the match. */
    private Optional<OrderFacts> lockedOrderFacts(String code) {
        return orders.lockByCode(code)
                .map(o -> new OrderFacts(o.id(), o.code(), o.paymentMethod(), o.status(), o.total()));
    }

    private void autoPay(BankTx tx, OrderFacts facts) {
        OrderRow order = orders.lockById(facts.id()).orElseThrow();
        OffsetDateTime paidAt = tx.txTime() == null ? OffsetDateTime.now() : tx.txTime();
        orderService.apply(order, new Command(OrderStatus.PAID, null, tx.amount(), null, null), Actor.BANK_WEBHOOK,
                AuditActor.system(SYSTEM_ACTOR), "BANK_WEBHOOK", null, paidAt, Map.of("bankTransactionId", tx.id()));
        transactions.markAutoMatched(tx.id(), order.id());
        log.info("Order {} paid by bank transaction {} (account {})", order.code(), tx.id(),
                BankTransactionRepository.maskAccount(tx.accountNo()));
    }
}
