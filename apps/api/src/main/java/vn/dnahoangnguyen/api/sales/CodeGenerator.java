package vn.dnahoangnguyen.api.sales;

import java.security.SecureRandom;
import java.util.Locale;
import java.util.function.Predicate;
import java.util.random.RandomGenerator;
import org.springframework.stereotype.Component;

/**
 * Order and quote codes: a fixed prefix plus six Crockford base32 characters (no I, L, O, U), so a code read out
 * loud or typed from a bank statement is hard to get wrong.
 */
@Component
public class CodeGenerator {

    public static final String ORDER_PREFIX = "DNA";
    public static final String QUOTE_PREFIX = "BG";
    public static final String ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
    public static final int SUFFIX_LENGTH = 6;
    /** A collision is retried this many times before giving up (so at most {@code 1 + MAX_RETRIES} draws). */
    public static final int MAX_RETRIES = 5;

    private final RandomGenerator random;

    public CodeGenerator() {
        this(new SecureRandom());
    }

    CodeGenerator(RandomGenerator random) {
        this.random = random;
    }

    public String generate(String prefix) {
        StringBuilder code = new StringBuilder(prefix);
        for (int i = 0; i < SUFFIX_LENGTH; i++) {
            code.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
        }
        return code.toString();
    }

    /** Draws codes until {@code exists} says the code is free; fails after {@link #MAX_RETRIES} collisions. */
    public String generateUnique(String prefix, Predicate<String> exists) {
        for (int attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            String code = generate(prefix);
            if (!exists.test(code)) {
                return code;
            }
        }
        throw new IllegalStateException("Could not allocate a free " + prefix + " code after " + (MAX_RETRIES + 1)
                + " draws");
    }

    /**
     * Normalises a code typed by a person: upper case, spaces and hyphens dropped, then the characters Crockford
     * base32 does not contain are mapped to their look-alikes ({@code O} to {@code 0}, {@code I}/{@code L} to {@code 1}).
     */
    public static String normalize(String raw) {
        if (raw == null) {
            return "";
        }
        String upper = raw.toUpperCase(Locale.ROOT).replaceAll("[\\s-]+", "");
        return foldLookAlikes(upper);
    }

    /** {@code O} to {@code 0}, {@code I} and {@code L} to {@code 1}; expects upper case input. */
    public static String foldLookAlikes(String upper) {
        StringBuilder out = new StringBuilder(upper.length());
        for (int i = 0; i < upper.length(); i++) {
            char c = upper.charAt(i);
            out.append(switch (c) {
                case 'O' -> '0';
                case 'I', 'L' -> '1';
                default -> c;
            });
        }
        return out.toString();
    }
}
