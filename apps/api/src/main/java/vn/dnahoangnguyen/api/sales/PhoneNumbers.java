package vn.dnahoangnguyen.api.sales;

import java.util.Optional;
import java.util.regex.Pattern;

/** Vietnamese phone numbers: stored raw for display and normalised ({@code 0912345678}) for lookups. */
public final class PhoneNumbers {

    private static final Pattern VALID = Pattern.compile("^0\\d{9,10}$");

    private PhoneNumbers() {
    }

    /** Digits only, leading {@code +84} or {@code 84} turned into {@code 0}; empty when the result is not a valid number. */
    public static Optional<String> normalize(String raw) {
        if (raw == null) {
            return Optional.empty();
        }
        String digits = raw.replaceAll("\\D", "");
        if (digits.startsWith("84")) {
            digits = "0" + digits.substring(2);
        }
        return VALID.matcher(digits).matches() ? Optional.of(digits) : Optional.empty();
    }

    /** {@code 0912345678} becomes {@code 0912 *** 678}. */
    public static String mask(String phoneNorm) {
        if (phoneNorm == null || phoneNorm.length() < 8) {
            return "";
        }
        return phoneNorm.substring(0, 4) + " *** " + phoneNorm.substring(phoneNorm.length() - 3);
    }
}
