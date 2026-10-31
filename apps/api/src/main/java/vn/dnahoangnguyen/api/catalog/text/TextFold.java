package vn.dnahoangnguyen.api.catalog.text;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

/** Diacritic-insensitive text for search and slugs: "Giấy rút đáy" becomes "giay rut day". */
public final class TextFold {

    private static final Pattern MARKS = Pattern.compile("[\\u0300-\\u036f]");
    private static final Pattern SPACES = Pattern.compile("\\s+");

    private TextFold() {
    }

    public static String fold(String text) {
        if (text == null) {
            return "";
        }
        String decomposed = MARKS.matcher(Normalizer.normalize(text, Normalizer.Form.NFD)).replaceAll("");
        String ascii = decomposed.replace('đ', 'd').replace('Đ', 'd').toLowerCase(Locale.ROOT);
        return SPACES.matcher(ascii).replaceAll(" ").strip();
    }
}
