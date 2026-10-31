package vn.dnahoangnguyen.api.sales.bank;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.ResultActions;
import vn.dnahoangnguyen.api.admin.user.AppUser;
import vn.dnahoangnguyen.api.admin.user.AppUserRepository;
import vn.dnahoangnguyen.api.admin.user.Role;
import vn.dnahoangnguyen.api.sales.SalesIntegrationTest;
import vn.dnahoangnguyen.api.support.AdminLogin;
import vn.dnahoangnguyen.api.support.TestAuth;

class BankTransactionAdminIT extends SalesIntegrationTest {

    private static final AtomicLong VENDOR_IDS = new AtomicLong(System.currentTimeMillis() + 5_000_000);

    @Autowired
    AppUserRepository users;

    @Autowired
    PasswordEncoder encoder;

    AppUser manager;
    AppUser editor;

    @BeforeEach
    void setUp() {
        manager = TestAuth.createUser(users, encoder, unique("manager"), "secret-pass-1", Role.MANAGER);
        editor = TestAuth.createUser(users, encoder, unique("editor"), "secret-pass-1", Role.EDITOR);
        jdbc.update("""
                update app_setting set value = '{"bankName":"MB Bank","bin":"970422","accountNo":"0123456789","accountName":"CONG TY DNA"}'::jsonb
                where key = 'bank'
                """);
    }

    private String confirmedBankOrder(long price) throws Exception {
        long sku = createSku(price, true);
        String code = placeOrder("BANK_TRANSFER", sku, 1, price, randomIp()).get("code").asText();
        jdbc.update("update customer_order set status = 'CONFIRMED', shipping_fee = 0 where code = ?", code);
        return code;
    }

    private long orderId(String code) {
        return jdbc.queryForObject("select id from customer_order where code = ?", Long.class, code);
    }

    private Map<String, Object> notification(long vendorId, String content, long amount) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", vendorId);
        body.put("accountNumber", BANK_ACCOUNT);
        body.put("content", content);
        body.put("transferType", "in");
        body.put("transferAmount", amount);
        body.put("transactionDate", "2026-10-31 14:02:37");
        return body;
    }

    private void sendWebhook(Map<String, Object> body) throws Exception {
        mvc.perform(post("/api/webhooks/bank/sepay").header("Authorization", "Apikey key-one")
                        .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(body)))
                .andExpect(status().isOk());
    }

    /** Sends a notification that cannot be paid automatically and returns the stored transaction id. */
    private long reviewTransaction(String content, long amount) throws Exception {
        long vendorId = VENDOR_IDS.incrementAndGet();
        sendWebhook(notification(vendorId, content, amount));
        return jdbc.queryForObject("select id from bank_transaction where vendor_tx_id = ?", Long.class,
                Long.toString(vendorId));
    }

    private long bankReviewCounter() throws Exception {
        return json(mvc.perform(get("/api/admin/requests/counters").with(TestAuth.as(manager))))
                .get("bankReview").asLong();
    }

    private ResultActions postAs(AppUser user, String path, Map<String, Object> body) throws Exception {
        return mvc.perform(post(path).with(TestAuth.as(user)).with(TestAuth.xsrf(AdminLogin.XSRF)).contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(body)));
    }

    @Test
    void editorIsForbiddenEverywhere() throws Exception {
        mvc.perform(get("/api/admin/bank-transactions").with(TestAuth.as(editor))).andExpect(status().isForbidden());
        postAs(editor, "/api/admin/bank-transactions/1/link", Map.of("orderId", 1, "markPaid", false))
                .andExpect(status().isForbidden());
        postAs(editor, "/api/admin/bank-transactions/1/dismiss", Map.of("note", "x")).andExpect(status().isForbidden());
    }

    @Test
    void reviewQueueListsMaskedRowsWithTheSuggestedOrder() throws Exception {
        String code = confirmedBankOrder(93_000);
        long tx = reviewTransaction(code, 92_000);
        mvc.perform(get("/api/admin/bank-transactions").param("status", "REVIEW").param("size", "100")
                        .with(TestAuth.as(manager)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[?(@.id == " + tx + ")].reviewReason").value("AMOUNT_MISMATCH"))
                .andExpect(jsonPath("$.items[?(@.id == " + tx + ")].accountNoMasked").value("****6789"))
                .andExpect(jsonPath("$.items[?(@.id == " + tx + ")].orderCode").value(code))
                .andExpect(jsonPath("$.items[?(@.id == " + tx + ")].direction").value("IN"));
        mvc.perform(get("/api/admin/requests/counters").with(TestAuth.as(manager)))
                .andExpect(jsonPath("$.bankReview").value(org.hamcrest.Matchers.greaterThanOrEqualTo(1)));
        mvc.perform(get("/api/admin/bank-transactions").param("status", "NOPE").with(TestAuth.as(manager)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void aNotificationWhoseMatchingFailedIsListedAsUnprocessedAndPaysTheOrderWhenReplayed() throws Exception {
        String code = confirmedBankOrder(93_000);
        long vendorId = VENDOR_IDS.incrementAndGet();
        Map<String, Object> body = notification(vendorId, "NGUYEN VAN A " + code, 93_000);
        long before = bankReviewCounter();

        // every write to bank_transaction fails, so the notification is stored but cannot be decided
        jdbc.execute("""
                create function fail_bank_transaction_update() returns trigger language plpgsql
                as $$ begin raise exception 'forced matching failure'; end $$
                """);
        jdbc.execute("create trigger fail_bank_transaction_update before update on bank_transaction "
                + "for each row execute function fail_bank_transaction_update()");
        try {
            sendWebhook(body);
        } finally {
            jdbc.execute("drop trigger fail_bank_transaction_update on bank_transaction");
            jdbc.execute("drop function fail_bank_transaction_update()");
        }
        long tx = jdbc.queryForObject("select id from bank_transaction where vendor_tx_id = ?", Long.class,
                Long.toString(vendorId));
        assertThat(jdbc.queryForObject("select status from bank_transaction where id = ?", String.class, tx))
                .isEqualTo("RECEIVED");
        assertThat(jdbc.queryForObject("select status from customer_order where code = ?", String.class, code))
                .isEqualTo("CONFIRMED");

        mvc.perform(get("/api/admin/bank-transactions").param("status", "REVIEW").param("size", "100")
                        .with(TestAuth.as(manager)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[?(@.id == " + tx + ")].status").value("RECEIVED"))
                .andExpect(jsonPath("$.items[?(@.id == " + tx + ")].reviewReason").value("UNPROCESSED"));
        assertThat(bankReviewCounter()).isEqualTo(before + 1);

        sendWebhook(body);

        assertThat(jdbc.queryForObject("select count(*) from bank_transaction where vendor_tx_id = ?", Long.class,
                Long.toString(vendorId))).isEqualTo(1L);
        assertThat(jdbc.queryForObject("select status from bank_transaction where id = ?", String.class, tx))
                .isEqualTo("MATCHED");
        Map<String, Object> order = jdbc.queryForMap(
                "select status, paid_via, paid_amount from customer_order where code = ?", code);
        assertThat(order.get("status")).isEqualTo("PAID");
        assertThat(order.get("paid_via")).isEqualTo("BANK_WEBHOOK");
        assertThat(((Number) order.get("paid_amount")).longValue()).isEqualTo(93_000L);
        assertThat(bankReviewCounter()).isEqualTo(before);

        // a second replay of a decided row changes nothing
        sendWebhook(body);
        assertThat(jdbc.queryForObject(
                "select count(*) from audit_log where entity_type = 'ORDER' and action = 'ORDER_STATUS' and entity_id = ?",
                Long.class, orderId(code))).isEqualTo(1L);
    }

    @Test
    void linkWithMarkPaidNeedsANoteWhenTheAmountDiffersThenPaysTheOrderAsManager() throws Exception {
        String code = confirmedBankOrder(93_000);
        long orderId = orderId(code);
        long tx = reviewTransaction(code, 92_000);

        postAs(manager, "/api/admin/bank-transactions/" + tx + "/link",
                Map.of("orderId", orderId, "markPaid", true)).andExpect(status().isBadRequest());
        // the failed attempt left everything as it was
        assertThat(jdbc.queryForObject("select status from bank_transaction where id = ?", String.class, tx))
                .isEqualTo("REVIEW");

        postAs(manager, "/api/admin/bank-transactions/" + tx + "/link",
                Map.of("orderId", orderId, "markPaid", true, "note", "Khách chuyển thiếu 1.000đ, đã đồng ý"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("MATCHED"))
                .andExpect(jsonPath("$.orderCode").value(code));

        Map<String, Object> order = jdbc.queryForMap(
                "select status, paid_via, paid_amount, paid_by from customer_order where id = ?", orderId);
        assertThat(order.get("status")).isEqualTo("PAID");
        assertThat(order.get("paid_via")).isEqualTo("MANUAL");
        assertThat(((Number) order.get("paid_amount")).longValue()).isEqualTo(92_000L);
        assertThat(order.get("paid_by")).isEqualTo(manager.getUsername());
        assertThat(jdbc.queryForObject(
                "select count(*) from audit_log where entity_type = 'BANK_TX' and entity_id = ? and action = 'BANK_TX_LINK'",
                Long.class, tx)).isEqualTo(1L);

        postAs(manager, "/api/admin/bank-transactions/" + tx + "/link", Map.of("orderId", orderId, "markPaid", false))
                .andExpect(status().isConflict());
    }

    @Test
    void linkingToAnAlreadyPaidOrderLeavesTheOrderUnchanged() throws Exception {
        String code = confirmedBankOrder(93_000);
        long orderId = orderId(code);
        jdbc.update("update customer_order set status = 'PAID', paid_amount = 93000, paid_via = 'MANUAL' where id = ?", orderId);
        long tx = reviewTransaction(code, 93_000);
        Long auditBefore = jdbc.queryForObject(
                "select count(*) from audit_log where entity_type = 'ORDER' and entity_id = ?", Long.class, orderId);

        postAs(manager, "/api/admin/bank-transactions/" + tx + "/link", Map.of("orderId", orderId, "markPaid", true))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("MATCHED"));

        assertThat(jdbc.queryForObject("select status from customer_order where id = ?", String.class, orderId))
                .isEqualTo("PAID");
        assertThat(jdbc.queryForObject("select count(*) from audit_log where entity_type = 'ORDER' and entity_id = ?",
                Long.class, orderId)).isEqualTo(auditBefore);
    }

    @Test
    void dismissIgnoresTheTransactionAndAuditsIt() throws Exception {
        long tx = reviewTransaction("Tien an trua", 50_000);
        postAs(manager, "/api/admin/bank-transactions/" + tx + "/dismiss", Map.of("note", ""))
                .andExpect(status().isBadRequest());
        postAs(manager, "/api/admin/bank-transactions/" + tx + "/dismiss", Map.of("note", "Không liên quan đơn hàng"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IGNORED"))
                .andExpect(jsonPath("$.decisionNote").value("Không liên quan đơn hàng"));
        assertThat(jdbc.queryForObject(
                "select count(*) from audit_log where entity_type = 'BANK_TX' and entity_id = ? and action = 'BANK_TX_DISMISS'",
                Long.class, tx)).isEqualTo(1L);
        postAs(manager, "/api/admin/bank-transactions/" + tx + "/dismiss", Map.of("note", "lần hai"))
                .andExpect(status().isConflict());
    }
}
