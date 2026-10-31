package vn.dnahoangnguyen.api.sales.bank;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import vn.dnahoangnguyen.api.sales.CodeGenerator;
import vn.dnahoangnguyen.api.sales.order.OrderStatus;
import vn.dnahoangnguyen.api.sales.order.PaymentMethod;

/**
 * Decides what a bank notification means for an order. Pure: the order lookup is passed in. An order is paid
 * automatically only when everything lines up; every other case goes to a person (REVIEW) and never touches the order.
 */
public final class PaymentMatcher {

    public enum Reason {
        NO_CODE,
        MULTIPLE_CODES,
        UNKNOWN_CODE,
        NOT_BANK_TRANSFER,
        NOT_CONFIRMED,
        ALREADY_PAID,
        AMOUNT_MISMATCH,
        WRONG_ACCOUNT,
        OUT_WITH_CODE
    }

    /** The parts of a bank notification the matcher looks at. */
    public record Incoming(String accountNo, boolean incoming, long amount, String content) {
    }

    public record OrderFacts(long id, String code, PaymentMethod method, OrderStatus status, long total) {
    }

    /** Receiving account from the bank settings and from the webhook configuration; both must equal the payment's. */
    public record Accounts(String settingsAccountNo, String configuredAccountNo) {
    }

    public sealed interface Outcome permits AutoPaid, Review, Ignored {
    }

    public record AutoPaid(OrderFacts order) implements Outcome {
    }

    /** {@code order} is the order the content pointed at, when there was exactly one and it exists. */
    public record Review(Reason reason, OrderFacts order) implements Outcome {
    }

    public record Ignored() implements Outcome {
    }

    // overlapping scan: "DNADNA7K2M9Q" must still offer the real code
    private static final Pattern CODE = Pattern.compile("(?=(DNA[0-9A-HJKMNP-TV-Z]{6}))");
    private static final Pattern DIACRITICS = Pattern.compile("\\p{M}+");
    private static final Pattern DROPPED = Pattern.compile("[\\s\\-._]+");

    private PaymentMatcher() {
    }

    public static Outcome match(Incoming tx, Function<String, Optional<OrderFacts>> orders, Accounts accounts) {
        Set<String> codes = findCodes(tx.content());
        if (!tx.incoming()) {
            return codes.isEmpty() ? new Ignored() : new Review(Reason.OUT_WITH_CODE, null);
        }
        if (codes.isEmpty()) {
            return new Review(Reason.NO_CODE, null);
        }
        // a candidate that is no order (the payer's name run together, for example) is noise beside the real code
        List<OrderFacts> existing = new ArrayList<>();
        for (String code : codes.stream().sorted().toList()) {
            orders.apply(code).ifPresent(existing::add);
        }
        if (existing.isEmpty()) {
            return new Review(Reason.UNKNOWN_CODE, null);
        }
        if (existing.size() > 1) {
            return new Review(Reason.MULTIPLE_CODES, null);
        }
        OrderFacts order = existing.get(0);
        if (order.method() != PaymentMethod.BANK_TRANSFER) {
            return new Review(Reason.NOT_BANK_TRANSFER, order);
        }
        if (order.status().isAtOrAfterPaid()) {
            return new Review(Reason.ALREADY_PAID, order);
        }
        if (order.status() != OrderStatus.CONFIRMED) {
            return new Review(Reason.NOT_CONFIRMED, order);
        }
        if (tx.amount() != order.total()) {
            return new Review(Reason.AMOUNT_MISMATCH, order);
        }
        if (!sameAccount(tx.accountNo(), accounts)) {
            return new Review(Reason.WRONG_ACCOUNT, order);
        }
        return new AutoPaid(order);
    }

    /**
     * Strips diacritics ({@code đ} becomes {@code D}), upper-cases, drops spaces, hyphens, dots and underscores, then
     * folds {@code O} to {@code 0} and {@code I}/{@code L} to {@code 1}.
     */
    public static String normalizeContent(String content) {
        if (content == null) {
            return "";
        }
        String decomposed = Normalizer.normalize(content, Normalizer.Form.NFD);
        String stripped = DIACRITICS.matcher(decomposed).replaceAll("")
                .replace('đ', 'D').replace('Đ', 'D')
                .toUpperCase(Locale.ROOT);
        return CodeGenerator.foldLookAlikes(DROPPED.matcher(stripped).replaceAll(""));
    }

    /** Distinct order codes found in the normalised content, in order of appearance. */
    public static Set<String> findCodes(String content) {
        Set<String> codes = new LinkedHashSet<>();
        Matcher matcher = CODE.matcher(normalizeContent(content));
        while (matcher.find()) {
            codes.add(matcher.group(1));
        }
        return codes;
    }

    private static boolean sameAccount(String paymentAccount, Accounts accounts) {
        String payment = digitsOnly(paymentAccount);
        String settings = digitsOnly(accounts.settingsAccountNo());
        String configured = digitsOnly(accounts.configuredAccountNo());
        return !payment.isEmpty() && payment.equals(settings) && payment.equals(configured);
    }

    private static String digitsOnly(String value) {
        return value == null ? "" : value.replaceAll("[^0-9A-Za-z]", "").toUpperCase(Locale.ROOT);
    }
}
