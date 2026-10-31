package vn.dnahoangnguyen.api.sales;

import java.math.BigDecimal;

/** Vietnamese display of money and percentages: {@code 428.500đ}, {@code 1,9%}. */
public final class Vnd {

    private Vnd() {
    }

    public static String format(long amount) {
        String digits = Long.toString(Math.abs(amount));
        StringBuilder grouped = new StringBuilder();
        for (int i = 0; i < digits.length(); i++) {
            if (i > 0 && (digits.length() - i) % 3 == 0) {
                grouped.append('.');
            }
            grouped.append(digits.charAt(i));
        }
        return (amount < 0 ? "-" : "") + grouped + "đ";
    }

    /** {@code 2.0} becomes {@code "2"}, {@code 1.5} becomes {@code "1,5"}. */
    public static String percent(double pct) {
        return BigDecimal.valueOf(pct).stripTrailingZeros().toPlainString().replace('.', ',');
    }
}
