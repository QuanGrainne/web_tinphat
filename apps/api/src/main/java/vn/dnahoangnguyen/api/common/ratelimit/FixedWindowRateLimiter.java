package vn.dnahoangnguyen.api.common.ratelimit;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * In-memory fixed-window counter. The window of a key starts at its first hit and lasts {@code window};
 * the next hit after it ends starts a fresh window. State is lost on restart (acceptable for one JVM).
 */
@Component
public class FixedWindowRateLimiter {

    private record Window(Instant expiresAt, int count) {
    }

    private final Clock clock;
    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

    public FixedWindowRateLimiter(Clock clock) {
        this.clock = clock;
    }

    /** Counts one hit and returns {@code true} when it is within {@code max} for the current window. */
    public boolean tryAcquire(String key, int max, Duration window) {
        boolean[] allowed = new boolean[1];
        Instant now = clock.instant();
        windows.compute(key, (k, current) -> {
            Window active = isActive(current, now) ? current : new Window(now.plus(window), 0);
            if (active.count() >= max) {
                allowed[0] = false;
                return active;
            }
            allowed[0] = true;
            return new Window(active.expiresAt(), active.count() + 1);
        });
        return allowed[0];
    }

    /** Hits counted in the current window without counting a new one. */
    public int peek(String key, Duration window) {
        Window current = windows.get(key);
        return isActive(current, clock.instant()) ? current.count() : 0;
    }

    /** Counts one hit unconditionally (for events recorded after the fact, such as failures). */
    public void record(String key, Duration window) {
        Instant now = clock.instant();
        windows.compute(key, (k, current) -> {
            Window active = isActive(current, now) ? current : new Window(now.plus(window), 0);
            return new Window(active.expiresAt(), active.count() + 1);
        });
    }

    /** Time until the current window of {@code key} ends; {@link Duration#ZERO} when none is active. */
    public Duration remaining(String key) {
        Instant now = clock.instant();
        Window current = windows.get(key);
        return isActive(current, now) ? Duration.between(now, current.expiresAt()) : Duration.ZERO;
    }

    @Scheduled(fixedDelay = 60_000)
    public void purgeExpired() {
        Instant now = clock.instant();
        windows.entrySet().removeIf(e -> !isActive(e.getValue(), now));
    }

    int size() {
        return windows.size();
    }

    private static boolean isActive(Window window, Instant now) {
        return window != null && now.isBefore(window.expiresAt());
    }
}
