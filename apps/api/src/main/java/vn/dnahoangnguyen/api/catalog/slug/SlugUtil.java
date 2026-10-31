package vn.dnahoangnguyen.api.catalog.slug;

import java.util.function.Predicate;
import java.util.regex.Pattern;
import vn.dnahoangnguyen.api.catalog.text.TextFold;

/** URL slugs: ASCII, lowercase, hyphen separated, at most 80 characters. */
public final class SlugUtil {

    public static final int MAX_LENGTH = 80;

    private static final Pattern NON_ALNUM = Pattern.compile("[^a-z0-9]+");

    private SlugUtil() {
    }

    /** Slug of {@code input}; {@code fallback} when nothing usable is left (for example "!!!"). */
    public static String slugify(String input, String fallback) {
        String slug = trimHyphens(NON_ALNUM.matcher(TextFold.fold(input)).replaceAll("-"));
        if (slug.length() > MAX_LENGTH) {
            String cut = slug.substring(0, MAX_LENGTH);
            if (slug.charAt(MAX_LENGTH) != '-') {
                int lastHyphen = cut.lastIndexOf('-');
                if (lastHyphen > 0) {
                    cut = cut.substring(0, lastHyphen);
                }
            }
            slug = trimHyphens(cut);
        }
        return slug.isEmpty() ? fallback : slug;
    }

    /** {@code base}, else {@code base-2}, {@code base-3}... the first one {@code taken} does not claim. */
    public static String unique(String base, Predicate<String> taken) {
        if (!taken.test(base)) {
            return base;
        }
        for (int n = 2; ; n++) {
            String candidate = base + "-" + n;
            if (!taken.test(candidate)) {
                return candidate;
            }
        }
    }

    private static String trimHyphens(String s) {
        int start = 0;
        int end = s.length();
        while (start < end && s.charAt(start) == '-') {
            start++;
        }
        while (end > start && s.charAt(end - 1) == '-') {
            end--;
        }
        return s.substring(start, end);
    }
}
