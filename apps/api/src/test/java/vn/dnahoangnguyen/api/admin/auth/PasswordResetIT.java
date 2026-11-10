package vn.dnahoangnguyen.api.admin.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import vn.dnahoangnguyen.api.admin.user.AppUser;
import vn.dnahoangnguyen.api.admin.user.AppUserRepository;
import vn.dnahoangnguyen.api.admin.user.Role;
import vn.dnahoangnguyen.api.support.AdminLogin;
import vn.dnahoangnguyen.api.support.IntegrationTest;
import vn.dnahoangnguyen.api.support.TestAuth;

/** Forgotten password: request by email, single-use expiring link, sessions end, no account enumeration. */
class PasswordResetIT extends IntegrationTest {

    private static final String PASSWORD = "old password 123";

    @Autowired
    MockMvc mvc;
    @Autowired
    AppUserRepository users;
    @Autowired
    PasswordEncoder encoder;
    @Autowired
    JdbcTemplate jdbc;
    @MockitoBean
    PasswordResetMailer mailer;

    private String ip;

    @BeforeEach
    void freshClient() {
        // every test is its own client, so the per-IP limits of one test never reach another
        ip = "10.77." + (int) (Math.random() * 250) + "." + (int) (Math.random() * 250);
        clearInvocations(mailer);
    }

    private AppUser user(String email) {
        AppUser user = TestAuth.createUser(users, encoder, "reset-" + UUID.randomUUID(), PASSWORD, Role.MANAGER);
        user.setEmail(email);
        return users.save(user);
    }

    private ResultActions request(String email) throws Exception {
        return mvc.perform(post("/api/auth/password-reset/request")
                .with(TestAuth.xsrf(AdminLogin.XSRF)).with(TestAuth.clientIp(ip))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\"}"));
    }

    private ResultActions confirm(String token, String newPassword) throws Exception {
        return mvc.perform(post("/api/auth/password-reset/confirm")
                .with(TestAuth.xsrf(AdminLogin.XSRF)).with(TestAuth.clientIp(ip))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"" + token + "\",\"newPassword\":\"" + newPassword + "\"}"));
    }

    private String mailedToken(String to) {
        ArgumentCaptor<String> link = ArgumentCaptor.forClass(String.class);
        verify(mailer).send(eq(to), anyString(), link.capture(), eq(PasswordResetService.LIFETIME));
        assertThat(link.getValue()).startsWith("http://localhost:8000/admin/reset-password?token=");
        return link.getValue().substring(link.getValue().indexOf("token=") + "token=".length());
    }

    @Test
    void theMailedLinkSetsANewPasswordOnceAndEndsOpenSessions() throws Exception {
        String email = "owner-" + UUID.randomUUID() + "@example.com";
        AppUser user = user(email);
        MockHttpSession open = AdminLogin.login(mvc, user.getUsername(), PASSWORD, ip);

        request(email.toUpperCase()).andExpect(status().isNoContent());
        String token = mailedToken(email);
        assertThat(jdbc.queryForObject("select count(*) from password_reset_token where token_hash = ?", Long.class,
                PasswordResetService.hash(token))).isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from password_reset_token where token_hash = ?", Long.class, token)).isZero();

        confirm(token, "short").andExpect(status().isBadRequest());
        confirm(token, "new password 456").andExpect(status().isNoContent());

        mvc.perform(get("/api/admin/me").session(open)).andExpect(status().isUnauthorized());
        AdminLogin.attempt(mvc, user.getUsername(), "new password 456", ip).andExpect(status().isOk());
        confirm(token, "another password 789").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(PasswordResetService.DETAIL_INVALID_LINK));
    }

    @Test
    void anUnknownAddressGetsTheSameAnswerAndNoMail() throws Exception {
        request("nobody-" + UUID.randomUUID() + "@example.com").andExpect(status().isNoContent());
        verify(mailer, never()).send(anyString(), anyString(), anyString(), any(Duration.class));
    }

    @Test
    void anExpiredOrReplacedLinkIsRefused() throws Exception {
        String email = "exp-" + UUID.randomUUID() + "@example.com";
        user(email);
        request(email).andExpect(status().isNoContent());
        String first = mailedToken(email);
        clearInvocations(mailer);
        request(email).andExpect(status().isNoContent());
        String second = mailedToken(email);

        confirm(first, "new password 456").andExpect(status().isBadRequest());
        jdbc.update("update password_reset_token set expires_at = now() - interval '1 minute' where token_hash = ?",
                PasswordResetService.hash(second));
        confirm(second, "new password 456").andExpect(status().isBadRequest());
        confirm("made-up-token", "new password 456").andExpect(status().isBadRequest());
    }

    @Test
    void aDisabledAccountGetsNoMail() throws Exception {
        String email = "off-" + UUID.randomUUID() + "@example.com";
        AppUser user = user(email);
        user.setEnabled(false);
        users.save(user);
        request(email).andExpect(status().isNoContent());
        verify(mailer, never()).send(anyString(), anyString(), anyString(), any(Duration.class));
    }

    @Test
    void requestsFromOneAddressAreLimited() throws Exception {
        for (int i = 0; i < 5; i++) {
            request("limit-" + i + "@example.com").andExpect(status().isNoContent());
        }
        request("limit-6@example.com").andExpect(status().isTooManyRequests());
    }

    @Test
    void anAdminSetsTheRecoveryEmailWithTheCurrentPassword() throws Exception {
        AppUser user = user(null);
        AppUser other = user("taken-" + UUID.randomUUID() + "@example.com");
        MockHttpSession session = AdminLogin.login(mvc, user.getUsername(), PASSWORD, ip);
        String email = "me-" + UUID.randomUUID() + "@example.com";

        mvc.perform(put("/api/admin/me/recovery-email").session(session).with(TestAuth.xsrf(AdminLogin.XSRF))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"currentPassword\":\"wrong password\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/admin/me/recovery-email").session(session).with(TestAuth.xsrf(AdminLogin.XSRF))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + other.getEmail() + "\",\"currentPassword\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isConflict());
        mvc.perform(put("/api/admin/me/recovery-email").session(session).with(TestAuth.xsrf(AdminLogin.XSRF))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"not-an-email\",\"currentPassword\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(put("/api/admin/me/recovery-email").session(session).with(TestAuth.xsrf(AdminLogin.XSRF))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"currentPassword\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email));
        mvc.perform(get("/api/admin/me/recovery-email").session(session))
                .andExpect(jsonPath("$.email").value(email));
    }
}
