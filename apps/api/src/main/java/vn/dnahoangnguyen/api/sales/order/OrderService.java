package vn.dnahoangnguyen.api.sales.order;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import vn.dnahoangnguyen.api.admin.audit.AuditActor;
import vn.dnahoangnguyen.api.admin.audit.AuditService;
import vn.dnahoangnguyen.api.common.error.DomainException;
import vn.dnahoangnguyen.api.common.error.ProblemCode;
import vn.dnahoangnguyen.api.common.error.Problems;
import vn.dnahoangnguyen.api.common.ratelimit.FixedWindowRateLimiter;
import vn.dnahoangnguyen.api.sales.CodeGenerator;
import vn.dnahoangnguyen.api.sales.PhoneNumbers;
import vn.dnahoangnguyen.api.sales.SalesDtos.BankBlock;
import vn.dnahoangnguyen.api.sales.SalesDtos.LookupRequest;
import vn.dnahoangnguyen.api.sales.SalesDtos.OrderItemView;
import vn.dnahoangnguyen.api.sales.SalesDtos.OrderSubmit;
import vn.dnahoangnguyen.api.sales.SalesDtos.OrderView;
import vn.dnahoangnguyen.api.sales.SalesDtos.Submitted;
import vn.dnahoangnguyen.api.sales.SalesErrors;
import vn.dnahoangnguyen.api.sales.notify.SalesEvents.OrderCreated;
import vn.dnahoangnguyen.api.sales.order.OrderRepository.ItemRow;
import vn.dnahoangnguyen.api.sales.order.OrderRepository.NewOrder;
import vn.dnahoangnguyen.api.sales.order.OrderRepository.OrderRow;
import vn.dnahoangnguyen.api.sales.pricing.OrderPricingService;
import vn.dnahoangnguyen.api.sales.pricing.PricedCart;
import vn.dnahoangnguyen.api.sales.pricing.PricedLine;
import vn.dnahoangnguyen.api.settings.BankInfo;
import vn.dnahoangnguyen.api.settings.SettingsService;

/** Public side of orders: submit (idempotent, rate limited, repriced) and lookup by code plus phone. */
@Service
public class OrderService {

    private static final Duration WINDOW = Duration.ofMinutes(10);
    private static final String CUSTOMER_ACTOR = "CUSTOMER";

    private final OrderRepository orders;
    private final OrderPricingService pricing;
    private final CodeGenerator codes;
    private final AuditService audit;
    private final SettingsService settings;
    private final FixedWindowRateLimiter limiter;
    private final ApplicationEventPublisher events;
    private final TransactionTemplate tx;
    private final int createLimit;
    private final int lookupLimit;

    public OrderService(OrderRepository orders, OrderPricingService pricing, CodeGenerator codes, AuditService audit,
                        SettingsService settings, FixedWindowRateLimiter limiter, ApplicationEventPublisher events,
                        PlatformTransactionManager transactionManager,
                        @Value("${dna.sales.order-limit:5}") int createLimit,
                        @Value("${dna.sales.lookup-limit:10}") int lookupLimit) {
        this.orders = orders;
        this.pricing = pricing;
        this.codes = codes;
        this.audit = audit;
        this.settings = settings;
        this.limiter = limiter;
        this.events = events;
        this.tx = new TransactionTemplate(transactionManager);
        this.createLimit = createLimit;
        this.lookupLimit = lookupLimit;
    }

    /**
     * Order of checks: honeypot, replay of a stored submission, per-IP limit on successful creates, phone, repricing
     * (non-orderable lines, then the total the customer saw), then the insert. Only a created order counts against the limit.
     */
    public Submitted<OrderView> submit(OrderSubmit in, String ipKey, String clientIp) {
        if (in.website() != null && !in.website().isBlank()) {
            throw SalesErrors.looksAutomated();
        }
        Optional<OrderRow> existing = orders.findBySubmissionId(in.submissionId());
        if (existing.isPresent()) {
            return new Submitted<>(view(existing.get()), false);
        }
        String limitKey = "order:" + ipKey;
        if (limiter.peek(limitKey, WINDOW) >= createLimit) {
            throw rateLimited(limitKey);
        }
        String phoneNorm = PhoneNumbers.normalize(in.phone())
                .orElseThrow(() -> SalesErrors.invalidField("phone", "Số điện thoại không hợp lệ."));
        PricedCart cart = pricing.price(in.lines());
        if (!cart.allOrderable()) {
            throw DomainException.unprocessable(ProblemCode.SKU_NOT_ORDERABLE,
                            "Có sản phẩm không thể đặt hàng trực tuyến (ngừng bán hoặc cần liên hệ báo giá). "
                                    + "Vui lòng kiểm tra lại giỏ hàng.")
                    .withExtension("pricedCart", cart);
        }
        if (cart.total() != in.expectedTotal()) {
            throw DomainException.conflict(ProblemCode.PRICE_CHANGED,
                            "Giá đã thay đổi so với lúc bạn xem. Vui lòng kiểm tra lại giỏ hàng.")
                    .withExtension("pricedCart", cart);
        }
        try {
            OrderRow created = tx.execute(status -> create(in, phoneNorm, cart, clientIp));
            limiter.record(limitKey, WINDOW);
            return new Submitted<>(view(created), true);
        } catch (DataIntegrityViolationException e) {
            // a concurrent request with the same submission id won the unique index: return its order
            return orders.findBySubmissionId(in.submissionId())
                    .map(row -> new Submitted<>(view(row), false))
                    .orElseThrow(() -> e);
        }
    }

    /** Any mismatch of code and phone is the same 404, so the endpoint cannot be used to probe for orders. */
    public OrderView lookup(LookupRequest in, String ipKey) {
        if (!limiter.tryAcquire("lookup:" + ipKey, lookupLimit, WINDOW)) {
            throw rateLimited("lookup:" + ipKey);
        }
        String code = CodeGenerator.normalize(in.code());
        OrderRow row = PhoneNumbers.normalize(in.phone())
                .flatMap(phone -> orders.findByCodeAndPhone(code, phone))
                .orElseThrow(() -> DomainException.notFound(SalesErrors.DETAIL_ORDER_NOT_FOUND));
        return view(row);
    }

    public OrderView view(OrderRow o) {
        List<OrderItemView> items = orders.items(o.id()).stream()
                .map(i -> new OrderItemView(i.skuCode(), i.productName(), i.unitName(), i.conversion(), i.qty(),
                        i.listPrice(), i.unitPrice(), i.lineTotal()))
                .toList();
        boolean bankTransfer = o.paymentMethod() == PaymentMethod.BANK_TRANSFER;
        BankBlock bank = null;
        if (bankTransfer && (o.status() == OrderStatus.PENDING || o.status() == OrderStatus.CONFIRMED)) {
            BankInfo info = settings.bank();
            if (info.accountNo() != null && !info.accountNo().isBlank()) {
                bank = new BankBlock(info.bankName(), info.bin(), info.accountNo(), info.accountName(), o.code());
            }
        }
        Long qrAmount = bankTransfer && o.status() == OrderStatus.CONFIRMED && o.shippingFee() != null ? o.total() : null;
        return new OrderView(o.code(), o.status(), o.paymentMethod(), o.createdAt(), o.customerName(),
                PhoneNumbers.mask(o.phoneNorm()), items, o.subtotal(), o.discountTotal(), o.discountNote(),
                o.shippingFee(), o.total(), bank, qrAmount, o.paidAt());
    }

    private OrderRow create(OrderSubmit in, String phoneNorm, PricedCart cart, String clientIp) {
        String code = codes.generateUnique(CodeGenerator.ORDER_PREFIX, orders::codeExists);
        long id = orders.insert(new NewOrder(code, in.submissionId(), in.customerName().strip(), in.phone().strip(),
                phoneNorm, in.address().strip(), blankToNull(in.note()), in.paymentMethod(), cart.subtotal(),
                cart.discountTotal(), cart.discountNote(), cart.total(), clientIp));
        for (PricedLine line : cart.lines()) {
            orders.insertItem(id, new ItemRow(line.skuId(), line.code(), line.productName(), line.unitName(),
                    line.conversion(), line.qty(), line.listPrice(), line.unitPrice(), line.lineTotal()));
        }
        Map<String, Object> after = new LinkedHashMap<>();
        after.put("code", code);
        after.put("status", OrderStatus.PENDING.name());
        after.put("paymentMethod", in.paymentMethod().name());
        after.put("total", cart.total());
        audit.recordAs(AuditActor.system(CUSTOMER_ACTOR), "ORDER_CREATED", "ORDER", id, null, after);
        events.publishEvent(new OrderCreated(code, in.customerName().strip(), cart.total(), in.paymentMethod().name()));
        return orders.findById(id).orElseThrow();
    }

    private DomainException rateLimited(String key) {
        Duration remaining = limiter.remaining(key);
        return DomainException.tooManyRequests(Problems.DETAIL_RATE_LIMITED, remaining.isZero() ? WINDOW : remaining);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
