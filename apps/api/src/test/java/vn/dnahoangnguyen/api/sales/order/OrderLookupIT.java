package vn.dnahoangnguyen.api.sales.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import vn.dnahoangnguyen.api.sales.SalesIntegrationTest;

class OrderLookupIT extends SalesIntegrationTest {

    @Test
    void phoneInAnyCommonFormatAndSloppyCodeFindTheOrder() throws Exception {
        long sku = createSku(31_000L, true);
        String code = placeOrder("COD", sku, 1, 31_000, randomIp()).get("code").asText();

        for (String phone : new String[] {"0912 345 678", "+84912345678", "84912345678"}) {
            postPublic("/api/public/orders/lookup", Map.of("code", code, "phone", phone), randomIp())
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value(code))
                    .andExpect(jsonPath("$.phoneMasked").value("0912 *** 678"));
        }
        String sloppy = code.substring(0, 3).toLowerCase() + " " + code.substring(3, 6) + "-" + code.substring(6);
        postPublic("/api/public/orders/lookup", Map.of("code", sloppy, "phone", "0912345678"), randomIp())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(code));
    }

    @Test
    void everyMismatchGivesTheSameNotFoundBody() throws Exception {
        long sku = createSku(31_000L, true);
        String code = placeOrder("COD", sku, 1, 31_000, randomIp()).get("code").asText();

        JsonNode wrongPhone = json(postPublic("/api/public/orders/lookup",
                Map.of("code", code, "phone", "0987654321"), randomIp()).andExpect(status().isNotFound()));
        JsonNode wrongCode = json(postPublic("/api/public/orders/lookup",
                Map.of("code", "DNA000000", "phone", "0912345678"), randomIp()).andExpect(status().isNotFound()));
        JsonNode badPhone = json(postPublic("/api/public/orders/lookup",
                Map.of("code", code, "phone", "abc"), randomIp()).andExpect(status().isNotFound()));

        assertThat(wrongPhone).isEqualTo(wrongCode).isEqualTo(badPhone);
        assertThat(wrongPhone.get("code").asText()).isEqualTo("NOT_FOUND");
    }

    @Test
    void bankBlockAppearsOnlyForPendingAndConfirmedBankOrdersWithAQrOnceConfirmed() throws Exception {
        jdbc.update("""
                update app_setting set value = '{"bankName":"MB Bank","bin":"970422","accountNo":"0123456789","accountName":"CONG TY DNA"}'::jsonb
                where key = 'bank'
                """);
        long sku = createSku(31_000L, true);
        JsonNode bank = placeOrder("BANK_TRANSFER", sku, 1, 31_000, randomIp());
        String code = bank.get("code").asText();
        assertThat(bank.get("bank").get("content").asText()).isEqualTo(code);
        assertThat(bank.get("bank").get("accountNo").asText()).isEqualTo("0123456789");
        assertThat(bank.get("qrAmount").isNull()).isTrue();

        JsonNode cod = placeOrder("COD", sku, 1, 31_000, randomIp());
        assertThat(cod.get("bank").isNull()).isTrue();

        jdbc.update("update customer_order set status = 'CONFIRMED', shipping_fee = 30000, total = 61000 where code = ?", code);
        postPublic("/api/public/orders/lookup", Map.of("code", code, "phone", "0912345678"), randomIp())
                .andExpect(jsonPath("$.qrAmount").value(61_000))
                .andExpect(jsonPath("$.bank.content").value(code));

        jdbc.update("update customer_order set status = 'PAID', paid_amount = 61000 where code = ?", code);
        postPublic("/api/public/orders/lookup", Map.of("code", code, "phone", "0912345678"), randomIp())
                .andExpect(jsonPath("$.bank").value((Object) null))
                .andExpect(jsonPath("$.qrAmount").value((Object) null));
    }
}
