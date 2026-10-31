package vn.dnahoangnguyen.api.sales.bank;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.stereotype.Component;

/** Checks {@code Authorization: Apikey <key>} against the configured keys (one or two, for rotation) in constant time. */
@Component
public class WebhookAuthenticator {

    private static final String SCHEME = "Apikey ";

    private final SepayProperties properties;

    public WebhookAuthenticator(SepayProperties properties) {
        this.properties = properties;
    }

    public boolean authorized(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.regionMatches(true, 0, SCHEME, 0, SCHEME.length())) {
            return false;
        }
        byte[] provided = authorizationHeader.substring(SCHEME.length()).strip().getBytes(StandardCharsets.UTF_8);
        boolean matched = false;
        for (String key : properties.webhookKeys()) {
            if (key != null && !key.isBlank()) {
                // every key is compared so the time taken does not reveal which one matched
                matched |= MessageDigest.isEqual(provided, key.strip().getBytes(StandardCharsets.UTF_8));
            }
        }
        return matched;
    }
}
