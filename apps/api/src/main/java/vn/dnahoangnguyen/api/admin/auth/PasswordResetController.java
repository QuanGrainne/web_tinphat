package vn.dnahoangnguyen.api.admin.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import vn.dnahoangnguyen.api.common.ratelimit.ClientIpResolver;

/** Forgotten password, open to anyone (under /api/auth, so CSRF still applies). */
@RestController
@RequestMapping("/api/auth/password-reset")
public class PasswordResetController {

    public record ResetRequest(@NotBlank(message = "Vui lòng nhập email.") @Size(max = 200) String email) {
    }

    public record ResetConfirm(
            @NotBlank(message = "Liên kết không hợp lệ.") @Size(max = 200) String token,
            @NotBlank(message = "Vui lòng nhập mật khẩu mới.")
            @Size(min = 8, max = PasswordService.MAX_PASSWORD_BYTES, message = "Mật khẩu mới phải có từ 8 đến 72 ký tự.")
            String newPassword) {
    }

    private final PasswordResetService resets;
    private final ClientIpResolver ips;

    public PasswordResetController(PasswordResetService resets, ClientIpResolver ips) {
        this.resets = resets;
        this.ips = ips;
    }

    /** Always 204: the answer does not reveal whether the address belongs to an account. */
    @PostMapping("/request")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void request(@Valid @RequestBody ResetRequest body, HttpServletRequest request) {
        resets.request(body.email(), ips.ipKey(request));
    }

    @PostMapping("/confirm")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void confirm(@Valid @RequestBody ResetConfirm body, HttpServletRequest request) {
        resets.confirm(body.token(), body.newPassword(), ips.ipKey(request));
    }
}
