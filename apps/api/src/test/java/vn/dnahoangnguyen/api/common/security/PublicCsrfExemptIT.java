package vn.dnahoangnguyen.api.common.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import vn.dnahoangnguyen.api.support.IntegrationTest;

class PublicCsrfExemptIT extends IntegrationTest {

    @Autowired
    MockMvc mvc;

    @Test
    void publicPostNeedsNoCsrfToken() throws Exception {
        mvc.perform(post("/api/public/_test/echo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ok").value(true));
    }

    @Test
    void webhookPostNeedsNoCsrfTokenAndCreatesNoSession() throws Exception {
        MvcResult result = mvc.perform(post("/api/webhooks/_test/echo"))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(result.getRequest().getSession(false)).isNull();
        assertThat(result.getResponse().getCookie("DNA_SESSION")).isNull();
        assertThat(result.getResponse().getHeaders("Set-Cookie")).isEmpty();
    }

    @Test
    void publicGetSetsNoSessionAndNoCookie() throws Exception {
        MvcResult result = mvc.perform(get("/api/public/settings")).andExpect(status().isOk()).andReturn();
        assertThat(result.getRequest().getSession(false)).isNull();
        assertThat(result.getResponse().getHeaders("Set-Cookie")).isEmpty();
    }

    @Test
    void adminMutationWithoutCsrfTokenIsForbidden() throws Exception {
        mvc.perform(post("/api/admin/me/password").contentType("application/json")
                        .content("{\"currentPassword\":\"x\",\"newPassword\":\"y\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }
}
