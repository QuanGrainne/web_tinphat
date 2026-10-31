package vn.dnahoangnguyen.api.admin.auth;

import java.time.Duration;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import vn.dnahoangnguyen.api.admin.user.AppUser;
import vn.dnahoangnguyen.api.common.error.DomainException;
import vn.dnahoangnguyen.api.common.error.Problems;
import vn.dnahoangnguyen.api.common.ratelimit.FixedWindowRateLimiter;

/**
 * Re-entry of the current password before a sensitive change. Attempts are capped per user so a stolen session cannot
 * be used to guess the password; a wrong password is a generic 403.
 */
@Service
public class PasswordConfirmation {

    static final int MAX_ATTEMPTS = 5;
    static final Duration WINDOW = Duration.ofMinutes(15);
    public static final String DETAIL_WRONG_PASSWORD = "Mật khẩu xác nhận không đúng.";

    private final PasswordEncoder encoder;
    private final FixedWindowRateLimiter limiter;

    public PasswordConfirmation(PasswordEncoder encoder, FixedWindowRateLimiter limiter) {
        this.encoder = encoder;
        this.limiter = limiter;
    }

    public void verify(AppUser user, String rawPassword) {
        String key = "password-confirm:" + user.getId();
        if (!limiter.tryAcquire(key, MAX_ATTEMPTS, WINDOW)) {
            throw DomainException.tooManyRequests(Problems.DETAIL_RATE_LIMITED, limiter.remaining(key));
        }
        if (rawPassword == null || !encoder.matches(rawPassword, user.getPasswordHash())) {
            throw DomainException.forbidden(DETAIL_WRONG_PASSWORD);
        }
    }
}
