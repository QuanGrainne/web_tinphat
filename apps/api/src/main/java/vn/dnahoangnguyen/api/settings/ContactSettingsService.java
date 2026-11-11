package vn.dnahoangnguyen.api.settings;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;
import java.util.Set;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.dnahoangnguyen.api.admin.audit.AuditService;
import vn.dnahoangnguyen.api.common.error.DomainException;
import vn.dnahoangnguyen.api.common.error.ProblemCode;

/** Hotline, Zalo, Facebook, WhatsApp, WeChat, email and address of the storefront: MANAGER only, audited. */
@Service
public class ContactSettingsService {

    private static final Set<String> ZALO_HOSTS = Set.of("zalo.me", "chat.zalo.me", "oa.zalo.me");
    private static final Set<String> FACEBOOK_HOSTS = Set.of("facebook.com", "www.facebook.com", "m.facebook.com",
            "web.facebook.com", "fb.com", "www.fb.com", "fb.me", "m.me");
    private static final Set<String> WHATSAPP_HOSTS = Set.of("wa.me", "api.whatsapp.com", "whatsapp.com",
            "www.whatsapp.com", "chat.whatsapp.com");
    /** WeChat's own rule for an ID: 6 to 20 characters, a letter first, then letters, digits, _ or -. */
    private static final String WECHAT_ID = "[A-Za-z][A-Za-z0-9_-]{5,19}";

    private final SettingsService settings;
    private final AuditService audit;

    public ContactSettingsService(SettingsService settings, AuditService audit) {
        this.settings = settings;
        this.audit = audit;
    }

    @PreAuthorize("hasRole('MANAGER')")
    @Transactional(readOnly = true)
    public ContactSettings current() {
        CompanyInfo company = settings.company();
        return new ContactSettings(settings.hotline(), settings.zalo().orElse(""), settings.facebook().orElse(""),
                settings.whatsapp().orElse(""), settings.wechat().orElse(""), company.email(), company.address());
    }

    @PreAuthorize("hasRole('MANAGER')")
    @Transactional
    public ContactSettings update(ContactSettings request) {
        String hotline = phone(request.hotline(), "Số hotline");
        String zalo = zalo(request.zalo());
        String facebook = facebook(request.facebook());
        String whatsapp = whatsapp(request.whatsapp());
        String wechat = wechat(request.wechat());
        String email = request.email().trim();
        String address = request.address().trim();

        ContactSettings before = current();
        CompanyInfo company = settings.company();
        settings.put(SettingsService.KEY_HOTLINE, hotline);
        settings.put(SettingsService.KEY_ZALO, zalo);
        settings.put(SettingsService.KEY_FACEBOOK, facebook);
        settings.put(SettingsService.KEY_WHATSAPP, whatsapp);
        settings.put(SettingsService.KEY_WECHAT, wechat);
        // the company record keeps the same number, so no older phone shows up anywhere
        settings.put(SettingsService.KEY_COMPANY, new CompanyInfo(company.name(), company.taxCode(), address,
                company.warehouse(), hotline, email));
        ContactSettings after = new ContactSettings(hotline, zalo, facebook, whatsapp, wechat, email, address);
        audit.record("SETTINGS_CONTACT", "SETTING", null, before, after);
        return after;
    }

    /** Digits with optional spaces, dots, dashes or a leading +; 9 to 12 digits. Returned trimmed as typed. */
    private static String phone(String raw, String field) {
        return phone(raw, field, 12, "0914 794 472");
    }

    private static String phone(String raw, String field, int maxDigits, String example) {
        String value = raw == null ? "" : raw.trim();
        if (!isPhone(value, maxDigits)) {
            throw invalid(field + " không hợp lệ. Ví dụ: " + example + ".");
        }
        return value;
    }

    private static boolean isPhone(String value, int maxDigits) {
        int digits = value.replaceAll("\\D", "").length();
        return value.matches("\\+?[0-9 .\\-()]+") && digits >= 9 && digits <= maxDigits;
    }

    /** Empty, a phone number (up to 15 digits: foreign numbers too), or an https link on wa.me / whatsapp.com. */
    private static String whatsapp(String raw) {
        String value = raw == null ? "" : raw.trim();
        if (value.isEmpty()) {
            return "";
        }
        if (value.toLowerCase(Locale.ROOT).startsWith("http")) {
            return link(value, WHATSAPP_HOSTS,
                    "Link WhatsApp phải có dạng https://wa.me/84914794472 hoặc nhập số điện thoại WhatsApp.");
        }
        return phone(value, "Số WhatsApp", 15, "+84 914 794 472");
    }

    /** Empty, a WeChat ID, or the phone number the WeChat account was opened with. */
    private static String wechat(String raw) {
        String value = raw == null ? "" : raw.trim();
        if (value.isEmpty() || value.matches(WECHAT_ID) || isPhone(value, 15)) {
            return value;
        }
        throw invalid("WeChat ID gồm 6–20 ký tự, bắt đầu bằng chữ cái, chỉ có chữ, số, _ hoặc -; "
                + "hoặc nhập số điện thoại WeChat.");
    }

    /** Empty, a phone number, or an https link on zalo.me. */
    private static String zalo(String raw) {
        String value = raw == null ? "" : raw.trim();
        if (value.isEmpty()) {
            return "";
        }
        if (value.toLowerCase(Locale.ROOT).startsWith("http")) {
            return link(value, ZALO_HOSTS, "Link Zalo phải có dạng https://zalo.me/... hoặc nhập số điện thoại Zalo.");
        }
        return phone(value, "Số Zalo");
    }

    /** Empty or an https link to a Facebook page (facebook.com, fb.com, fb.me, m.me). */
    private static String facebook(String raw) {
        String value = raw == null ? "" : raw.trim();
        if (value.isEmpty()) {
            return "";
        }
        return link(value, FACEBOOK_HOSTS, "Link Facebook phải có dạng https://www.facebook.com/ten-trang.");
    }

    private static String link(String value, Set<String> hosts, String message) {
        try {
            URI uri = new URI(value);
            String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
            boolean hasPath = uri.getPath() != null && uri.getPath().length() > 1;
            if (!"https".equalsIgnoreCase(uri.getScheme()) || !hosts.contains(host) || !hasPath || uri.getUserInfo() != null) {
                throw invalid(message);
            }
            return value;
        } catch (URISyntaxException e) {
            throw invalid(message);
        }
    }

    private static DomainException invalid(String detail) {
        return DomainException.badRequest(ProblemCode.VALIDATION_FAILED, detail);
    }
}
