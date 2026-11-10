package vn.dnahoangnguyen.api.admin.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import vn.dnahoangnguyen.api.admin.user.AppUser;
import vn.dnahoangnguyen.api.admin.user.AppUserRepository;
import vn.dnahoangnguyen.api.admin.user.Role;
import vn.dnahoangnguyen.api.support.AdminLogin;
import vn.dnahoangnguyen.api.support.IntegrationTest;
import vn.dnahoangnguyen.api.support.TestAuth;

/** Changes made straight in the database must end live sessions on their next request. */
class SessionValidityIT extends IntegrationTest {

    private static final String PASSWORD = "a long enough password";

    @Autowired
    MockMvc mvc;
    @Autowired
    AppUserRepository users;
    @Autowired
    PasswordEncoder encoder;

    private MockHttpSession signedIn(AppUser user, String ip) throws Exception {
        MockHttpSession session = AdminLogin.login(mvc, user.getUsername(), PASSWORD, ip);
        mvc.perform(get("/api/admin/me").session(session)).andExpect(status().isOk());
        return session;
    }

    private void expectSignedOut(MockHttpSession session) throws Exception {
        mvc.perform(get("/api/admin/me").session(session))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
    }

    @Test
    void disabledUserIsSignedOutOnNextRequest() throws Exception {
        AppUser user = TestAuth.createUser(users, encoder, "valid-disabled", PASSWORD, Role.MANAGER);
        MockHttpSession session = signedIn(user, "10.30.0.1");

        user.setEnabled(false);
        users.save(user);

        expectSignedOut(session);
    }

    @Test
    void deletedUserIsSignedOutOnNextRequest() throws Exception {
        AppUser user = TestAuth.createUser(users, encoder, "valid-deleted", PASSWORD, Role.MANAGER);
        MockHttpSession session = signedIn(user, "10.30.0.2");

        users.delete(user);

        expectSignedOut(session);
    }

    @Test
    void demotedManagerLosesTheSessionAndSeesEditorRightsAfterLoggingInAgain() throws Exception {
        AppUser user = TestAuth.createUser(users, encoder, "valid-demoted", PASSWORD, Role.MANAGER);
        MockHttpSession session = signedIn(user, "10.30.0.3");
        mvc.perform(get("/api/admin/settings").session(session)).andExpect(status().isOk());

        user.setRole(Role.EDITOR);
        users.save(user);

        mvc.perform(get("/api/admin/settings").session(session)).andExpect(status().isUnauthorized());

        MockHttpSession again = AdminLogin.login(mvc, "valid-demoted", PASSWORD, "10.30.0.3");
        mvc.perform(get("/api/admin/me").session(again))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("EDITOR"));
        mvc.perform(get("/api/admin/settings").session(again))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    void passwordChangedElsewhereEndsOlderSessions() throws Exception {
        AppUser user = TestAuth.createUser(users, encoder, "valid-pwchange", PASSWORD, Role.MANAGER);
        MockHttpSession session = signedIn(user, "10.30.0.4");

        user.changePassword(encoder.encode("another long password"), Instant.now().plusSeconds(5));
        users.save(user);

        expectSignedOut(session);
    }

    @Test
    void sessionOlderThanTwelveHoursEndsEvenWhenActive() throws Exception {
        AppUser user = TestAuth.createUser(users, encoder, "valid-cap", PASSWORD, Role.MANAGER);
        MockHttpSession session = signedIn(user, "10.30.0.5");

        clock.advance(Duration.ofHours(11));
        mvc.perform(get("/api/admin/me").session(session)).andExpect(status().isOk());

        clock.advance(Duration.ofHours(1).plusMinutes(1));
        expectSignedOut(session);
    }

    @Test
    void ownPasswordChangeKeepsTheCallerSignedInAndRotatesTheCredentials() throws Exception {
        AppUser user = TestAuth.createUser(users, encoder, "valid-own", PASSWORD, Role.MANAGER);
        MockHttpSession session = signedIn(user, "10.30.0.6");
        MockHttpSession otherDevice = AdminLogin.login(mvc, "valid-own", PASSWORD, "10.30.0.7");

        mvc.perform(post("/api/admin/me/password")
                        .session(session)
                        .with(TestAuth.xsrf(AdminLogin.XSRF))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"" + PASSWORD + "\",\"newPassword\":\"brand new password\"}"))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/admin/me").session(session)).andExpect(status().isOk());
        expectSignedOut(otherDevice);
        AdminLogin.attempt(mvc, "valid-own", PASSWORD, "10.30.0.8").andExpect(status().isUnauthorized());
        AdminLogin.attempt(mvc, "valid-own", "brand new password", "10.30.0.9").andExpect(status().isOk());
    }

    @Test
    void passwordChangeNeedsTheCurrentPasswordAndAStrongEnoughNewOne() throws Exception {
        AppUser user = TestAuth.createUser(users, encoder, "valid-guard", PASSWORD, Role.MANAGER);
        MockHttpSession session = signedIn(user, "10.30.0.10");

        mvc.perform(post("/api/admin/me/password")
                        .session(session)
                        .with(TestAuth.xsrf(AdminLogin.XSRF))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"not the password\",\"newPassword\":\"brand new password\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));

        mvc.perform(post("/api/admin/me/password")
                        .session(session)
                        .with(TestAuth.xsrf(AdminLogin.XSRF))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"" + PASSWORD + "\",\"newPassword\":\"short\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.errors[0].field").value("newPassword"));

        mvc.perform(post("/api/admin/me/password")
                        .session(session)
                        .with(TestAuth.xsrf(AdminLogin.XSRF))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"" + PASSWORD + "\",\"newPassword\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("newPassword"));

        // the minimum is 8 characters: 7 is refused, 8 is accepted
        mvc.perform(post("/api/admin/me/password")
                        .session(session)
                        .with(TestAuth.xsrf(AdminLogin.XSRF))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"" + PASSWORD + "\",\"newPassword\":\"abcd123\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("newPassword"));
        mvc.perform(post("/api/admin/me/password")
                        .session(session)
                        .with(TestAuth.xsrf(AdminLogin.XSRF))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"" + PASSWORD + "\",\"newPassword\":\"abcd1234\"}"))
                .andExpect(status().isNoContent());
    }

    @Test
    void passwordChangeRefusesWhatBcryptCannotHold() throws Exception {
        AppUser user = TestAuth.createUser(users, encoder, "valid-toolong", PASSWORD, Role.MANAGER);
        MockHttpSession session = signedIn(user, "10.30.0.11");

        // 80 bytes of ASCII, and 30 accented characters that are 90 bytes
        for (String tooLong : new String[] {"p".repeat(80), "ệ".repeat(30)}) {
            mvc.perform(post("/api/admin/me/password")
                            .session(session)
                            .with(TestAuth.xsrf(AdminLogin.XSRF))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"currentPassword\":\"" + PASSWORD + "\",\"newPassword\":\"" + tooLong + "\"}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                    .andExpect(jsonPath("$.errors[0].field").value("newPassword"))
                    .andExpect(jsonPath("$.errors[0].message").isNotEmpty());
        }
        // nothing changed: the old password still works
        AdminLogin.attempt(mvc, "valid-toolong", PASSWORD, "10.30.0.12").andExpect(status().isOk());

        String atTheLimit = "p".repeat(72);
        mvc.perform(post("/api/admin/me/password")
                        .session(session)
                        .with(TestAuth.xsrf(AdminLogin.XSRF))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"" + PASSWORD + "\",\"newPassword\":\"" + atTheLimit + "\"}"))
                .andExpect(status().isNoContent());
        AdminLogin.attempt(mvc, "valid-toolong", atTheLimit, "10.30.0.13").andExpect(status().isOk());
    }
}
