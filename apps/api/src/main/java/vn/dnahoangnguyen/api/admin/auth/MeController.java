package vn.dnahoangnguyen.api.admin.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.dnahoangnguyen.api.common.security.CurrentUser;
import vn.dnahoangnguyen.api.common.security.SessionValidityFilter;

@RestController
@RequestMapping("/api/admin/me")
public class MeController {

    private final PasswordService passwords;
    private final Clock clock;

    private final PasswordResetService resets;

    public MeController(PasswordService passwords, Clock clock, PasswordResetService resets) {
        this.passwords = passwords;
        this.clock = clock;
        this.resets = resets;
    }

    public record RecoveryEmail(String email) {
    }

    public record RecoveryEmailUpdate(String email, String currentPassword) {
    }

    @GetMapping("/recovery-email")
    public RecoveryEmail recoveryEmail() {
        return new RecoveryEmail(resets.recoveryEmail(requireUser().id()));
    }

    @PutMapping("/recovery-email")
    public RecoveryEmail setRecoveryEmail(@RequestBody RecoveryEmailUpdate body) {
        return new RecoveryEmail(resets.setRecoveryEmail(requireUser().id(), body.email(), body.currentPassword()));
    }

    @GetMapping
    public AdminSession me() {
        return AdminSession.of(requireUser());
    }

    @PostMapping("/password")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest body,
                                               HttpServletRequest request) {
        CurrentUser user = requireUser();
        Instant now = clock.instant().truncatedTo(ChronoUnit.MICROS);
        passwords.change(user.id(), body.currentPassword(), body.newPassword(), now);
        // keep the caller signed in: new session id, and a login time that is not older than the password change
        HttpSession session = request.getSession(false);
        if (session != null) {
            request.changeSessionId();
            session.setAttribute(SessionValidityFilter.AUTH_TIME_ATTR, now);
        }
        return ResponseEntity.noContent().build();
    }

    private static CurrentUser requireUser() {
        return CurrentUser.current()
                .orElseThrow(() -> new AuthenticationCredentialsNotFoundException("No admin session"));
    }
}
