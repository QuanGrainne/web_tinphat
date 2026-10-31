package vn.dnahoangnguyen.api.sales;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.dnahoangnguyen.api.common.ratelimit.ClientIpResolver;
import vn.dnahoangnguyen.api.sales.SalesDtos.CartPriceRequest;
import vn.dnahoangnguyen.api.sales.SalesDtos.LookupRequest;
import vn.dnahoangnguyen.api.sales.SalesDtos.OrderSubmit;
import vn.dnahoangnguyen.api.sales.SalesDtos.OrderView;
import vn.dnahoangnguyen.api.sales.SalesDtos.QuoteSubmit;
import vn.dnahoangnguyen.api.sales.SalesDtos.QuoteView;
import vn.dnahoangnguyen.api.sales.SalesDtos.Submitted;
import vn.dnahoangnguyen.api.sales.order.OrderService;
import vn.dnahoangnguyen.api.sales.pricing.OrderPricingService;
import vn.dnahoangnguyen.api.sales.pricing.PricedCart;
import vn.dnahoangnguyen.api.sales.quote.QuoteService;

/** Anonymous, CSRF-exempt sales endpoints. Responses with customer data are never cached. */
@RestController
@RequestMapping("/api/public")
public class PublicSalesController {

    private final OrderPricingService pricing;
    private final QuoteService quotes;
    private final OrderService orders;
    private final ClientIpResolver clientIp;

    public PublicSalesController(OrderPricingService pricing, QuoteService quotes, OrderService orders,
                                 ClientIpResolver clientIp) {
        this.pricing = pricing;
        this.quotes = quotes;
        this.orders = orders;
        this.clientIp = clientIp;
    }

    @PostMapping("/cart/price")
    public PricedCart price(@Valid @RequestBody CartPriceRequest body) {
        return pricing.price(body.lines());
    }

    @PostMapping("/quotes")
    public ResponseEntity<QuoteView> submitQuote(@Valid @RequestBody QuoteSubmit body, HttpServletRequest request) {
        Submitted<QuoteView> result = quotes.submit(body, clientIp.ipKey(request), clientIp.clientIp(request));
        return noStore(result.created() ? HttpStatus.CREATED : HttpStatus.OK).body(result.view());
    }

    @PostMapping("/orders")
    public ResponseEntity<OrderView> submitOrder(@Valid @RequestBody OrderSubmit body, HttpServletRequest request) {
        Submitted<OrderView> result = orders.submit(body, clientIp.ipKey(request), clientIp.clientIp(request));
        return noStore(result.created() ? HttpStatus.CREATED : HttpStatus.OK).body(result.view());
    }

    @PostMapping("/orders/lookup")
    public ResponseEntity<OrderView> lookup(@Valid @RequestBody LookupRequest body, HttpServletRequest request) {
        return noStore(HttpStatus.OK).body(orders.lookup(body, clientIp.ipKey(request)));
    }

    private static ResponseEntity.BodyBuilder noStore(HttpStatus status) {
        return ResponseEntity.status(status).cacheControl(CacheControl.noStore());
    }
}
