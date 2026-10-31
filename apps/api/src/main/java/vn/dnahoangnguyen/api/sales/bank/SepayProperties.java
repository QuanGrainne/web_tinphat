package vn.dnahoangnguyen.api.sales.bank;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * SePay settings, env only. When {@code enabled} is false the webhook endpoint answers 404 and the manual
 * "Đã nhận tiền" flow is the only way to mark an order paid.
 */
@ConfigurationProperties(prefix = "dna.sepay")
public record SepayProperties(
        @DefaultValue("false") boolean enabled,
        @DefaultValue List<String> webhookKeys,
        @DefaultValue("") String accountNo) {
}
