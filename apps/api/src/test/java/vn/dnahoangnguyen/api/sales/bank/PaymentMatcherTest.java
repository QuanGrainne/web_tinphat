package vn.dnahoangnguyen.api.sales.bank;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import vn.dnahoangnguyen.api.sales.bank.PaymentMatcher.Accounts;
import vn.dnahoangnguyen.api.sales.bank.PaymentMatcher.AutoPaid;
import vn.dnahoangnguyen.api.sales.bank.PaymentMatcher.Ignored;
import vn.dnahoangnguyen.api.sales.bank.PaymentMatcher.Incoming;
import vn.dnahoangnguyen.api.sales.bank.PaymentMatcher.Outcome;
import vn.dnahoangnguyen.api.sales.bank.PaymentMatcher.OrderFacts;
import vn.dnahoangnguyen.api.sales.bank.PaymentMatcher.Reason;
import vn.dnahoangnguyen.api.sales.bank.PaymentMatcher.Review;
import vn.dnahoangnguyen.api.sales.order.OrderStatus;
import vn.dnahoangnguyen.api.sales.order.PaymentMethod;

class PaymentMatcherTest {

    private static final String ACCOUNT = "0123456789";
    private static final Accounts ACCOUNTS = new Accounts(ACCOUNT, ACCOUNT);
    private static final long TOTAL = 93_000;

    private static OrderFacts order(String code, PaymentMethod method, OrderStatus status) {
        return new OrderFacts(1, code, method, status, TOTAL);
    }

    private static Outcome match(Incoming tx, OrderFacts... known) {
        Map<String, OrderFacts> byCode = new java.util.HashMap<>();
        for (OrderFacts f : known) {
            byCode.put(f.code(), f);
        }
        return PaymentMatcher.match(tx, code -> Optional.ofNullable(byCode.get(code)), ACCOUNTS);
    }

    private static Incoming in(String content, long amount) {
        return new Incoming(ACCOUNT, true, amount, content);
    }

    private static OrderFacts confirmed(String code) {
        return order(code, PaymentMethod.BANK_TRANSFER, OrderStatus.CONFIRMED);
    }

    private static void assertReview(Outcome outcome, Reason reason) {
        assertThat(outcome).isInstanceOfSatisfying(Review.class, r -> assertThat(r.reason()).isEqualTo(reason));
    }

    @Test
    void exactMatchIsAutoPaid() {
        Outcome outcome = match(in("DNA7K2M9Q", TOTAL), confirmed("DNA7K2M9Q"));
        assertThat(outcome).isInstanceOfSatisfying(AutoPaid.class,
                paid -> assertThat(paid.order().code()).isEqualTo("DNA7K2M9Q"));
    }

    @Test
    void mangledContentStillMatches() {
        assertThat(match(in("dna 7k2m-9q", TOTAL), confirmed("DNA7K2M9Q"))).isInstanceOf(AutoPaid.class);
        assertThat(match(in("Dna.7k2m_9q", TOTAL), confirmed("DNA7K2M9Q"))).isInstanceOf(AutoPaid.class);
    }

    @Test
    void letterOReadAsZero() {
        // the order code has a zero, the customer typed the letter O
        assertThat(match(in("DNA7K2MOQ", TOTAL), confirmed("DNA7K2M0Q"))).isInstanceOf(AutoPaid.class);
    }

    @Test
    void diacriticsAndLongBankTextAreHandled() {
        String content = "NGUYEN VAN A chuyển tiền đơn DNA7K2M9Q cảm ơn shop MBVCB.123456.";
        assertThat(match(in(content, TOTAL), confirmed("DNA7K2M9Q"))).isInstanceOf(AutoPaid.class);
    }

    @Test
    void twoDifferentCodesNeedAPerson() {
        assertReview(match(in("DNA7K2M9Q va DNA8K3N0R", TOTAL), confirmed("DNA7K2M9Q"), confirmed("DNA8K3N0R")),
                Reason.MULTIPLE_CODES);
    }

    @Test
    void theSameCodeTwiceIsStillOneCode() {
        assertThat(match(in("DNA7K2M9Q DNA7K2M9Q", TOTAL), confirmed("DNA7K2M9Q"))).isInstanceOf(AutoPaid.class);
    }

    @Test
    void noCodeAndUnknownCode() {
        assertReview(match(in("Chuyen tien mua hang", TOTAL)), Reason.NO_CODE);
        assertReview(match(in("DNA7K2M9Q", TOTAL)), Reason.UNKNOWN_CODE);
    }

    @Test
    void underAndOverPaymentAreAmountMismatch() {
        assertReview(match(in("DNA7K2M9Q", TOTAL - 1), confirmed("DNA7K2M9Q")), Reason.AMOUNT_MISMATCH);
        assertReview(match(in("DNA7K2M9Q", TOTAL + 1), confirmed("DNA7K2M9Q")), Reason.AMOUNT_MISMATCH);
    }

    @Test
    void outgoingTransfers() {
        Incoming outWithCode = new Incoming(ACCOUNT, false, TOTAL, "DNA7K2M9Q");
        assertReview(match(outWithCode, confirmed("DNA7K2M9Q")), Reason.OUT_WITH_CODE);
        assertThat(match(new Incoming(ACCOUNT, false, 5_000, "Phi dich vu"))).isInstanceOf(Ignored.class);
    }

    @Test
    void wrongAccountOrAccountSettingsMismatch() {
        Incoming elsewhere = new Incoming("9999999999", true, TOTAL, "DNA7K2M9Q");
        assertReview(match(elsewhere, confirmed("DNA7K2M9Q")), Reason.WRONG_ACCOUNT);

        Outcome settingsDiffer = PaymentMatcher.match(in("DNA7K2M9Q", TOTAL),
                code -> Optional.of(confirmed("DNA7K2M9Q")), new Accounts("1111111111", ACCOUNT));
        assertReview(settingsDiffer, Reason.WRONG_ACCOUNT);

        Outcome notConfigured = PaymentMatcher.match(in("DNA7K2M9Q", TOTAL),
                code -> Optional.of(confirmed("DNA7K2M9Q")), new Accounts("", ""));
        assertReview(notConfigured, Reason.WRONG_ACCOUNT);
    }

    @Test
    void accountNumbersCompareWithoutSpaces() {
        Outcome outcome = PaymentMatcher.match(in("DNA7K2M9Q", TOTAL),
                code -> Optional.of(confirmed("DNA7K2M9Q")), new Accounts("0123 4567 89", ACCOUNT));
        assertThat(outcome).isInstanceOf(AutoPaid.class);
    }

    @Test
    void orderStateDecidesTheReviewReason() {
        assertReview(match(in("DNA7K2M9Q", TOTAL), order("DNA7K2M9Q", PaymentMethod.BANK_TRANSFER, OrderStatus.PAID)),
                Reason.ALREADY_PAID);
        assertReview(match(in("DNA7K2M9Q", TOTAL), order("DNA7K2M9Q", PaymentMethod.BANK_TRANSFER, OrderStatus.SHIPPING)),
                Reason.ALREADY_PAID);
        assertReview(match(in("DNA7K2M9Q", TOTAL), order("DNA7K2M9Q", PaymentMethod.COD, OrderStatus.CONFIRMED)),
                Reason.NOT_BANK_TRANSFER);
        assertReview(match(in("DNA7K2M9Q", TOTAL), order("DNA7K2M9Q", PaymentMethod.BANK_TRANSFER, OrderStatus.PENDING)),
                Reason.NOT_CONFIRMED);
        assertReview(match(in("DNA7K2M9Q", TOTAL), order("DNA7K2M9Q", PaymentMethod.BANK_TRANSFER, OrderStatus.CANCELLED)),
                Reason.NOT_CONFIRMED);
    }

    @Test
    void reviewCarriesTheOrderTheContentPointedAt() {
        Outcome outcome = match(in("DNA7K2M9Q", TOTAL - 1), confirmed("DNA7K2M9Q"));
        assertThat(outcome).isInstanceOfSatisfying(Review.class,
                r -> assertThat(r.order().code()).isEqualTo("DNA7K2M9Q"));
    }

    @Test
    void normalizeContentFoldsDiacriticsAndLookAlikes() {
        assertThat(PaymentMatcher.normalizeContent("Đơn dna-7k2m.9q")).isEqualTo("D0NDNA7K2M9Q");
        assertThat(PaymentMatcher.findCodes("xin chao")).isEmpty();
        assertThat(PaymentMatcher.findCodes(null)).isEmpty();
    }
}
