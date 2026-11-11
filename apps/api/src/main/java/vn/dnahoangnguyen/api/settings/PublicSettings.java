package vn.dnahoangnguyen.api.settings;

import java.util.List;

/**
 * Storefront-safe subset of the settings. {@code zalo}, {@code facebook}, {@code whatsapp} and {@code wechat} are null
 * when not configured.
 */
public record PublicSettings(CompanyInfo company, String hotline, String zalo, String facebook, String whatsapp,
        String wechat, List<String> trustStrip) {
}
