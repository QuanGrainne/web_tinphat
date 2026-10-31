package vn.dnahoangnguyen.api.sales.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import vn.dnahoangnguyen.api.sales.SalesIntegrationTest;

class OrderSubmitIT extends SalesIntegrationTest {

    @Test
    void tamperedExpectedTotalIsRejectedWithTheRepricedCart() throws Exception {
        long sku = createSku(31_000L, true);
        postPublic("/api/public/orders", orderBody(UUID.randomUUID(), "COD", 1, List.of(line(sku, 3))), randomIp())
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("PRICE_CHANGED"))
                .andExpect(jsonPath("$.pricedCart.total").value(93_000))
                .andExpect(jsonPath("$.pricedCart.lines[0].unitPrice").value(31_000))
                .andExpect(jsonPath("$.pricedCart.lines[0].orderable").value(true));
    }

    @Test
    void validOrderSnapshotsPricesAndLaterPriceChangesDoNotAlterIt() throws Exception {
        long product = createProduct(true, "ACTIVE");
        long sku = createSku(product, 31_000L, true, 28_000L, true);
        JsonNode order = json(postPublic("/api/public/orders",
                orderBody(UUID.randomUUID(), "BANK_TRANSFER", 84_000, List.of(line(sku, 3))), randomIp())
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.phoneMasked").value("0912 *** 678"))
                .andExpect(jsonPath("$.shippingFee").value((Object) null))
                .andExpect(jsonPath("$.qrAmount").value((Object) null))
                .andExpect(jsonPath("$.address").doesNotExist()));
        String code = order.get("code").asText();
        assertThat(code).matches("^DNA[0-9A-HJKMNP-TV-Z]{6}$");
        assertThat(order.get("createdAt").asText()).matches("\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}.*\\+07:00");
        assertThat(order.get("subtotal").asLong()).isEqualTo(84_000);
        assertThat(order.get("total").asLong()).isEqualTo(84_000);
        JsonNode item = order.get("items").get(0);
        assertThat(item.get("listPrice").asLong()).isEqualTo(31_000);
        assertThat(item.get("unitPrice").asLong()).isEqualTo(28_000);
        assertThat(item.get("lineTotal").asLong()).isEqualTo(84_000);

        jdbc.update("update sku set price = 99000, promo_price = null where id = ?", sku);
        Long stored = jdbc.queryForObject("""
                select oi.unit_price from order_item oi join customer_order o on o.id = oi.order_id where o.code = ?
                """, Long.class, code);
        assertThat(stored).isEqualTo(28_000L);
        Long total = jdbc.queryForObject("select total from customer_order where code = ?", Long.class, code);
        assertThat(total).isEqualTo(84_000L);
    }

    @Test
    void sameSubmissionIdTwiceCreatesOneOrder() throws Exception {
        long sku = createSku(10_000L, true);
        UUID submission = UUID.randomUUID();
        Map<String, Object> body = orderBody(submission, "COD", 20_000, List.of(line(sku, 2)));
        String ip = randomIp();
        String first = json(postPublic("/api/public/orders", body, ip).andExpect(status().isCreated())).get("code").asText();
        String second = json(postPublic("/api/public/orders", body, ip).andExpect(status().isOk())).get("code").asText();
        assertThat(second).isEqualTo(first);
        Integer rows = jdbc.queryForObject("select count(*) from customer_order where submission_id = ?::uuid",
                Integer.class, submission.toString());
        assertThat(rows).isEqualTo(1);
    }

    @Test
    void concurrentSubmitsOfTheSameSubmissionIdCreateExactlyOneOrder() throws Exception {
        long sku = createSku(10_000L, true);
        UUID submission = UUID.randomUUID();
        Map<String, Object> body = orderBody(submission, "COD", 10_000, List.of(line(sku, 1)));
        String ip = randomIp();
        java.util.concurrent.ExecutorService pool = java.util.concurrent.Executors.newFixedThreadPool(6);
        try {
            List<java.util.concurrent.Future<String>> calls = new java.util.ArrayList<>();
            java.util.concurrent.CountDownLatch start = new java.util.concurrent.CountDownLatch(1);
            for (int i = 0; i < 6; i++) {
                calls.add(pool.submit(() -> {
                    start.await();
                    var response = postPublic("/api/public/orders", body, ip).andReturn().getResponse();
                    return response.getStatus() + ":" + mapper.readTree(response.getContentAsString()).get("code").asText();
                }));
            }
            start.countDown();
            java.util.Set<String> codes = new java.util.HashSet<>();
            for (var call : calls) {
                String[] result = call.get().split(":");
                assertThat(result[0]).isIn("200", "201");
                codes.add(result[1]);
            }
            assertThat(codes).hasSize(1);
        } finally {
            pool.shutdownNow();
        }
        Integer rows = jdbc.queryForObject("select count(*) from customer_order where submission_id = ?::uuid",
                Integer.class, submission.toString());
        assertThat(rows).isEqualTo(1);
    }

    @Test
    void honeypotIsRejectedAsValidationFailure() throws Exception {
        long sku = createSku(10_000L, true);
        Map<String, Object> body = new java.util.LinkedHashMap<>(
                orderBody(UUID.randomUUID(), "COD", 10_000, List.of(line(sku, 1))));
        body.put("website", "http://spam.example");
        postPublic("/api/public/orders", body, randomIp())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    @Test
    void hiddenPriceLineCannotBeOrdered() throws Exception {
        long visible = createSku(10_000L, true);
        long hidden = createSku(50_000L, false);
        postPublic("/api/public/orders",
                orderBody(UUID.randomUUID(), "COD", 10_000, List.of(line(visible, 1), line(hidden, 1))), randomIp())
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("SKU_NOT_ORDERABLE"));
    }

    @Test
    void sixthSuccessfulOrderFromOneAddressIsRateLimited() throws Exception {
        long sku = createSku(10_000L, true);
        String ip = randomIp();
        for (int i = 0; i < 5; i++) {
            postPublic("/api/public/orders", orderBody(UUID.randomUUID(), "COD", 10_000, List.of(line(sku, 1))), ip)
                    .andExpect(status().isCreated());
        }
        postPublic("/api/public/orders", orderBody(UUID.randomUUID(), "COD", 10_000, List.of(line(sku, 1))), ip)
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("RATE_LIMITED"));
    }

    @Test
    void invalidPhoneAndQuantityAreValidationFailures() throws Exception {
        long sku = createSku(10_000L, true);
        Map<String, Object> badPhone = new java.util.LinkedHashMap<>(
                orderBody(UUID.randomUUID(), "COD", 10_000, List.of(line(sku, 1))));
        badPhone.put("phone", "12345");
        postPublic("/api/public/orders", badPhone, randomIp()).andExpect(status().isBadRequest());
        postPublic("/api/public/orders", orderBody(UUID.randomUUID(), "COD", 0, List.of(line(sku, 0))), randomIp())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
        postPublic("/api/public/orders", orderBody(UUID.randomUUID(), "COD", 0, List.of(line(sku, 10_000))), randomIp())
                .andExpect(status().isBadRequest());
    }
}
