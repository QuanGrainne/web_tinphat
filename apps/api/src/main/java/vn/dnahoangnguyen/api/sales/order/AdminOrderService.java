package vn.dnahoangnguyen.api.sales.order;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import vn.dnahoangnguyen.api.admin.audit.AuditActor;
import vn.dnahoangnguyen.api.admin.audit.AuditService;
import vn.dnahoangnguyen.api.common.error.DomainException;
import vn.dnahoangnguyen.api.common.security.CurrentUser;
import vn.dnahoangnguyen.api.sales.admin.AdminDtos.AdminOrder;
import vn.dnahoangnguyen.api.sales.admin.AdminDtos.AdminOrderItem;
import vn.dnahoangnguyen.api.sales.admin.AdminDtos.AllowedOrderTransition;
import vn.dnahoangnguyen.api.sales.admin.AdminDtos.OrderTransition;
import vn.dnahoangnguyen.api.sales.admin.HistoryReader;
import vn.dnahoangnguyen.api.sales.bank.BankTransactionRepository;
import vn.dnahoangnguyen.api.sales.order.OrderRepository.OrderRow;
import vn.dnahoangnguyen.api.sales.order.OrderStatusMachine.Actor;
import vn.dnahoangnguyen.api.sales.order.OrderStatusMachine.Command;
import vn.dnahoangnguyen.api.sales.order.OrderStatusMachine.Current;

/** Staff side of orders: detail view and status transitions (also used by bank matching). */
@Service
public class AdminOrderService {

    public static final String AUDIT_ENTITY = "ORDER";
    public static final String AUDIT_ACTION = "ORDER_STATUS";

    private final OrderRepository orders;
    private final AuditService audit;
    private final HistoryReader history;
    private final BankTransactionRepository bankTransactions;

    public AdminOrderService(OrderRepository orders, AuditService audit, HistoryReader history,
                             BankTransactionRepository bankTransactions) {
        this.orders = orders;
        this.audit = audit;
        this.history = history;
        this.bankTransactions = bankTransactions;
    }

    @Transactional(readOnly = true)
    public AdminOrder get(long id, CurrentUser user) {
        OrderRow row = orders.findById(id).orElseThrow(AdminOrderService::notFound);
        return detail(row, user);
    }

    /** Manual transition by the signed-in user; the row is locked so two staff members cannot interleave. */
    @Transactional
    public AdminOrder transition(long id, OrderTransition body, CurrentUser user) {
        OrderRow row = orders.lockById(id).orElseThrow(AdminOrderService::notFound);
        Command command = new Command(body.to(), body.shippingFee(), body.paidAmount(), body.kiotvietOrderCode(),
                body.note());
        apply(row, command, Actor.valueOf(user.role().name()), AuditActor.user(user), "MANUAL", user.username(),
                OffsetDateTime.now(), null);
        return detail(orders.findById(id).orElseThrow(), user);
    }

    /**
     * Validates and applies one transition to an order whose row the caller has locked, and writes the audit row in
     * the same transaction. {@code extraAudit} adds keys such as the bank transaction id to the audit snapshot.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void apply(OrderRow order, Command command, Actor actor, AuditActor auditActor, String paidVia,
                      String paidBy, OffsetDateTime now, Map<String, Object> extraAudit) {
        OrderStatusMachine.validate(new Current(order.status(), order.paymentMethod(), order.total()), command, actor);
        OrderStatus to = command.to();
        Long shippingFee = order.shippingFee();
        long total = order.total();
        Long paidAmount = order.paidAmount();
        String paidNote = order.paidNote();
        String by = order.paidBy();
        String via = order.paidVia();
        OffsetDateTime paidAt = order.paidAt();
        String kiotviet = order.kiotvietOrderCode();

        Map<String, Object> after = new LinkedHashMap<>();
        after.put("status", to.name());
        switch (to) {
            case CONFIRMED -> {
                shippingFee = command.shippingFee();
                total = order.subtotal() - order.discountTotal() + shippingFee;
                after.put("shippingFee", shippingFee);
                after.put("total", total);
            }
            case PAID -> {
                paidAmount = command.paidAmount();
                paidNote = blankToNull(command.note());
                by = paidBy;
                via = paidVia;
                paidAt = now;
                after.put("paidAmount", paidAmount);
                after.put("paidVia", via);
            }
            case ENTERED_KIOTVIET -> {
                kiotviet = command.kiotvietOrderCode().strip();
                after.put("kiotvietOrderCode", kiotviet);
            }
            default -> {
                // no field changes
            }
        }
        if (blankToNull(command.note()) != null) {
            after.put("note", command.note().strip());
        }
        if (extraAudit != null) {
            after.putAll(extraAudit);
        }
        orders.updateAfterTransition(order.id(), to, shippingFee, total, paidAmount, paidNote, by, via, paidAt,
                kiotviet);
        audit.recordAs(auditActor, AUDIT_ACTION, AUDIT_ENTITY, order.id(), Map.of("status", order.status().name()),
                after);
    }

    public AdminOrder detail(OrderRow o, CurrentUser user) {
        Actor actor = Actor.valueOf(user.role().name());
        List<AdminOrderItem> items = orders.items(o.id()).stream()
                .map(i -> new AdminOrderItem(i.skuId(), i.skuCode(), i.productName(), i.unitName(), i.conversion(),
                        i.qty(), i.listPrice(), i.unitPrice(), i.lineTotal()))
                .toList();
        List<AllowedOrderTransition> allowed = OrderStatusMachine
                .allowedTransitions(o.status(), o.paymentMethod(), actor).stream()
                .map(e -> new AllowedOrderTransition(e.to(), e.requires().stream().map(Enum::name).toList()))
                .toList();
        return new AdminOrder(o.id(), o.code(), o.status(), o.paymentMethod(), o.createdAt(), o.customerName(),
                o.phone(), o.address(), o.note(), o.internalNote(), items, o.subtotal(), o.discountTotal(),
                o.discountNote(), o.shippingFee(), o.total(), o.paidAmount(), o.paidVia(), o.paidAt(),
                o.kiotvietOrderCode(), OrderStatusMachine.awaitsKiotVietEntry(o.status(), o.paymentMethod()), allowed,
                history.read(AUDIT_ENTITY, o.id()),
                bankTransactions.forOrder(o.id()).stream().map(BankTransactionRepository::toRow).toList());
    }

    private static DomainException notFound() {
        return DomainException.notFound("Không tìm thấy đơn hàng.");
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
