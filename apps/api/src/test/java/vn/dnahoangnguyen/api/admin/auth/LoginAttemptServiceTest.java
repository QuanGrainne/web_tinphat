package vn.dnahoangnguyen.api.admin.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.dnahoangnguyen.api.support.MutableClock;

class LoginAttemptServiceTest {

    private MutableClock clock;
    private LoginAttemptService attempts;

    @BeforeEach
    void setUp() {
        clock = new MutableClock(Instant.parse("2026-10-31T00:00:00Z"));
        attempts = new LoginAttemptService(clock);
    }

    private void fail(String key, int times) {
        for (int i = 0; i < times; i++) {
            attempts.recordFailure(key);
        }
    }

    @Test
    void firstFiveFailuresCarryNoDelay() {
        String key = LoginAttemptService.key("owner", "1.2.3.4");
        fail(key, 4);
        assertThat(attempts.remainingDelay(key)).isZero();
        fail(key, 1);
        assertThat(attempts.remainingDelay(key)).isEqualTo(Duration.ofSeconds(30));
    }

    @Test
    void delayDoublesPerFailureAndIsCappedAtFifteenMinutes() {
        assertThat(LoginAttemptService.delayFor(5)).isEqualTo(Duration.ofSeconds(30));
        assertThat(LoginAttemptService.delayFor(6)).isEqualTo(Duration.ofSeconds(60));
        assertThat(LoginAttemptService.delayFor(7)).isEqualTo(Duration.ofSeconds(120));
        assertThat(LoginAttemptService.delayFor(9)).isEqualTo(Duration.ofMinutes(8));
        assertThat(LoginAttemptService.delayFor(10)).isEqualTo(Duration.ofMinutes(15));
        assertThat(LoginAttemptService.delayFor(500)).isEqualTo(Duration.ofMinutes(15));
    }

    @Test
    void delayRunsFromTheLastFailureAndCountsDown() {
        String key = LoginAttemptService.key("owner", "1.2.3.4");
        fail(key, 5);
        clock.advance(Duration.ofSeconds(10));
        assertThat(attempts.remainingDelay(key)).isEqualTo(Duration.ofSeconds(20));
        clock.advance(Duration.ofSeconds(20));
        assertThat(attempts.remainingDelay(key)).isZero();
    }

    @Test
    void keyIsPerUsernameAndAddressAndIgnoresCase() {
        String a = LoginAttemptService.key(" Owner ", "1.2.3.4");
        fail(a, 5);
        assertThat(attempts.remainingDelay(LoginAttemptService.key("owner", "1.2.3.4"))).isPositive();
        assertThat(attempts.remainingDelay(LoginAttemptService.key("owner", "5.6.7.8"))).isZero();
        assertThat(attempts.remainingDelay(LoginAttemptService.key("someone-else", "1.2.3.4"))).isZero();
    }

    @Test
    void hugeUsernamesDoNotInflateTheKey() {
        String key = LoginAttemptService.key("x".repeat(100_000), "1.2.3.4");
        assertThat(key.length()).isLessThanOrEqualTo(LoginAttemptService.MAX_USERNAME_LENGTH + "|1.2.3.4".length());
        assertThat(LoginAttemptService.key(null, "1.2.3.4")).isEqualTo("|1.2.3.4");
    }

    @Test
    void successClearsTheKey() {
        String key = LoginAttemptService.key("owner", "1.2.3.4");
        fail(key, 7);
        attempts.recordSuccess(key);
        assertThat(attempts.remainingDelay(key)).isZero();
        assertThat(attempts.size()).isZero();
    }

    @Test
    void entriesAreDroppedTwentyFourHoursAfterTheLastFailure() {
        attempts.recordFailure(LoginAttemptService.key("owner", "1.2.3.4"));
        clock.advance(Duration.ofHours(23));
        attempts.purgeExpired();
        assertThat(attempts.size()).isEqualTo(1);
        clock.advance(Duration.ofHours(2));
        attempts.purgeExpired();
        assertThat(attempts.size()).isZero();
    }

    @Test
    void mapStaysBounded() {
        for (int i = 0; i < LoginAttemptService.MAX_KEYS + 50; i++) {
            attempts.recordFailure("user" + i + "|ip");
            clock.advance(Duration.ofMillis(1));
        }
        assertThat(attempts.size()).isLessThanOrEqualTo(LoginAttemptService.MAX_KEYS);
    }
}
