package vn.dnahoangnguyen.api.sales.quote;

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
import vn.dnahoangnguyen.api.sales.SalesDtos.QuoteSubmit;
import vn.dnahoangnguyen.api.sales.SalesDtos.QuoteView;
import vn.dnahoangnguyen.api.sales.SalesDtos.Submitted;
import vn.dnahoangnguyen.api.sales.SalesErrors;
import vn.dnahoangnguyen.api.sales.notify.SalesEvents.QuoteCreated;
import vn.dnahoangnguyen.api.sales.pricing.OrderPricingService;
import vn.dnahoangnguyen.api.sales.pricing.PricedCart;
import vn.dnahoangnguyen.api.sales.pricing.PricedLine;
import vn.dnahoangnguyen.api.sales.quote.QuoteRepository.ItemRow;
import vn.dnahoangnguyen.api.sales.quote.QuoteRepository.NewQuote;
import vn.dnahoangnguyen.api.sales.quote.QuoteRepository.QuoteRow;

/** Public side of quote requests: submit (idempotent, rate limited, repriced). Hidden-price lines are kept unpriced. */
@Service
public class QuoteService {

    private static final Duration WINDOW = Duration.ofMinutes(10);
    private static final String CUSTOMER_ACTOR = "CUSTOMER";

    private final QuoteRepository quotes;
    private final OrderPricingService pricing;
    private final CodeGenerator codes;
    private final AuditService audit;
    private final FixedWindowRateLimiter limiter;
    private final ApplicationEventPublisher events;
    private final TransactionTemplate tx;
    private final int createLimit;

    public QuoteService(QuoteRepository quotes, OrderPricingService pricing, CodeGenerator codes, AuditService audit,
                        FixedWindowRateLimiter limiter, ApplicationEventPublisher events,
                        PlatformTransactionManager transactionManager,
                        @Value("${dna.sales.quote-limit:5}") int createLimit) {
        this.quotes = quotes;
        this.pricing = pricing;
        this.codes = codes;
        this.audit = audit;
        this.limiter = limiter;
        this.events = events;
        this.tx = new TransactionTemplate(transactionManager);
        this.createLimit = createLimit;
    }

    public Submitted<QuoteView> submit(QuoteSubmit in, String ipKey, String clientIp) {
        if (in.website() != null && !in.website().isBlank()) {
            throw SalesErrors.looksAutomated();
        }
        Optional<QuoteRow> existing = quotes.findBySubmissionId(in.submissionId());
        if (existing.isPresent()) {
            return new Submitted<>(view(existing.get()), false);
        }
        String limitKey = "quote:" + ipKey;
        if (limiter.peek(limitKey, WINDOW) >= createLimit) {
            Duration remaining = limiter.remaining(limitKey);
            throw DomainException.tooManyRequests(Problems.DETAIL_RATE_LIMITED,
                    remaining.isZero() ? WINDOW : remaining);
        }
        String phoneNorm = PhoneNumbers.normalize(in.phone())
                .orElseThrow(() -> SalesErrors.invalidField("phone", "Số điện thoại không hợp lệ."));
        PricedCart cart = pricing.price(in.lines());
        if (cart.lines().stream().anyMatch(PricedLine::unavailable)) {
            throw DomainException.unprocessable(ProblemCode.SKU_NOT_ORDERABLE,
                            "Có sản phẩm không còn được bán. Vui lòng kiểm tra lại giỏ báo giá.")
                    .withExtension("pricedCart", cart);
        }
        try {
            QuoteRow created = tx.execute(status -> create(in, phoneNorm, cart, clientIp));
            limiter.record(limitKey, WINDOW);
            return new Submitted<>(view(created), true);
        } catch (DataIntegrityViolationException e) {
            return quotes.findBySubmissionId(in.submissionId())
                    .map(row -> new Submitted<>(view(row), false))
                    .orElseThrow(() -> e);
        }
    }

    public QuoteView view(QuoteRow q) {
        List<PricedLine> lines = quotes.items(q.id()).stream().map(QuoteService::line).toList();
        return new QuoteView(q.code(), q.status(), q.createdAt(), q.customerName(), lines, q.subtotal(),
                q.hasContactLines());
    }

    /** A stored line as a priced line; the list price is not stored on quotes, so it equals the unit price. */
    private static PricedLine line(ItemRow i) {
        boolean priced = i.unitPrice() != null;
        return new PricedLine(i.skuId(), false, i.skuCode(), i.productName(), i.productSlug(), i.unitName(),
                i.conversion(), i.qty(), priced, priced, i.unitPrice(), i.unitPrice(), i.lineTotal());
    }

    private QuoteRow create(QuoteSubmit in, String phoneNorm, PricedCart cart, String clientIp) {
        String code = codes.generateUnique(CodeGenerator.QUOTE_PREFIX, quotes::codeExists);
        long id = quotes.insert(new NewQuote(code, in.submissionId(), in.customerName().strip(), in.phone().strip(),
                phoneNorm, blankToNull(in.email()), blankToNull(in.company()), blankToNull(in.taxCode()),
                blankToNull(in.note()), cart.subtotal(), cart.hasContactLines(), clientIp));
        for (PricedLine line : cart.lines()) {
            quotes.insertItem(id, line.skuId(), line.code(), line.productName(), line.unitName(), line.conversion(),
                    line.qty(), line.unitPrice(), line.lineTotal());
        }
        Map<String, Object> after = new LinkedHashMap<>();
        after.put("code", code);
        after.put("status", QuoteStatus.NEW.name());
        after.put("subtotal", cart.subtotal());
        audit.recordAs(AuditActor.system(CUSTOMER_ACTOR), "QUOTE_CREATED", "QUOTE", id, null, after);
        events.publishEvent(new QuoteCreated(code, in.customerName().strip(), cart.hasContactLines()));
        return quotes.findById(id).orElseThrow();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
