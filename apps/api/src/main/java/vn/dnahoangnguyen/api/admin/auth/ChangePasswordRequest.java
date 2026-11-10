package vn.dnahoangnguyen.api.admin.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        @NotBlank(message = "Vui lòng nhập mật khẩu hiện tại.") String currentPassword,
        @NotBlank(message = "Vui lòng nhập mật khẩu mới.")
        @Size(min = 8, max = PasswordService.MAX_PASSWORD_BYTES, message = "Mật khẩu mới phải có từ 8 đến 72 ký tự.")
        String newPassword) {
}
