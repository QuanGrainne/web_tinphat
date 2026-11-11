package vn.dnahoangnguyen.api.settings;

import java.util.List;

/** Storefront-safe subset of the settings. {@code zalo} and {@code facebook} are null when not configured. */
public record PublicSettings(CompanyInfo company, String hotline, String zalo, String facebook, List<String> trustStrip) {
}
