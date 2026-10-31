package vn.dnahoangnguyen.api.admin.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import vn.dnahoangnguyen.api.admin.user.AppUserRepository;
import vn.dnahoangnguyen.api.admin.user.Role;
import vn.dnahoangnguyen.api.support.AdminLogin;
import vn.dnahoangnguyen.api.support.IntegrationTest;
import vn.dnahoangnguyen.api.support.TestAuth;

class LoginThrottleIT extends IntegrationTest {

    private static final String PASSWORD = "a long enough password";

    @Autowired
    MockMvc mvc;
    @Autowired
    AppUserRepository users;
    @Autowired
    PasswordEncoder encoder;

    private String failedAttempt(String user, String password, String ip) throws Exception {
        return AdminLogin.attempt(mvc, user, password, ip)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"))
                .andReturn().getResponse().getContentAsString();
    }

    @Test
    void sixthAttemptInsideTheDelayIsRejectedWithTheSameBodyAndOtherIpsAreUnaffected() throws Exception {
        TestAuth.createUser(users, encoder, "throttle-user", PASSWORD, Role.MANAGER);
        String ipA = "10.20.0.1";

        String wrongPasswordBody = "";
        for (int i = 0; i < 5; i++) {
            wrongPasswordBody = failedAttempt("throttle-user", "wrong password " + i, ipA);
        }
        String unknownUserBody = failedAttempt("throttle-nobody", "whatever password", "10.20.0.9");

        // even the correct password is refused inside the 30 s delay, with the identical body
        String insideDelay = failedAttempt("throttle-user", PASSWORD, ipA);
        assertThat(insideDelay).isEqualTo(wrongPasswordBody).isEqualTo(unknownUserBody);

        // same username from another address is not affected
        AdminLogin.attempt(mvc, "throttle-user", PASSWORD, "10.20.0.2").andExpect(status().isOk());

        // still blocked before the delay ends, free after it
        clock.advance(Duration.ofSeconds(20));
        failedAttempt("throttle-user", PASSWORD, ipA);
        clock.advance(Duration.ofSeconds(11));
        AdminLogin.attempt(mvc, "throttle-user", PASSWORD, ipA).andExpect(status().isOk());
    }

    @Test
    void delayGrowsWithEachFurtherFailure() throws Exception {
        TestAuth.createUser(users, encoder, "throttle-growth", PASSWORD, Role.MANAGER);
        String ip = "10.20.0.3";
        for (int i = 0; i < 5; i++) {
            failedAttempt("throttle-growth", "wrong password " + i, ip);
        }
        clock.advance(Duration.ofSeconds(31));
        failedAttempt("throttle-growth", "wrong password again", ip); // sixth failure: delay is now 60 s
        clock.advance(Duration.ofSeconds(31));
        failedAttempt("throttle-growth", PASSWORD, ip); // still inside the 60 s delay
        clock.advance(Duration.ofSeconds(30));
        AdminLogin.attempt(mvc, "throttle-growth", PASSWORD, ip).andExpect(status().isOk());
    }

    @Test
    void twentyFirstAttemptFromOneIpIsRateLimited() throws Exception {
        String ip = "10.20.0.4";
        for (int i = 0; i < 20; i++) {
            AdminLogin.attempt(mvc, "throttle-ip-" + i, "wrong password " + i, ip)
                    .andExpect(status().isUnauthorized());
        }
        AdminLogin.attempt(mvc, "throttle-ip-last", "wrong password", ip)
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.code").value("RATE_LIMITED"));
    }
}
