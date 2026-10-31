package vn.dnahoangnguyen.api.common.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.dnahoangnguyen.api.support.MutableClock;

class FixedWindowRateLimiterTest {

    private static final Duration WINDOW = Duration.ofMinutes(10);

    private MutableClock clock;
    private FixedWindowRateLimiter limiter;

    @BeforeEach
    void setUp() {
        clock = new MutableClock(Instant.parse("2026-10-31T00:00:00Z"));
        limiter = new FixedWindowRateLimiter(clock);
    }

    @Test
    void allowsUpToMaxThenDenies() {
        for (int i = 0; i < 3; i++) {
            assertThat(limiter.tryAcquire("ip:1", 3, WINDOW)).as("hit %d", i + 1).isTrue();
        }
        assertThat(limiter.tryAcquire("ip:1", 3, WINDOW)).isFalse();
        assertThat(limiter.peek("ip:1", WINDOW)).isEqualTo(3);
    }

    @Test
    void keysAreIndependent() {
        assertThat(limiter.tryAcquire("a", 1, WINDOW)).isTrue();
        assertThat(limiter.tryAcquire("a", 1, WINDOW)).isFalse();
        assertThat(limiter.tryAcquire("b", 1, WINDOW)).isTrue();
    }

    @Test
    void newWindowResetsTheCount() {
        assertThat(limiter.tryAcquire("a", 1, WINDOW)).isTrue();
        assertThat(limiter.tryAcquire("a", 1, WINDOW)).isFalse();
        clock.advance(WINDOW);
        assertThat(limiter.peek("a", WINDOW)).isZero();
        assertThat(limiter.tryAcquire("a", 1, WINDOW)).isTrue();
    }

    @Test
    void windowStartsAtFirstHitAndIsNotExtendedByLaterHits() {
        limiter.record("a", WINDOW);
        clock.advance(Duration.ofMinutes(9));
        limiter.record("a", WINDOW);
        assertThat(limiter.peek("a", WINDOW)).isEqualTo(2);
        clock.advance(Duration.ofMinutes(1));
        assertThat(limiter.peek("a", WINDOW)).isZero();
    }

    @Test
    void recordCountsWithoutLimit() {
        for (int i = 0; i < 5; i++) {
            limiter.record("a", WINDOW);
        }
        assertThat(limiter.peek("a", WINDOW)).isEqualTo(5);
        assertThat(limiter.tryAcquire("a", 5, WINDOW)).isFalse();
    }

    @Test
    void remainingShrinksWithTime() {
        limiter.record("a", WINDOW);
        clock.advance(Duration.ofMinutes(4));
        assertThat(limiter.remaining("a")).isEqualTo(Duration.ofMinutes(6));
        assertThat(limiter.remaining("missing")).isEqualTo(Duration.ZERO);
    }

    @Test
    void purgeDropsOnlyExpiredWindows() {
        limiter.record("old", Duration.ofMinutes(1));
        limiter.record("fresh", Duration.ofMinutes(30));
        clock.advance(Duration.ofMinutes(5));
        limiter.purgeExpired();
        assertThat(limiter.size()).isEqualTo(1);
        assertThat(limiter.peek("fresh", Duration.ofMinutes(30))).isEqualTo(1);
    }
}
