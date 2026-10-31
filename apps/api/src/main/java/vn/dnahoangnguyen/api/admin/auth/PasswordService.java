package vn.dnahoangnguyen.api.admin.auth;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.dnahoangnguyen.api.admin.audit.AuditService;
import vn.dnahoangnguyen.api.admin.user.AppUser;
import vn.dnahoangnguyen.api.admin.user.AppUserRepository;
import vn.dnahoangnguyen.api.common.error.DomainException;
import vn.dnahoangnguyen.api.common.error.ProblemCode;

@Service
public class PasswordService {

    /** bcrypt reads at most 72 bytes of the password and the encoder refuses more, so longer ones are rejected up front. */
    public static final int MAX_PASSWORD_BYTES = 72;

    private static final String DETAIL_SAME_PASSWORD = "Mật khẩu mới phải khác mật khẩu hiện tại.";
    private static final String DETAIL_PASSWORD_TOO_LONG =
            "Mật khẩu mới tối đa 72 byte (ký tự có dấu chiếm 2-3 byte); vui lòng chọn mật khẩu ngắn hơn.";

    private final AppUserRepository users;
    private final PasswordEncoder encoder;
    private final PasswordConfirmation confirmation;
    private final AuditService audit;

    public PasswordService(AppUserRepository users, PasswordEncoder encoder, PasswordConfirmation confirmation,
                           AuditService audit) {
        this.users = users;
        this.encoder = encoder;
        this.confirmation = confirmation;
        this.audit = audit;
    }

    /** True when bcrypt can hash the whole password (at most {@link #MAX_PASSWORD_BYTES} UTF-8 bytes). */
    public static boolean fitsBcrypt(String password) {
        return password.getBytes(StandardCharsets.UTF_8).length <= MAX_PASSWORD_BYTES;
    }

    /** Changes the password and stamps {@code now}, which ends every session of this user that started earlier. */
    @Transactional
    public void change(long userId, String currentPassword, String newPassword, Instant now) {
        AppUser user = users.findById(userId)
                .orElseThrow(() -> DomainException.notFound("Không tìm thấy tài khoản."));
        confirmation.verify(user, currentPassword);
        if (!fitsBcrypt(newPassword)) {
            throw DomainException.badRequest(ProblemCode.VALIDATION_FAILED, DETAIL_PASSWORD_TOO_LONG)
                    .withFieldError("newPassword", DETAIL_PASSWORD_TOO_LONG);
        }
        if (encoder.matches(newPassword, user.getPasswordHash())) {
            throw DomainException.badRequest(ProblemCode.VALIDATION_FAILED, DETAIL_SAME_PASSWORD)
                    .withFieldError("newPassword", DETAIL_SAME_PASSWORD);
        }
        user.changePassword(encoder.encode(newPassword), now);
        audit.record("PASSWORD_CHANGE", "USER", user.getId(), null, null);
    }
}
