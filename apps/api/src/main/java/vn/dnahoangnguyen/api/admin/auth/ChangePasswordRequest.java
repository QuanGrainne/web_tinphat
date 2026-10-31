package vn.dnahoangnguyen.api.admin.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        @NotBlank(message = "Vui lòng nhập mật khẩu hiện tại.") String currentPassword,
        @NotBlank(message = "Vui lòng nhập mật khẩu mới.")
        @Size(min = 12, max = 128, message = "Mật khẩu mới phải có từ 12 đến 128 ký tự.") String newPassword) {
}
