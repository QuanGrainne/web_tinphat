package vn.dnahoangnguyen.api.admin.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import vn.dnahoangnguyen.api.admin.user.AppUser;
import vn.dnahoangnguyen.api.admin.user.AppUserRepository;
import vn.dnahoangnguyen.api.common.error.DomainException;
import vn.dnahoangnguyen.api.common.error.ProblemCode;
import vn.dnahoangnguyen.api.common.error.Problems;
import vn.dnahoangnguyen.api.common.ratelimit.FixedWindowRateLimiter;

/**
 * Forgotten password by email. A request always gets the same answer, whether or not the address belongs to an account.
 * The link carries a random single-use token that expires after {@link #LIFETIME}; only its hash is stored. Setting the
 * new password stamps the change, which ends every open session of that account.
 */
@Service
public class PasswordResetService {

    static final Duration LIFETIME = Duration.ofMinutes(30);
    static final String DETAIL_INVALID_LINK = "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Hãy yêu cầu liên kết mới.";
    private static final Duration WINDOW = Duration.ofMinutes(15);
    private static final int REQUESTS_PER_IP = 5;
    private static final int REQUESTS_PER_ACCOUNT = 3;
    private static final int CONFIRMS_PER_IP = 10;
    private static final int MAX_EMAIL = 200;
    private static final Pattern EMAIL = Pattern.compile("[^@\\s]+@[^@\\s]+\\.[^@\\s]+");

    private final AppUserRepository users;
    private final JdbcTemplate jdbc;
    private final PasswordResetMailer mailer;
    private final PasswordService passwords;
    private final PasswordConfirmation confirmation;
    private final FixedWindowRateLimiter limiter;
    private final Clock clock;
    private final String siteUrl;
    private final SecureRandom random = new SecureRandom();

    public PasswordResetService(AppUserRepository users, JdbcTemplate jdbc, PasswordResetMailer mailer,
                                PasswordService passwords, PasswordConfirmation confirmation,
                                FixedWindowRateLimiter limiter, Clock clock,
                                @Value("${dna.site-url:http://localhost:8000}") String siteUrl) {
        this.users = users;
        this.jdbc = jdbc;
        this.mailer = mailer;
        this.passwords = passwords;
        this.confirmation = confirmation;
        this.limiter = limiter;
        this.clock = clock;
        this.siteUrl = siteUrl.replaceAll("/+$", "");
    }

    /** Emails a reset link when the address belongs to an enabled account; otherwise does nothing, silently. */
    @Transactional
    public void request(String email, String ipKey) {
        rateLimit("password-reset-request:" + ipKey, REQUESTS_PER_IP);
        Optional<AppUser> found = users.findByEmail(email.strip()).filter(AppUser::isEnabled);
        if (found.isEmpty()) {
            return;
        }
        AppUser user = found.get();
        if (!limiter.tryAcquire("password-reset-account:" + user.getId(), REQUESTS_PER_ACCOUNT, WINDOW)) {
            return;
        }
        Instant now = clock.instant();
        // a new link replaces any earlier one
        jdbc.update("update password_reset_token set used_at = ? where user_id = ? and used_at is null", Timestamp.from(now), user.getId());
        String token = newToken();
        jdbc.update("insert into password_reset_token (user_id, token_hash, expires_at) values (?, ?, ?)",
                user.getId(), hash(token), Timestamp.from(now.plus(LIFETIME)));
        String to = user.getEmail();
        String name = user.getDisplayName();
        String link = siteUrl + "/admin/reset-password?token=" + token;
        // only mail a link whose token was really stored
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                mailer.send(to, name, link, LIFETIME);
            }
        });
    }

    /** Sets the new password if the token is known, unused and not expired, then voids every open link of the account. */
    @Transactional
    public void confirm(String token, String newPassword, String ipKey) {
        rateLimit("password-reset-confirm:" + ipKey, CONFIRMS_PER_IP);
        Instant now = clock.instant().truncatedTo(ChronoUnit.MICROS);
        List<Map<String, Object>> rows = token == null || token.isBlank() ? List.of()
                : jdbc.queryForList("select user_id, expires_at, used_at from password_reset_token where token_hash = ? for update", hash(token));
        if (rows.isEmpty()) {
            throw invalidLink();
        }
        Map<String, Object> row = rows.get(0);
        Instant expiresAt = ((Timestamp) row.get("expires_at")).toInstant();
        if (row.get("used_at") != null || !now.isBefore(expiresAt)) {
            throw invalidLink();
        }
        long userId = ((Number) row.get("user_id")).longValue();
        AppUser user = users.findById(userId).filter(AppUser::isEnabled).orElseThrow(PasswordResetService::invalidLink);
        passwords.reset(user, newPassword, now);
        jdbc.update("update password_reset_token set used_at = ? where user_id = ? and used_at is null", Timestamp.from(now), userId);
    }

    /** The recovery address of the signed-in account, or null. */
    @Transactional(readOnly = true)
    public String recoveryEmail(long userId) {
        return users.findById(userId).map(AppUser::getEmail).orElse(null);
    }

    /** Sets or clears (blank) the recovery address; the current password is required. */
    @Transactional
    public String setRecoveryEmail(long userId, String email, String currentPassword) {
        AppUser user = users.findById(userId).orElseThrow(() -> DomainException.notFound("Không tìm thấy tài khoản."));
        confirmation.verify(user, currentPassword);
        String value = email == null || email.isBlank() ? null : email.strip();
        if (value != null) {
            if (value.length() > MAX_EMAIL || !EMAIL.matcher(value).matches()) {
                String detail = "Email không hợp lệ.";
                throw DomainException.badRequest(ProblemCode.VALIDATION_FAILED, detail).withFieldError("email", detail);
            }
            Optional<AppUser> owner = users.findByEmail(value);
            if (owner.isPresent() && !owner.get().getId().equals(userId)) {
                throw DomainException.conflict(ProblemCode.DUPLICATE, "Email này đã được dùng cho tài khoản khác.");
            }
        }
        user.setEmail(value);
        users.save(user);
        return value;
    }

    private void rateLimit(String key, int max) {
        if (!limiter.tryAcquire(key, max, WINDOW)) {
            throw DomainException.tooManyRequests(Problems.DETAIL_RATE_LIMITED, limiter.remaining(key));
        }
    }

    private String newToken() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    static String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is missing", e);
        }
    }

    private static DomainException invalidLink() {
        return DomainException.badRequest(ProblemCode.VALIDATION_FAILED, DETAIL_INVALID_LINK);
    }
}
