package vn.dnahoangnguyen.api.sales.bank;

import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import vn.dnahoangnguyen.api.common.config.AsyncSchedulingConfig;
import vn.dnahoangnguyen.api.common.error.DomainException;
import vn.dnahoangnguyen.api.common.error.ProblemCode;
import vn.dnahoangnguyen.api.common.error.Problems;
import vn.dnahoangnguyen.api.sales.bank.BankTransactionRepository.NewBankTx;

/**
 * SePay bank notification endpoint. Authenticated only by API key; the raw body and the Authorization header are never
 * logged. Replies {@code {"success":true}} as soon as the notification is stored, whatever matching decides.
 */
@RestController
@RequestMapping("/api/webhooks/bank")
public class SepayWebhookController {

    static final int MAX_BODY_BYTES = 64 * 1024;

    private static final Logger log = LoggerFactory.getLogger(SepayWebhookController.class);

    private final SepayProperties properties;
    private final WebhookAuthenticator authenticator;
    private final BankTransactionIngestService ingest;
    private final ObjectMapper mapper;

    public SepayWebhookController(SepayProperties properties, WebhookAuthenticator authenticator,
                                  BankTransactionIngestService ingest, ObjectMapper mapper) {
        this.properties = properties;
        this.authenticator = authenticator;
        this.ingest = ingest;
        this.mapper = mapper;
    }

    @PostMapping("/sepay")
    public ResponseEntity<Map<String, Object>> receive(HttpServletRequest request) throws IOException {
        if (!properties.enabled()) {
            throw DomainException.notFound(Problems.DETAIL_NOT_FOUND);
        }
        if (!authenticator.authorized(request.getHeader(HttpHeaders.AUTHORIZATION))) {
            throw new DomainException(HttpStatus.UNAUTHORIZED, ProblemCode.UNAUTHENTICATED,
                    "Khóa xác thực không hợp lệ.");
        }
        byte[] body = request.getInputStream().readNBytes(MAX_BODY_BYTES + 1);
        if (body.length > MAX_BODY_BYTES) {
            throw new DomainException(HttpStatus.PAYLOAD_TOO_LARGE, ProblemCode.VALIDATION_FAILED,
                    "Nội dung yêu cầu quá lớn.");
        }
        NewBankTx tx = parse(body);
        Optional<Long> id = ingest.store(tx);
        if (id.isPresent()) {
            ingest.processQuietly(id.get());
        } else {
            log.info("Bank notification replay ignored (account {})", BankTransactionRepository.maskAccount(tx.accountNo()));
        }
        return ResponseEntity.ok(Map.of("success", true));
    }

    private NewBankTx parse(byte[] body) {
        JsonNode root;
        try {
            root = mapper.readTree(body);
        } catch (RuntimeException e) {
            throw invalid();
        }
        if (root == null || !root.isObject()) {
            throw invalid();
        }
        String vendorTxId = text(root, "id");
        String accountNo = text(root, "accountNumber");
        String type = text(root, "transferType");
        JsonNode amountNode = root.get("transferAmount");
        if (vendorTxId == null || vendorTxId.length() > 64 || type == null || amountNode == null
                || !amountNode.isNumber() || amountNode.asLong() < 0) {
            throw invalid();
        }
        String direction = switch (type.toLowerCase(Locale.ROOT)) {
            case "in" -> "IN";
            case "out" -> "OUT";
            default -> throw invalid();
        };
        String content = text(root, "content");
        return new NewBankTx(vendorTxId, truncate(text(root, "referenceCode"), 120), truncate(text(root, "gateway"), 80),
                truncate(accountNo, 60), direction, amountNode.asLong(), content == null ? "" : content,
                truncate(text(root, "code"), 120), transactionTime(text(root, "transactionDate")),
                new String(body, StandardCharsets.UTF_8));
    }

    /** SePay sends {@code 2026-10-31 14:02:37} in Vietnam time; anything unreadable falls back to now. */
    private static OffsetDateTime transactionTime(String value) {
        if (value != null) {
            try {
                return LocalDateTime.parse(value.strip().replace(' ', 'T'))
                        .atZone(AsyncSchedulingConfig.BUSINESS_ZONE).toOffsetDateTime();
            } catch (DateTimeParseException e) {
                // fall through
            }
        }
        return OffsetDateTime.now(AsyncSchedulingConfig.BUSINESS_ZONE);
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value == null || value.isNull() ? null : value.asText();
    }

    private static String truncate(String value, int max) {
        return value == null || value.length() <= max ? value : value.substring(0, max);
    }

    private static DomainException invalid() {
        return DomainException.badRequest(ProblemCode.VALIDATION_FAILED, Problems.DETAIL_VALIDATION);
    }
}
