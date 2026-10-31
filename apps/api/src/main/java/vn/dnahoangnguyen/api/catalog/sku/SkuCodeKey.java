package vn.dnahoangnguyen.api.catalog.sku;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Uniqueness key of a SKU code. The raw code is stored and shown verbatim; only the key is normalised so that
 * invisible or look-alike characters cannot create duplicates ("SV465-4L- Gói" typed with a non-breaking space).
 */
public final class SkuCodeKey {

    private static final Pattern SPACE_RUNS = Pattern.compile(" {2,}");

    private SkuCodeKey() {
    }

    public static String of(String raw) {
        if (raw == null) {
            return "";
        }
        String nfc = Normalizer.normalize(raw, Normalizer.Form.NFC);
        StringBuilder sb = new StringBuilder(nfc.length());
        for (int i = 0; i < nfc.length(); i++) {
            char c = nfc.charAt(i);
            switch (c) {
                case ' ', ' ', ' ', '\t', '\r', '\n' -> sb.append(' ');
                case '​', '‌', '‍', '﻿' -> {
                    // zero-width characters are dropped
                }
                case '‐', '‑', '‒', '–', '—', '―', '−' -> sb.append('-');
                default -> sb.append(c);
            }
        }
        return SPACE_RUNS.matcher(sb.toString().strip()).replaceAll(" ").toUpperCase(Locale.ROOT);
    }
}
