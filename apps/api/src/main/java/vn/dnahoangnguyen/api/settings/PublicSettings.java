package vn.dnahoangnguyen.api.settings;

import java.util.List;

/** Storefront-safe subset of the settings. {@code zalo} is null when not configured. */
public record PublicSettings(CompanyInfo company, String hotline, String zalo, List<String> trustStrip) {
}
