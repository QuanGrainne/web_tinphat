package vn.dnahoangnguyen.api.sales.admin;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.dnahoangnguyen.api.common.error.DomainException;
import vn.dnahoangnguyen.api.common.security.CurrentUser;
import vn.dnahoangnguyen.api.sales.admin.AdminDtos.AdminOrder;
import vn.dnahoangnguyen.api.sales.admin.AdminDtos.AdminQuote;
import vn.dnahoangnguyen.api.sales.admin.AdminDtos.InternalNoteRequest;
import vn.dnahoangnguyen.api.sales.admin.AdminDtos.OrderTransition;
import vn.dnahoangnguyen.api.sales.admin.AdminDtos.QuoteTransition;
import vn.dnahoangnguyen.api.sales.admin.AdminDtos.RequestCounters;
import vn.dnahoangnguyen.api.sales.admin.AdminDtos.RequestList;
import vn.dnahoangnguyen.api.sales.order.AdminOrderService;
import vn.dnahoangnguyen.api.sales.order.OrderRepository;
import vn.dnahoangnguyen.api.sales.quote.AdminQuoteService;
import vn.dnahoangnguyen.api.sales.quote.QuoteRepository;

/** Quote and order queue for signed-in staff (session and CSRF are enforced by the security chain). */
@RestController
@RequestMapping("/api/admin")
public class AdminRequestController {

    private final RequestQueryService queries;
    private final AdminOrderService orderService;
    private final AdminQuoteService quoteService;
    private final OrderRepository orders;
    private final QuoteRepository quotes;

    public AdminRequestController(RequestQueryService queries, AdminOrderService orderService,
                                  AdminQuoteService quoteService, OrderRepository orders, QuoteRepository quotes) {
        this.queries = queries;
        this.orderService = orderService;
        this.quoteService = quoteService;
        this.orders = orders;
        this.quotes = quotes;
    }

    @GetMapping("/requests")
    public RequestList list(@RequestParam(required = false) String kind,
                            @RequestParam(required = false) String status,
                            @RequestParam(required = false) String payment,
                            @RequestParam(required = false) String q,
                            @RequestParam(required = false) Boolean awaitingKiotViet,
                            @RequestParam(defaultValue = "1") int page,
                            @RequestParam(defaultValue = "30") int size) {
        return queries.list(kind, status, payment, q, awaitingKiotViet, page, size);
    }

    @GetMapping("/requests/counters")
    public RequestCounters counters() {
        return queries.counters();
    }

    @GetMapping("/orders/{id}")
    public AdminOrder order(@PathVariable long id) {
        return orderService.get(id, user());
    }

    @GetMapping("/quotes/{id}")
    public AdminQuote quote(@PathVariable long id) {
        return quoteService.get(id);
    }

    @PostMapping("/orders/{id}/transition")
    public AdminOrder transitionOrder(@PathVariable long id, @Valid @RequestBody OrderTransition body) {
        return orderService.transition(id, body, user());
    }

    @PostMapping("/quotes/{id}/transition")
    public AdminQuote transitionQuote(@PathVariable long id, @Valid @RequestBody QuoteTransition body) {
        return quoteService.transition(id, body);
    }

    @PutMapping("/requests/{kind}/{id}/internal-note")
    @Transactional
    public ResponseEntity<Void> internalNote(@PathVariable String kind, @PathVariable long id,
                                             @Valid @RequestBody InternalNoteRequest body) {
        String note = body.internalNote() == null || body.internalNote().isBlank() ? null : body.internalNote().strip();
        int updated = switch (kind) {
            case "orders" -> orders.updateInternalNote(id, note);
            case "quotes" -> quotes.updateInternalNote(id, note);
            default -> throw DomainException.notFound("Không tìm thấy dữ liệu yêu cầu.");
        };
        if (updated == 0) {
            throw DomainException.notFound("Không tìm thấy yêu cầu.");
        }
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }

    private static CurrentUser user() {
        return CurrentUser.current().orElseThrow(() -> new AccessDeniedException("Not signed in"));
    }
}
