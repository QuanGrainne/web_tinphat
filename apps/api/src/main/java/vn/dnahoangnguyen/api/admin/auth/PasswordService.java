package vn.dnahoangnguyen.api.admin.auth;

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

    private static final String DETAIL_SAME_PASSWORD = "Mật khẩu mới phải khác mật khẩu hiện tại.";

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

    /** Changes the password and stamps {@code now}, which ends every session of this user that started earlier. */
    @Transactional
    public void change(long userId, String currentPassword, String newPassword, Instant now) {
        AppUser user = users.findById(userId)
                .orElseThrow(() -> DomainException.notFound("Không tìm thấy tài khoản."));
        confirmation.verify(user, currentPassword);
        if (encoder.matches(newPassword, user.getPasswordHash())) {
            throw DomainException.badRequest(ProblemCode.VALIDATION_FAILED, DETAIL_SAME_PASSWORD)
                    .withFieldError("newPassword", DETAIL_SAME_PASSWORD);
        }
        user.changePassword(encoder.encode(newPassword), now);
        audit.record("PASSWORD_CHANGE", "USER", user.getId(), null, null);
    }
}
