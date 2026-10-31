package vn.dnahoangnguyen.api.catalog.pricing;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;

/** Pure pricing rules. Money is {@code long} VND; promo dates are evaluated at read time, never by a job. */
public final class PriceRules {

    public static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);
    private static final BigDecimal MIN_PERCENT = new BigDecimal("0.1");

    private PriceRules() {
    }

    /** Today's date in the business zone. */
    public static LocalDate today(Clock clock) {
        return LocalDate.now(clock.withZone(ZONE));
    }

    /** Promo applies when a promo price exists and {@code today} lies in the inclusive range; null bounds are open. */
    public static boolean promoActive(SkuPricing sku, LocalDate today) {
        if (sku.promoPrice() == null) {
            return false;
        }
        boolean started = sku.promoFrom() == null || !today.isBefore(sku.promoFrom());
        boolean notEnded = sku.promoTo() == null || !today.isAfter(sku.promoTo());
        return started && notEnded;
    }

    /** Promo price while active, else the regular price (null when the SKU has no price). */
    public static Long effectivePrice(SkuPricing sku, LocalDate today) {
        return promoActive(sku, today) ? sku.promoPrice() : sku.price();
    }

    /** {@code round(price / conversion)}, HALF_UP. */
    public static long perBaseUnit(long price, int conversion) {
        return BigDecimal.valueOf(price)
                .divide(BigDecimal.valueOf(conversion), 0, RoundingMode.HALF_UP)
                .longValueExact();
    }

    /**
     * Saving of a pack against buying {@code conversion} base units: {@code (baseEff*conv - packEff) / (baseEff*conv)}
     * as a percentage with one decimal. NONE for the base unit, a missing or zero base price, a missing pack price
     * or a pack that costs more than the loose units.
     */
    public static Saving saving(Long baseEff, int conversion, Long packEff) {
        if (conversion <= 1 || baseEff == null || baseEff <= 0 || packEff == null) {
            return Saving.NONE;
        }
        long loose = Math.multiplyExact(baseEff, (long) conversion);
        long diff = loose - packEff;
        if (diff < 0) {
            return Saving.NONE;
        }
        BigDecimal pct = BigDecimal.valueOf(diff).multiply(HUNDRED)
                .divide(BigDecimal.valueOf(loose), 1, RoundingMode.HALF_UP);
        if (pct.compareTo(MIN_PERCENT) >= 0) {
            return new Saving(SavingKind.PERCENT, pct.doubleValue());
        }
        return new Saving(SavingKind.EQUAL, 0.0);
    }

    /**
     * Signed deviation of a pack price from {@code basePrice * conversion} in percent (one decimal), or null when
     * the base price is missing or zero.
     */
    public static Double packDeviationPct(Long basePrice, int conversion, Long packPrice) {
        if (basePrice == null || basePrice <= 0 || packPrice == null) {
            return null;
        }
        long expected = Math.multiplyExact(basePrice, (long) conversion);
        return BigDecimal.valueOf(packPrice - expected).multiply(HUNDRED)
                .divide(BigDecimal.valueOf(expected), 1, RoundingMode.HALF_UP)
                .doubleValue();
    }

    /** True when the deviation is strictly greater than the threshold, in either direction. Exact arithmetic. */
    public static boolean isMismatch(Long basePrice, int conversion, Long packPrice, double thresholdPct) {
        if (basePrice == null || basePrice <= 0 || packPrice == null) {
            return false;
        }
        long expected = Math.multiplyExact(basePrice, (long) conversion);
        BigDecimal deviation = BigDecimal.valueOf(Math.abs(packPrice - expected)).multiply(HUNDRED);
        BigDecimal allowed = BigDecimal.valueOf(thresholdPct).multiply(BigDecimal.valueOf(expected));
        return deviation.compareTo(allowed) > 0;
    }

    /** Validation of the promo columns of one SKU; returns a Vietnamese message or null when valid. */
    public static String promoError(Long price, Long promoPrice, LocalDate promoFrom, LocalDate promoTo) {
        if (promoPrice == null) {
            return (promoFrom != null || promoTo != null) ? "Cần nhập giá khuyến mãi khi đặt ngày khuyến mãi." : null;
        }
        if (promoPrice < 0) {
            return "Giá khuyến mãi không hợp lệ.";
        }
        if (price == null || promoPrice >= price) {
            return "Giá khuyến mãi phải nhỏ hơn giá bán.";
        }
        if (promoFrom != null && promoTo != null && promoFrom.isAfter(promoTo)) {
            return "Ngày bắt đầu khuyến mãi phải trước hoặc trùng ngày kết thúc.";
        }
        return null;
    }
}
