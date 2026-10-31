package vn.dnahoangnguyen.api.sales.bank;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;
import vn.dnahoangnguyen.api.sales.SalesIntegrationTest;

class SepayWebhookIT extends SalesIntegrationTest {

    private static final AtomicLong VENDOR_IDS = new AtomicLong(System.currentTimeMillis());

    @BeforeEach
    void configureBankAccount() {
        jdbc.update("""
                update app_setting set value = '{"bankName":"MB Bank","bin":"970422","accountNo":"0123456789","accountName":"CONG TY DNA"}'::jsonb
                where key = 'bank'
                """);
    }

    private ResultActions webhook(String authorization, Map<String, Object> body) throws Exception {
        var request = post("/api/webhooks/bank/sepay").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(body));
        if (authorization != null) {
            request = request.header("Authorization", authorization);
        }
        return mvc.perform(request);
    }

    private static Map<String, Object> notification(long id, String content, long amount, String type, String account) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", id);
        body.put("gateway", "MBBank");
        body.put("transactionDate", "2026-10-31 14:02:37");
        body.put("accountNumber", account);
        body.put("code", null);
        body.put("content", content);
        body.put("transferType", type);
        body.put("transferAmount", amount);
        body.put("accumulated", 0);
        body.put("referenceCode", "FT" + id);
        return body;
    }

    /** A BANK_TRANSFER order that staff already confirmed (amount frozen, QR visible). */
    private String confirmedBankOrder(long price) throws Exception {
        long sku = createSku(price, true);
        String code = placeOrder("BANK_TRANSFER", sku, 1, price, randomIp()).get("code").asText();
        jdbc.update("update customer_order set status = 'CONFIRMED', shipping_fee = 0 where code = ?", code);
        return code;
    }

    private long rows(long vendorId) {
        return jdbc.queryForObject("select count(*) from bank_transaction where vendor_tx_id = ?", Long.class,
                Long.toString(vendorId));
    }

    @Test
    void missingOrWrongKeyIsRejectedAndNothingIsStored() throws Exception {
        long id = VENDOR_IDS.incrementAndGet();
        Map<String, Object> body = notification(id, "DNA7K2M9Q", 1_000, "in", BANK_ACCOUNT);
        webhook(null, body).andExpect(status().isUnauthorized());
        webhook("Apikey wrong-key", body).andExpect(status().isUnauthorized());
        webhook("Bearer key-one", body).andExpect(status().isUnauthorized());
        assertThat(rows(id)).isZero();
    }

    @Test
    void exactMatchPaysTheOrderOnceAndAReplayChangesNothing() throws Exception {
        String code = confirmedBankOrder(93_000);
        long id = VENDOR_IDS.incrementAndGet();
        String content = "NGUYEN VAN A chuyen khoan " + code.toLowerCase();

        webhook("Apikey key-one", notification(id, content, 93_000, "in", BANK_ACCOUNT))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        Map<String, Object> order = jdbc.queryForMap(
                "select id, status, paid_via, paid_amount, paid_by from customer_order where code = ?", code);
        assertThat(order.get("status")).isEqualTo("PAID");
        assertThat(order.get("paid_via")).isEqualTo("BANK_WEBHOOK");
        assertThat(((Number) order.get("paid_amount")).longValue()).isEqualTo(93_000L);
        assertThat(order.get("paid_by")).isNull();
        long orderId = ((Number) order.get("id")).longValue();
        assertThat(jdbc.queryForObject("select status from bank_transaction where vendor_tx_id = ?", String.class,
                Long.toString(id))).isEqualTo("MATCHED");

        Map<String, Object> audit = jdbc.queryForMap("""
                select actor_name, actor_id, before ->> 'status' as from_status, after ->> 'status' as to_status
                from audit_log where entity_type = 'ORDER' and entity_id = ? and action = 'ORDER_STATUS'
                """, orderId);
        assertThat(audit.get("actor_name")).isEqualTo("BANK_WEBHOOK");
        assertThat(audit.get("actor_id")).isNull();
        assertThat(audit.get("from_status")).isEqualTo("CONFIRMED");
        assertThat(audit.get("to_status")).isEqualTo("PAID");

        webhook("Apikey key-two", notification(id, content, 93_000, "in", BANK_ACCOUNT))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
        assertThat(rows(id)).isEqualTo(1);
        assertThat(jdbc.queryForObject(
                "select count(*) from audit_log where entity_type = 'ORDER' and entity_id = ? and action = 'ORDER_STATUS'",
                Long.class, orderId)).isEqualTo(1L);
    }

    @Test
    void amountMismatchGoesToReviewAndLeavesTheOrderAlone() throws Exception {
        String code = confirmedBankOrder(93_000);
        long id = VENDOR_IDS.incrementAndGet();
        webhook("Apikey key-one", notification(id, code, 92_999, "in", BANK_ACCOUNT)).andExpect(status().isOk());

        Map<String, Object> tx = jdbc.queryForMap(
                "select status, review_reason from bank_transaction where vendor_tx_id = ?", Long.toString(id));
        assertThat(tx.get("status")).isEqualTo("REVIEW");
        assertThat(tx.get("review_reason")).isEqualTo("AMOUNT_MISMATCH");
        assertThat(jdbc.queryForObject("select status from customer_order where code = ?", String.class, code))
                .isEqualTo("CONFIRMED");
    }

    @Test
    void unknownCodeWrongAccountAndOutgoingTransfers() throws Exception {
        long unknown = VENDOR_IDS.incrementAndGet();
        webhook("Apikey key-one", notification(unknown, "DNAZZZZZZ", 5_000, "in", BANK_ACCOUNT)).andExpect(status().isOk());
        assertThat(reason(unknown)).isEqualTo("UNKNOWN_CODE");

        long none = VENDOR_IDS.incrementAndGet();
        webhook("Apikey key-one", notification(none, "Tien an trua", 5_000, "in", BANK_ACCOUNT)).andExpect(status().isOk());
        assertThat(reason(none)).isEqualTo("NO_CODE");

        String code = confirmedBankOrder(10_000);
        long elsewhere = VENDOR_IDS.incrementAndGet();
        webhook("Apikey key-one", notification(elsewhere, code, 10_000, "in", "9999999999")).andExpect(status().isOk());
        assertThat(reason(elsewhere)).isEqualTo("WRONG_ACCOUNT");

        long out = VENDOR_IDS.incrementAndGet();
        webhook("Apikey key-one", notification(out, "Tra tien nha cung cap", 7_000, "out", BANK_ACCOUNT)).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("select status from bank_transaction where vendor_tx_id = ?", String.class,
                Long.toString(out))).isEqualTo("IGNORED");
        assertThat(jdbc.queryForObject("select status from customer_order where code = ?", String.class, code))
                .isEqualTo("CONFIRMED");
    }

    @Test
    void malformedBodyIsRejectedWithoutStoring() throws Exception {
        mvc.perform(post("/api/webhooks/bank/sepay").header("Authorization", "Apikey key-one")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"id\": 1"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/webhooks/bank/sepay").header("Authorization", "Apikey key-one")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"transferType\":\"in\"}"))
                .andExpect(status().isBadRequest());
    }

    private String reason(long vendorId) {
        return jdbc.queryForObject("select review_reason from bank_transaction where vendor_tx_id = ?", String.class,
                Long.toString(vendorId));
    }
}
