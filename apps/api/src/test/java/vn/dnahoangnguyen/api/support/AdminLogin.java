package vn.dnahoangnguyen.api.support;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

/** Drives the real login endpoint from MockMvc tests. */
public final class AdminLogin {

    public static final String XSRF = "test-xsrf-token";

    private AdminLogin() {
    }

    /** Raw login attempt; the caller asserts the outcome. */
    public static ResultActions attempt(MockMvc mvc, String username, String password, String ip) throws Exception {
        return mvc.perform(post("/api/auth/login")
                .with(TestAuth.xsrf(XSRF))
                .with(TestAuth.clientIp(ip))
                .param("username", username)
                .param("password", password));
    }

    /** Successful login; returns the session to attach to later requests with {@code .session(...)}. */
    public static MockHttpSession login(MockMvc mvc, String username, String password, String ip) throws Exception {
        MvcResult result = attempt(mvc, username, password, ip).andExpect(status().isOk()).andReturn();
        MockHttpSession session = (MockHttpSession) result.getRequest().getSession(false);
        if (session == null) {
            throw new AssertionError("login did not create a session");
        }
        return session;
    }
}
