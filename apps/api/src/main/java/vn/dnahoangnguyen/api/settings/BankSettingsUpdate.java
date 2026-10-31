package vn.dnahoangnguyen.api.settings;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Body of {@code PUT /api/admin/settings/bank}; {@code currentPassword} is the caller's own password. */
public record BankSettingsUpdate(
        @NotBlank(message = "Vui lòng nhập tên ngân hàng.")
        @Size(max = 100, message = "Tên ngân hàng tối đa 100 ký tự.") String bankName,
        @NotBlank(message = "Vui lòng nhập mã BIN ngân hàng.")
        @Pattern(regexp = "\\d{6}|", message = "Mã BIN ngân hàng gồm đúng 6 chữ số.") String bin,
        @NotBlank(message = "Vui lòng nhập số tài khoản.")
        @Pattern(regexp = "[0-9A-Za-z]{4,19}|", message = "Số tài khoản gồm 4 đến 19 chữ số hoặc chữ cái, không có khoảng trắng.")
        String accountNo,
        @NotBlank(message = "Vui lòng nhập tên chủ tài khoản.")
        @Size(max = 100, message = "Tên chủ tài khoản tối đa 100 ký tự.") String accountName,
        @NotBlank(message = "Vui lòng nhập mật khẩu để xác nhận.") String currentPassword) {
}
