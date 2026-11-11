package vn.dnahoangnguyen.api.settings;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * The contact details shown on the storefront (header, contact band, footer, floating buttons). Body and answer of
 * {@code /api/admin/settings/contact}. {@code zalo} is a phone number or a zalo.me link, {@code whatsapp} a phone
 * number or a wa.me link, {@code wechat} a WeChat ID or phone number (WeChat has no web link to a chat). The four
 * social fields may be empty.
 */
public record ContactSettings(
        @NotBlank(message = "Vui lòng nhập số hotline.")
        @Size(max = 20, message = "Số hotline tối đa 20 ký tự.") String hotline,
        @Size(max = 200, message = "Zalo tối đa 200 ký tự.") String zalo,
        @Size(max = 300, message = "Link Facebook tối đa 300 ký tự.") String facebook,
        @Size(max = 200, message = "WhatsApp tối đa 200 ký tự.") String whatsapp,
        @Size(max = 40, message = "WeChat tối đa 40 ký tự.") String wechat,
        @NotBlank(message = "Vui lòng nhập email.")
        @Email(message = "Email không hợp lệ.")
        @Size(max = 200, message = "Email tối đa 200 ký tự.") String email,
        @NotBlank(message = "Vui lòng nhập địa chỉ.")
        @Size(max = 300, message = "Địa chỉ tối đa 300 ký tự.") String address) {
}
