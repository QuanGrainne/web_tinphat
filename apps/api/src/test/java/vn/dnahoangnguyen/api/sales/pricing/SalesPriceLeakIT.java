package vn.dnahoangnguyen.api.sales.pricing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import vn.dnahoangnguyen.api.sales.SalesIntegrationTest;

/** A SKU whose price is hidden must never leak its price through any sales response. */
class SalesPriceLeakIT extends SalesIntegrationTest {

    private static final long SECRET_PRICE = 777_777;

    @Test
    void cartPriceCarriesNullPriceFieldsForAHiddenSku() throws Exception {
        long visible = createSku(10_000L, true);
        long hidden = createSku(SECRET_PRICE, false);
        String body = postPublic("/api/public/cart/price", Map.of("lines", List.of(line(visible, 2), line(hidden, 3))),
                randomIp())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.subtotal").value(20_000))
                .andExpect(jsonPath("$.total").value(20_000))
                .andExpect(jsonPath("$.hasContactLines").value(true))
                .andExpect(jsonPath("$.lines[1].priceVisible").value(false))
                .andExpect(jsonPath("$.lines[1].orderable").value(false))
                .andExpect(jsonPath("$.lines[1].listPrice").value((Object) null))
                .andExpect(jsonPath("$.lines[1].unitPrice").value((Object) null))
                .andExpect(jsonPath("$.lines[1].lineTotal").value((Object) null))
                .andReturn().getResponse().getContentAsString();
        assertThat(body).doesNotContain(Long.toString(SECRET_PRICE)).doesNotContain("2333331");
    }

    @Test
    void priceChangedBodyAndOrderRejectionNeverContainTheHiddenPrice() throws Exception {
        long visible = createSku(10_000L, true);
        long hidden = createSku(SECRET_PRICE, false);

        String notOrderable = postPublic("/api/public/orders",
                orderBody(UUID.randomUUID(), "COD", 20_000, List.of(line(visible, 2), line(hidden, 1))), randomIp())
                .andExpect(status().isUnprocessableEntity())
                .andReturn().getResponse().getContentAsString();
        assertThat(notOrderable).doesNotContain(Long.toString(SECRET_PRICE));

        String changed = postPublic("/api/public/orders",
                orderBody(UUID.randomUUID(), "COD", 1, List.of(line(visible, 2))), randomIp())
                .andExpect(status().isConflict())
                .andReturn().getResponse().getContentAsString();
        assertThat(changed).doesNotContain(Long.toString(SECRET_PRICE));
    }

    @Test
    void quoteViewKeepsTheHiddenLineUnpriced() throws Exception {
        long hidden = createSku(SECRET_PRICE, false);
        Map<String, Object> body = new java.util.LinkedHashMap<>();
        body.put("submissionId", UUID.randomUUID().toString());
        body.put("customerName", "Khách báo giá");
        body.put("phone", "0912345678");
        body.put("lines", List.of(line(hidden, 1)));
        String response = postPublic("/api/public/quotes", body, randomIp())
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.subtotal").value(0))
                .andExpect(jsonPath("$.hasContactLines").value(true))
                .andExpect(jsonPath("$.lines[0].unitPrice").value((Object) null))
                .andReturn().getResponse().getContentAsString();
        assertThat(response).doesNotContain(Long.toString(SECRET_PRICE));
        Long stored = jdbc.queryForObject("select count(*) from quote_item where unit_price is not null and sku_id = ?",
                Long.class, hidden);
        assertThat(stored).isZero();
    }

    @Test
    void unpublishedAndMissingSkusAreMarkedUnavailable() throws Exception {
        long unpublishedProduct = createProduct(false, "ACTIVE");
        long sku = createSku(unpublishedProduct, 10_000L, true, null, true);
        postPublic("/api/public/cart/price", Map.of("lines", List.of(line(sku, 1), line(999_999_999L, 1))), randomIp())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lines[0].unavailable").value(true))
                .andExpect(jsonPath("$.lines[1].unavailable").value(true))
                .andExpect(jsonPath("$.subtotal").value(0));
    }
}
