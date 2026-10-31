package vn.dnahoangnguyen.api.sales.bank;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import vn.dnahoangnguyen.api.support.IntegrationTest;

/** The endpoint is off unless explicitly enabled, even for a request that carries a key. */
@AutoConfigureMockMvc
class SepayWebhookDisabledIT extends IntegrationTest {

    @Autowired
    MockMvc mvc;

    @Test
    void answersNotFoundWhenDisabled() throws Exception {
        mvc.perform(post("/api/webhooks/bank/sepay").header("Authorization", "Apikey anything")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"id\":1,\"accountNumber\":\"1\",\"transferType\":\"in\",\"transferAmount\":1,\"content\":\"x\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }
}
