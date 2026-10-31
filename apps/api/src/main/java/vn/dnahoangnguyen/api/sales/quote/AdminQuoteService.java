package vn.dnahoangnguyen.api.sales.quote;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.dnahoangnguyen.api.admin.audit.AuditService;
import vn.dnahoangnguyen.api.common.error.DomainException;
import vn.dnahoangnguyen.api.sales.admin.AdminDtos.AdminQuote;
import vn.dnahoangnguyen.api.sales.admin.AdminDtos.AdminQuoteLine;
import vn.dnahoangnguyen.api.sales.admin.AdminDtos.AllowedQuoteTransition;
import vn.dnahoangnguyen.api.sales.admin.AdminDtos.QuoteTransition;
import vn.dnahoangnguyen.api.sales.admin.HistoryReader;
import vn.dnahoangnguyen.api.sales.quote.QuoteRepository.QuoteRow;

/** Staff side of quote requests: detail view and status transitions. */
@Service
public class AdminQuoteService {

    private static final String AUDIT_ENTITY = "QUOTE";

    private final QuoteRepository quotes;
    private final AuditService audit;
    private final HistoryReader history;

    public AdminQuoteService(QuoteRepository quotes, AuditService audit, HistoryReader history) {
        this.quotes = quotes;
        this.audit = audit;
        this.history = history;
    }

    @Transactional(readOnly = true)
    public AdminQuote get(long id) {
        return detail(quotes.findById(id).orElseThrow(AdminQuoteService::notFound));
    }

    @Transactional
    public AdminQuote transition(long id, QuoteTransition body) {
        QuoteRow row = quotes.lockById(id).orElseThrow(AdminQuoteService::notFound);
        QuoteStatusMachine.validate(row.status(), body.to());
        quotes.updateStatus(id, body.to());
        Map<String, Object> after = new LinkedHashMap<>();
        after.put("status", body.to().name());
        if (body.note() != null && !body.note().isBlank()) {
            after.put("note", body.note().strip());
        }
        audit.record("QUOTE_STATUS", AUDIT_ENTITY, id, Map.of("status", row.status().name()), after);
        return detail(quotes.findById(id).orElseThrow());
    }

    private AdminQuote detail(QuoteRow q) {
        List<AdminQuoteLine> lines = quotes.items(q.id()).stream()
                .map(i -> new AdminQuoteLine(i.skuCode(), i.productName(), i.unitName(), i.conversion(), i.qty(),
                        i.unitPrice(), i.lineTotal()))
                .toList();
        List<AllowedQuoteTransition> allowed = QuoteStatusMachine.allowed(q.status()).stream()
                .map(AllowedQuoteTransition::new).toList();
        return new AdminQuote(q.id(), q.code(), q.status(), q.createdAt(), q.customerName(), q.phone(), q.email(),
                q.company(), q.taxCode(), q.note(), q.internalNote(), lines, q.subtotal(), q.hasContactLines(),
                allowed, history.read(AUDIT_ENTITY, q.id()));
    }

    private static DomainException notFound() {
        return DomainException.notFound("Không tìm thấy yêu cầu báo giá.");
    }
}
