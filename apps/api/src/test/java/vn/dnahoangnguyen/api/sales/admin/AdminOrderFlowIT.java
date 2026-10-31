package vn.dnahoangnguyen.api.sales.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.ResultActions;
import tools.jackson.databind.JsonNode;
import vn.dnahoangnguyen.api.admin.user.AppUser;
import vn.dnahoangnguyen.api.admin.user.AppUserRepository;
import vn.dnahoangnguyen.api.admin.user.Role;
import vn.dnahoangnguyen.api.sales.SalesIntegrationTest;
import vn.dnahoangnguyen.api.support.AdminLogin;
import vn.dnahoangnguyen.api.support.TestAuth;

class AdminOrderFlowIT extends SalesIntegrationTest {

    @Autowired
    AppUserRepository users;

    @Autowired
    PasswordEncoder encoder;

    AppUser manager;
    AppUser editor;

    @BeforeEach
    void createStaff() {
        manager = TestAuth.createUser(users, encoder, unique("manager"), "secret-pass-1", Role.MANAGER);
        editor = TestAuth.createUser(users, encoder, unique("editor"), "secret-pass-1", Role.EDITOR);
    }

    private ResultActions transition(AppUser as, long id, Map<String, Object> body) throws Exception {
        return mvc.perform(post("/api/admin/orders/" + id + "/transition").with(TestAuth.as(as)).with(TestAuth.xsrf(AdminLogin.XSRF))
                .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(body)));
    }

    private long idOf(String code) {
        return jdbc.queryForObject("select id from customer_order where code = ?", Long.class, code);
    }

    private long placed(String payment, long price, int qty) throws Exception {
        long sku = createSku(price, true);
        String code = placeOrder(payment, sku, qty, price * qty, randomIp()).get("code").asText();
        return idOf(code);
    }

    @Test
    void adminEndpointsRequireASessionAndACsrfToken() throws Exception {
        mvc.perform(get("/api/admin/requests")).andExpect(status().isUnauthorized());
        long id = placed("COD", 10_000, 1);
        mvc.perform(post("/api/admin/orders/" + id + "/transition").with(TestAuth.as(manager))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"to\":\"CANCELLED\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void confirmingWithAShippingFeeRecomputesTheTotalAndWritesHistory() throws Exception {
        long id = placed("COD", 31_000, 3);
        transition(editor, id, Map.of("to", "CONFIRMED", "shippingFee", 30_000))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.shippingFee").value(30_000))
                .andExpect(jsonPath("$.total").value(123_000))
                .andExpect(jsonPath("$.subtotal").value(93_000))
                .andExpect(jsonPath("$.awaitsKiotVietEntry").value(true))
                .andExpect(jsonPath("$.allowedTransitions[0].to").value("ENTERED_KIOTVIET"))
                .andExpect(jsonPath("$.allowedTransitions[0].requires[0]").value("kiotvietOrderCode"))
                .andExpect(jsonPath("$.history[?(@.action == 'ORDER_STATUS')].from").value("PENDING"))
                .andExpect(jsonPath("$.history[?(@.action == 'ORDER_STATUS')].to").value("CONFIRMED"));
        mvc.perform(get("/api/admin/orders/" + id).with(TestAuth.as(editor)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.address").value("12 Đường Hòa Bình, Phú Thọ"))
                .andExpect(jsonPath("$.items[0].skuId").isNumber());
    }

    @Test
    void confirmingWithoutAFeeIsAValidationError() throws Exception {
        long id = placed("COD", 10_000, 1);
        transition(editor, id, Map.of("to", "CONFIRMED"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.errors[0].field").value("shippingFee"));
    }

    @Test
    void editorCannotMarkPaidAndManagerNeedsANoteForADifferentAmount() throws Exception {
        long id = placed("BANK_TRANSFER", 31_000, 3);
        transition(editor, id, Map.of("to", "CONFIRMED", "shippingFee", 0)).andExpect(status().isOk());

        transition(editor, id, Map.of("to", "PAID", "paidAmount", 93_000)).andExpect(status().isForbidden());
        transition(manager, id, Map.of("to", "PAID", "paidAmount", 90_000))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("note"));
        transition(manager, id, Map.of("to", "PAID", "paidAmount", 90_000, "note", "Khách trừ phí chuyển khoản"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PAID"))
                .andExpect(jsonPath("$.paidVia").value("MANUAL"))
                .andExpect(jsonPath("$.paidAmount").value(90_000))
                .andExpect(jsonPath("$.awaitsKiotVietEntry").value(true));

        String paidBy = jdbc.queryForObject("select paid_by from customer_order where id = ?", String.class, id);
        assertThat(paidBy).isEqualTo(manager.getUsername());
    }

    @Test
    void bankTransferCannotSkipPaidAndCodCannotBePaid() throws Exception {
        long bank = placed("BANK_TRANSFER", 10_000, 1);
        transition(manager, bank, Map.of("to", "CONFIRMED", "shippingFee", 0)).andExpect(status().isOk());
        transition(manager, bank, Map.of("to", "ENTERED_KIOTVIET", "kiotvietOrderCode", "KV1"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("INVALID_TRANSITION"));

        long cod = placed("COD", 10_000, 1);
        transition(manager, cod, Map.of("to", "CONFIRMED", "shippingFee", 0)).andExpect(status().isOk());
        transition(manager, cod, Map.of("to", "PAID", "paidAmount", 10_000))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void kiotvietCodeIsRequiredAndTheFlowEndsInATerminalState() throws Exception {
        long id = placed("COD", 10_000, 1);
        transition(editor, id, Map.of("to", "CONFIRMED", "shippingFee", 5_000)).andExpect(status().isOk());
        transition(editor, id, Map.of("to", "ENTERED_KIOTVIET")).andExpect(status().isBadRequest());
        transition(editor, id, Map.of("to", "ENTERED_KIOTVIET", "kiotvietOrderCode", "KV-2026-001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.kiotvietOrderCode").value("KV-2026-001"))
                .andExpect(jsonPath("$.awaitsKiotVietEntry").value(false));
        transition(editor, id, Map.of("to", "SHIPPING")).andExpect(status().isOk());
        transition(editor, id, Map.of("to", "COMPLETED")).andExpect(status().isOk())
                .andExpect(jsonPath("$.allowedTransitions").isEmpty());
        transition(editor, id, Map.of("to", "CANCELLED")).andExpect(status().isUnprocessableEntity());
    }

    @Test
    void cancellingAPaidOrderNeedsARefundNote() throws Exception {
        long id = placed("BANK_TRANSFER", 10_000, 1);
        transition(manager, id, Map.of("to", "CONFIRMED", "shippingFee", 0)).andExpect(status().isOk());
        transition(manager, id, Map.of("to", "PAID", "paidAmount", 10_000)).andExpect(status().isOk());
        transition(manager, id, Map.of("to", "CANCELLED")).andExpect(status().isBadRequest());
        transition(manager, id, Map.of("to", "CANCELLED", "note", "Hoàn tiền về tài khoản khách"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));
    }

    @Test
    void listFiltersCountersAndInternalNote() throws Exception {
        long id = placed("COD", 10_000, 1);
        String code = jdbc.queryForObject("select code from customer_order where id = ?", String.class, id);

        mvc.perform(get("/api/admin/requests").param("q", code.toLowerCase()).param("kind", "order")
                        .with(TestAuth.as(editor)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].code").value(code))
                .andExpect(jsonPath("$.items[0].kind").value("ORDER"))
                .andExpect(jsonPath("$.items[0].status").value("PENDING"))
                .andExpect(jsonPath("$.items[0].paymentMethod").value("COD"))
                .andExpect(jsonPath("$.items[0].total").value(10_000))
                .andExpect(jsonPath("$.items[0].itemCount").value(1))
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.totals.totalAmount").value(10_000));
        mvc.perform(get("/api/admin/requests").param("q", "0912345678").param("payment", "BANK_TRANSFER")
                        .param("status", "CANCELLED").with(TestAuth.as(editor)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isEmpty());
        mvc.perform(get("/api/admin/requests/counters").with(TestAuth.as(editor)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pendingOrders").isNumber())
                .andExpect(jsonPath("$.newQuotes").isNumber())
                .andExpect(jsonPath("$.awaitingKiotViet").isNumber())
                .andExpect(jsonPath("$.bankReview").isNumber());

        mvc.perform(put("/api/admin/requests/orders/" + id + "/internal-note").with(TestAuth.as(editor)).with(TestAuth.xsrf(AdminLogin.XSRF))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"internalNote\":\"Gọi lại cho khách\"}"))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/admin/orders/" + id).with(TestAuth.as(editor)))
                .andExpect(jsonPath("$.internalNote").value("Gọi lại cho khách"));
    }

    @Test
    void quoteLifecycleAndAdminView() throws Exception {
        long visible = createSku(10_000L, true);
        long hidden = createSku(50_000L, false);
        Map<String, Object> body = new java.util.LinkedHashMap<>();
        body.put("submissionId", UUID.randomUUID().toString());
        body.put("customerName", "Công ty ABC");
        body.put("phone", "+84 912 345 678");
        body.put("email", "abc@example.com");
        body.put("lines", List.of(line(visible, 2), line(hidden, 1)));
        JsonNode quote = json(postPublic("/api/public/quotes", body, randomIp()).andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("NEW"))
                .andExpect(jsonPath("$.subtotal").value(20_000))
                .andExpect(jsonPath("$.hasContactLines").value(true)));
        String code = quote.get("code").asText();
        assertThat(code).matches("^BG[0-9A-HJKMNP-TV-Z]{6}$");
        long id = jdbc.queryForObject("select id from quote_request where code = ?", Long.class, code);

        mvc.perform(get("/api/admin/quotes/" + id).with(TestAuth.as(editor)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.allowedTransitions[0].to").value("QUOTED"))
                .andExpect(jsonPath("$.lines[1].unitPrice").value((Object) null))
                .andExpect(jsonPath("$.email").value("abc@example.com"));
        quoteTransition(id, "QUOTED").andExpect(status().isOk()).andExpect(jsonPath("$.status").value("QUOTED"));
        quoteTransition(id, "NEW").andExpect(status().isUnprocessableEntity());
        quoteTransition(id, "WON").andExpect(status().isOk());
        quoteTransition(id, "CANCELLED").andExpect(status().isUnprocessableEntity());
    }

    private ResultActions quoteTransition(long id, String to) throws Exception {
        return mvc.perform(post("/api/admin/quotes/" + id + "/transition").with(TestAuth.as(editor)).with(TestAuth.xsrf(AdminLogin.XSRF))
                .contentType(MediaType.APPLICATION_JSON).content("{\"to\":\"" + to + "\"}"));
    }
}
