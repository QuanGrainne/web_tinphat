package vn.dnahoangnguyen.api.sales.bank;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.dnahoangnguyen.api.admin.audit.AuditActor;
import vn.dnahoangnguyen.api.admin.audit.AuditService;
import vn.dnahoangnguyen.api.common.error.DomainException;
import vn.dnahoangnguyen.api.common.error.ProblemCode;
import vn.dnahoangnguyen.api.common.security.CurrentUser;
import vn.dnahoangnguyen.api.sales.SalesErrors;
import vn.dnahoangnguyen.api.sales.admin.AdminDtos.BankTransactionRow;
import vn.dnahoangnguyen.api.sales.admin.AdminDtos.DismissRequest;
import vn.dnahoangnguyen.api.sales.admin.AdminDtos.LinkRequest;
import vn.dnahoangnguyen.api.sales.admin.AdminDtos.PageOf;
import vn.dnahoangnguyen.api.sales.bank.BankTransactionRepository.BankTx;
import vn.dnahoangnguyen.api.sales.order.AdminOrderService;
import vn.dnahoangnguyen.api.sales.order.OrderRepository;
import vn.dnahoangnguyen.api.sales.order.OrderRepository.OrderRow;
import vn.dnahoangnguyen.api.sales.order.OrderStatus;
import vn.dnahoangnguyen.api.sales.order.OrderStatusMachine.Actor;
import vn.dnahoangnguyen.api.sales.order.OrderStatusMachine.Command;

/** Manager decisions on bank notifications that were not paid automatically. */
@Service
public class BankTransactionAdminService {

    private static final Set<String> STATUSES = Set.of("RECEIVED", "MATCHED", "REVIEW", "IGNORED");
    private static final int MAX_PAGE_SIZE = 100;

    private final BankTransactionRepository transactions;
    private final OrderRepository orders;
    private final AdminOrderService orderService;
    private final AuditService audit;

    public BankTransactionAdminService(BankTransactionRepository transactions, OrderRepository orders,
                                       AdminOrderService orderService, AuditService audit) {
        this.transactions = transactions;
        this.orders = orders;
        this.orderService = orderService;
        this.audit = audit;
    }

    /** {@code status=REVIEW} means "needs a decision": rows matching flagged plus rows it never decided (RECEIVED). */
    @Transactional(readOnly = true)
    public PageOf<BankTransactionRow> list(String status, int page, int size) {
        String filter = status == null || status.isBlank() ? null : status.strip().toUpperCase();
        if (filter != null && !STATUSES.contains(filter)) {
            throw SalesErrors.invalidField("status", "Trạng thái không hợp lệ.");
        }
        List<String> statuses = filter == null ? List.of()
                : "REVIEW".equals(filter) ? List.of("REVIEW", "RECEIVED") : List.of(filter);
        int safePage = Math.max(1, page);
        int safeSize = Math.min(MAX_PAGE_SIZE, Math.max(1, size));
        List<BankTransactionRow> items = transactions.list(statuses, safeSize, (safePage - 1) * safeSize).stream()
                .map(BankTransactionRepository::toRow).toList();
        return new PageOf<>(items, safePage, safeSize, transactions.count(statuses));
    }

    /**
     * Links a notification to an order. With {@code markPaid} the order goes through the normal manual PAID transition
     * (amount = everything linked so far); an order that is already paid is left unchanged.
     */
    @Transactional
    public BankTransactionRow link(long id, LinkRequest request, CurrentUser user) {
        BankTx tx = transactions.lockById(id).orElseThrow(() -> DomainException.notFound("Không tìm thấy giao dịch."));
        requireUndecided(tx);
        OrderRow order = orders.lockById(request.orderId())
                .orElseThrow(() -> DomainException.notFound("Không tìm thấy đơn hàng."));
        if (request.markPaid() && !tx.incoming()) {
            throw SalesErrors.invalidField("markPaid", "Giao dịch chuyển đi không thể dùng để xác nhận đã nhận tiền.");
        }
        String note = blankToNull(request.note());
        transactions.markMatched(id, order.id(), user.username(), note);
        Map<String, Object> after = new LinkedHashMap<>();
        after.put("status", "MATCHED");
        after.put("orderId", order.id());
        after.put("markPaid", request.markPaid());
        if (note != null) {
            after.put("note", note);
        }
        audit.record("BANK_TX_LINK", "BANK_TX", id, Map.of("status", tx.status()), after);
        if (request.markPaid() && !order.status().isAtOrAfterPaid()) {
            long received = transactions.sumLinkedIncoming(order.id());
            orderService.apply(order, new Command(OrderStatus.PAID, null, received, null, note),
                    Actor.valueOf(user.role().name()), AuditActor.user(user), "MANUAL", user.username(),
                    OffsetDateTime.now(), Map.of("bankTransactionId", id));
        }
        return BankTransactionRepository.toRow(transactions.findById(id).orElseThrow());
    }

    @Transactional
    public BankTransactionRow dismiss(long id, DismissRequest request, CurrentUser user) {
        BankTx tx = transactions.lockById(id).orElseThrow(() -> DomainException.notFound("Không tìm thấy giao dịch."));
        requireUndecided(tx);
        String note = request.note().strip();
        transactions.markIgnored(id, user.username(), note);
        audit.record("BANK_TX_DISMISS", "BANK_TX", id, Map.of("status", tx.status()),
                Map.of("status", "IGNORED", "note", note));
        return BankTransactionRepository.toRow(transactions.findById(id).orElseThrow());
    }

    private static void requireUndecided(BankTx tx) {
        if (!"REVIEW".equals(tx.status()) && !"RECEIVED".equals(tx.status())) {
            throw DomainException.conflict(ProblemCode.CONFLICT_STATE, "Giao dịch này đã được xử lý.");
        }
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
