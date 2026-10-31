package vn.dnahoangnguyen.api.sales.bank;

import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Component;

/**
 * With SePay enabled under the {@code prod} profile the webhook keys must be real secrets: at least
 * {@value #MIN_KEY_LENGTH} characters and none of the placeholder words from the example files. Anything else stops
 * the application at startup. Other profiles keep the plain "not blank" rule of {@link SepayProperties}.
 */
@Component
public class SepayKeyGuard {

    static final int MIN_KEY_LENGTH = 32;
    private static final List<String> PLACEHOLDERS = List.of("change-me", "dev-", "example", "test", "secret");

    public SepayKeyGuard(SepayProperties properties, Environment environment) {
        if (properties.enabled() && environment.acceptsProfiles(Profiles.of("prod"))) {
            problem(properties.webhookKeys()).ifPresent(message -> {
                throw new IllegalStateException(message);
            });
        }
    }

    /** What is wrong with the keys, naming the key's position but never its value; empty when all are acceptable. */
    static Optional<String> problem(List<String> keys) {
        for (int i = 0; i < keys.size(); i++) {
            String key = keys.get(i);
            if (key.length() < MIN_KEY_LENGTH) {
                return Optional.of("dna.sepay.webhook-keys: key " + (i + 1) + " has fewer than " + MIN_KEY_LENGTH
                        + " characters; the prod profile needs a real random key (DNA_SEPAY_WEBHOOK_KEYS)");
            }
            String lower = key.toLowerCase(Locale.ROOT);
            for (String placeholder : PLACEHOLDERS) {
                if (lower.contains(placeholder)) {
                    return Optional.of("dna.sepay.webhook-keys: key " + (i + 1) + " contains the placeholder word '"
                            + placeholder + "'; the prod profile needs a real random key (DNA_SEPAY_WEBHOOK_KEYS)");
                }
            }
        }
        return Optional.empty();
    }
}
