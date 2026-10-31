package vn.dnahoangnguyen.api.sales;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import vn.dnahoangnguyen.api.support.IntegrationTest;

/** Full application with MockMvc, the SePay endpoint enabled and helpers to create catalogue rows by JDBC. */
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "dna.sepay.enabled=true",
        "dna.sepay.webhook-keys=key-one,key-two",
        "dna.sepay.account-no=0123456789"
})
public abstract class SalesIntegrationTest extends IntegrationTest {

    protected static final String BANK_ACCOUNT = "0123456789";

    private static final AtomicLong SEQUENCE = new AtomicLong(System.nanoTime() % 1_000_000);

    @Autowired
    protected MockMvc mvc;

    @Autowired
    protected JdbcTemplate jdbc;

    @Autowired
    protected ObjectMapper mapper;

    protected static String unique(String prefix) {
        return prefix + SEQUENCE.incrementAndGet();
    }

    /** A fresh client address so rate limits of one test never affect another. */
    protected static String randomIp() {
        ThreadLocalRandom r = ThreadLocalRandom.current();
        return "10." + r.nextInt(1, 250) + "." + r.nextInt(1, 250) + "." + r.nextInt(1, 250);
    }

    protected long createProduct(boolean published, String status) {
        String slug = unique("san-pham-");
        return jdbc.queryForObject(
                "insert into product (name, slug, published, status) values (?, ?, ?, ?) returning id",
                Long.class, "Sản phẩm " + slug, slug, published, status);
    }

    /** Base unit SKU of a fresh active, published product. */
    protected long createSku(Long price, boolean priceVisible) {
        return createSku(createProduct(true, "ACTIVE"), price, priceVisible, null, true);
    }

    protected long createSku(long productId, Long price, boolean priceVisible, Long promoPrice, boolean visible) {
        String code = unique("SKU").toUpperCase();
        return jdbc.queryForObject("""
                insert into sku (product_id, code, code_key, unit_name, conversion, is_base, price, price_visible,
                                 promo_price, visible)
                values (?, ?, ?, 'Cái', 1, true, ?, ?, ?, ?) returning id
                """, Long.class, productId, code, code.toLowerCase(), price, priceVisible, promoPrice, visible);
    }

    protected static Map<String, Object> line(long skuId, int qty) {
        return Map.of("skuId", skuId, "qty", qty);
    }

    protected Map<String, Object> orderBody(UUID submissionId, String payment, long expectedTotal,
                                            List<Map<String, Object>> lines) {
        Map<String, Object> body = new java.util.LinkedHashMap<>();
        body.put("submissionId", submissionId.toString());
        body.put("customerName", "Nguyễn Văn A");
        body.put("phone", "0912 345 678");
        body.put("address", "12 Đường Hòa Bình, Phú Thọ");
        body.put("paymentMethod", payment);
        body.put("expectedTotal", expectedTotal);
        body.put("lines", lines);
        return body;
    }

    protected ResultActions postPublic(String path, Object body, String ip) throws Exception {
        return mvc.perform(post(path).header("CF-Connecting-IP", ip).contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(body)));
    }

    protected JsonNode json(ResultActions result) throws Exception {
        return mapper.readTree(result.andReturn().getResponse().getContentAsString());
    }

    /** Places a BANK_TRANSFER or COD order for one SKU and returns the created OrderView. */
    protected JsonNode placeOrder(String payment, long skuId, int qty, long expectedTotal, String ip) throws Exception {
        ResultActions result = postPublic("/api/public/orders",
                orderBody(UUID.randomUUID(), payment, expectedTotal, List.of(line(skuId, qty))), ip);
        return json(result);
    }
}
