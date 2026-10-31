package vn.dnahoangnguyen.api.admin.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Progressive login delay keyed on (lower-case username, client IP), kept in memory. After {@value #FREE_FAILURES}
 * failures, each further attempt must wait {@code min(30 s * 2^(n-5), 15 min)} after the last failure.
 * Nothing is stored per user, so an attacker on another address cannot lock the owner out; a restart clears all delays.
 */
@Component
public class LoginAttemptService {

    static final int FREE_FAILURES = 5;
    static final Duration BASE_DELAY = Duration.ofSeconds(30);
    static final Duration MAX_DELAY = Duration.ofMinutes(15);
    static final Duration RETENTION = Duration.ofHours(24);
    static final int MAX_KEYS = 10_000;
    static final int MAX_USERNAME_LENGTH = 100;

    private record Entry(int failures, Instant lastFailure) {
    }

    private final Clock clock;
    private final ConcurrentHashMap<String, Entry> entries = new ConcurrentHashMap<>();

    public LoginAttemptService(Clock clock) {
        this.clock = clock;
    }

    /** Usernames are capped so a request with a huge value cannot inflate the map. */
    public static String key(String username, String ipKey) {
        String normalized = username == null ? "" : username.trim().toLowerCase(Locale.ROOT);
        if (normalized.length() > MAX_USERNAME_LENGTH) {
            normalized = normalized.substring(0, MAX_USERNAME_LENGTH);
        }
        return normalized + "|" + ipKey;
    }

    /** How long the caller must still wait before the next password check; {@link Duration#ZERO} when free to try. */
    public Duration remainingDelay(String key) {
        Entry entry = entries.get(key);
        if (entry == null || entry.failures() < FREE_FAILURES) {
            return Duration.ZERO;
        }
        Duration remaining = Duration.between(clock.instant(), entry.lastFailure().plus(delayFor(entry.failures())));
        return remaining.isNegative() ? Duration.ZERO : remaining;
    }

    public void recordFailure(String key) {
        Instant now = clock.instant();
        if (entries.size() >= MAX_KEYS && !entries.containsKey(key)) {
            evict(now);
        }
        entries.merge(key, new Entry(1, now), (old, ignored) -> new Entry(old.failures() + 1, now));
    }

    public void recordSuccess(String key) {
        entries.remove(key);
    }

    static Duration delayFor(int failures) {
        int exponent = Math.min(Math.max(failures - FREE_FAILURES, 0), 10);
        Duration delay = BASE_DELAY.multipliedBy(1L << exponent);
        return delay.compareTo(MAX_DELAY) > 0 ? MAX_DELAY : delay;
    }

    @Scheduled(fixedDelay = 3_600_000)
    public void purgeExpired() {
        purge(clock.instant());
    }

    int size() {
        return entries.size();
    }

    private void purge(Instant now) {
        entries.entrySet().removeIf(e -> e.getValue().lastFailure().plus(RETENTION).isBefore(now));
    }

    private void evict(Instant now) {
        purge(now);
        if (entries.size() >= MAX_KEYS) {
            entries.entrySet().stream()
                    .min(Comparator.comparing(e -> e.getValue().lastFailure()))
                    .ifPresent(oldest -> entries.remove(oldest.getKey()));
        }
    }
}
