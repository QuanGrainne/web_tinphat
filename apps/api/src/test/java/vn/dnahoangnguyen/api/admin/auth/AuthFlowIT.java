package vn.dnahoangnguyen.api.admin.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import vn.dnahoangnguyen.api.admin.user.AppUserRepository;
import vn.dnahoangnguyen.api.admin.user.Role;
import vn.dnahoangnguyen.api.support.AdminLogin;
import vn.dnahoangnguyen.api.support.IntegrationTest;
import vn.dnahoangnguyen.api.support.TestAuth;

class AuthFlowIT extends IntegrationTest {

    private static final String PASSWORD = "a long enough password";

    @Autowired
    MockMvc mvc;
    @Autowired
    AppUserRepository users;
    @Autowired
    PasswordEncoder encoder;

    @Test
    void csrfThenLoginThenMeThenLogout() throws Exception {
        TestAuth.createUser(users, encoder, "flow-owner", PASSWORD, Role.MANAGER);

        MvcResult csrf = mvc.perform(get("/api/auth/csrf").with(TestAuth.clientIp("10.10.0.1")))
                .andExpect(status().isNoContent())
                .andExpect(cookie().exists("XSRF-TOKEN"))
                .andReturn();
        Cookie xsrfCookie = csrf.getResponse().getCookie("XSRF-TOKEN");
        assertThat(xsrfCookie).isNotNull();
        assertThat(xsrfCookie.isHttpOnly()).as("script must be able to read the token").isFalse();

        MvcResult login = mvc.perform(post("/api/auth/login")
                        .with(TestAuth.clientIp("10.10.0.1"))
                        .cookie(xsrfCookie)
                        .header("X-XSRF-TOKEN", xsrfCookie.getValue())
                        .param("username", "flow-owner")
                        .param("password", PASSWORD))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("flow-owner"))
                .andExpect(jsonPath("$.displayName").value("Test flow-owner"))
                .andExpect(jsonPath("$.role").value("MANAGER"))
                .andExpect(cookie().exists("XSRF-TOKEN"))
                .andReturn();
        MockHttpSession session = (MockHttpSession) login.getRequest().getSession(false);
        assertThat(session).isNotNull();

        mvc.perform(get("/api/admin/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("flow-owner"))
                .andExpect(jsonPath("$.role").value("MANAGER"));

        mvc.perform(post("/api/auth/logout").session(session).with(TestAuth.xsrf(AdminLogin.XSRF)))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/admin/me").session(session))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith("application/problem+json"))
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
    }

    @Test
    void loginWithoutCsrfHeaderIsForbidden() throws Exception {
        TestAuth.createUser(users, encoder, "flow-nocsrf", PASSWORD, Role.MANAGER);

        mvc.perform(post("/api/auth/login")
                        .with(TestAuth.clientIp("10.10.0.2"))
                        .param("username", "flow-nocsrf")
                        .param("password", PASSWORD))
                .andExpect(status().isForbidden())
                .andExpect(content().contentTypeCompatibleWith("application/problem+json"))
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    void usernameIsCaseInsensitive() throws Exception {
        TestAuth.createUser(users, encoder, "Flow-Mixed", PASSWORD, Role.EDITOR);

        AdminLogin.attempt(mvc, "flow-mixed", PASSWORD, "10.10.0.3")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("EDITOR"));
    }

    @Test
    void everyLoginFailureHasTheSameBody() throws Exception {
        TestAuth.createUser(users, encoder, "flow-fail", PASSWORD, Role.MANAGER);
        var disabled = TestAuth.createUser(users, encoder, "flow-disabled", PASSWORD, Role.MANAGER);
        disabled.setEnabled(false);
        users.save(disabled);

        String wrongPassword = AdminLogin.attempt(mvc, "flow-fail", "wrong password!!", "10.10.0.4")
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith("application/problem+json"))
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"))
                .andReturn().getResponse().getContentAsString();
        String unknownUser = AdminLogin.attempt(mvc, "nobody-here", PASSWORD, "10.10.0.5")
                .andExpect(status().isUnauthorized()).andReturn().getResponse().getContentAsString();
        String disabledUser = AdminLogin.attempt(mvc, "flow-disabled", PASSWORD, "10.10.0.6")
                .andExpect(status().isUnauthorized()).andReturn().getResponse().getContentAsString();

        assertThat(unknownUser).isEqualTo(wrongPassword);
        assertThat(disabledUser).isEqualTo(wrongPassword);
    }

    @Test
    void adminEndpointsRequireSignInWithProblemBody() throws Exception {
        mvc.perform(get("/api/admin/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith("application/problem+json"))
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"))
                .andExpect(jsonPath("$.detail").value("Vui lòng đăng nhập để tiếp tục."));
    }

    @Test
    void unknownPathsAreDenied() throws Exception {
        mvc.perform(get("/something/else")).andExpect(status().isUnauthorized());
    }

    @Test
    void healthIsPublic() throws Exception {
        mvc.perform(get("/actuator/health")).andExpect(status().isOk());
    }
}
