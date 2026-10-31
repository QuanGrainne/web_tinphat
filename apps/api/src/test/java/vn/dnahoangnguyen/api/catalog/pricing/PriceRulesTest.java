package vn.dnahoangnguyen.api.catalog.pricing;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class PriceRulesTest {

    private static final LocalDate FROM = LocalDate.of(2026, 11, 1);
    private static final LocalDate TO = LocalDate.of(2026, 11, 10);

    private static SkuPricing promo(LocalDate from, LocalDate to) {
        return new SkuPricing(100_000L, 90_000L, from, to);
    }

    @Test
    void perBaseUnitRoundsHalfUp() {
        assertThat(PriceRules.perBaseUnit(428_500, 50)).isEqualTo(8_570);
        assertThat(PriceRules.perBaseUnit(10, 4)).isEqualTo(3);
        assertThat(PriceRules.perBaseUnit(9, 4)).isEqualTo(2);
    }

    @Test
    void savingPercentWhenPackIsCheaper() {
        Saving cay = PriceRules.saving(31_000L, 12, 364_750L);
        assertThat(cay.kind()).isEqualTo(SavingKind.PERCENT);
        assertThat(cay.pct()).isEqualTo(1.9);

        Saving loai1 = PriceRules.saving(58_000L, 10, 576_576L);
        assertThat(loai1.kind()).isEqualTo(SavingKind.PERCENT);
        assertThat(loai1.pct()).isEqualTo(0.6);
    }

    @Test
    void savingEqualWhenPackMatchesLooseUnits() {
        Saving day = PriceRules.saving(8_570L, 5, 42_850L);
        assertThat(day.kind()).isEqualTo(SavingKind.EQUAL);
        assertThat(day.pct()).isZero();
    }

    @Test
    void savingEqualWhenDifferenceRoundsToZero() {
        // 0.04 % cheaper than loose units
        Saving tiny = PriceRules.saving(100_000L, 10, 999_600L);
        assertThat(tiny.kind()).isEqualTo(SavingKind.EQUAL);
    }

    @Test
    void savingNoneWhenPackCostsMore() {
        assertThat(PriceRules.saving(5_330L, 80, 440_000L)).isEqualTo(Saving.NONE);
    }

    @Test
    void savingNoneForBaseUnitAndMissingOrZeroBasePrice() {
        assertThat(PriceRules.saving(31_000L, 1, 31_000L)).isEqualTo(Saving.NONE);
        assertThat(PriceRules.saving(0L, 12, 364_750L)).isEqualTo(Saving.NONE);
        assertThat(PriceRules.saving(null, 12, 364_750L)).isEqualTo(Saving.NONE);
        assertThat(PriceRules.saving(31_000L, 12, null)).isEqualTo(Saving.NONE);
    }

    @Test
    void promoRangeIsInclusiveOnBothEnds() {
        assertThat(PriceRules.effectivePrice(promo(FROM, TO), FROM.minusDays(1))).isEqualTo(100_000L);
        assertThat(PriceRules.effectivePrice(promo(FROM, TO), FROM)).isEqualTo(90_000L);
        assertThat(PriceRules.effectivePrice(promo(FROM, TO), TO)).isEqualTo(90_000L);
        assertThat(PriceRules.effectivePrice(promo(FROM, TO), TO.plusDays(1))).isEqualTo(100_000L);
    }

    @Test
    void promoWithOpenBoundsAndWithoutPromoPrice() {
        assertThat(PriceRules.promoActive(promo(null, null), FROM)).isTrue();
        assertThat(PriceRules.promoActive(promo(FROM, null), FROM.minusDays(1))).isFalse();
        assertThat(PriceRules.promoActive(promo(null, TO), TO.plusDays(1))).isFalse();
        SkuPricing noPromo = new SkuPricing(100_000L, null, FROM, TO);
        assertThat(PriceRules.promoActive(noPromo, FROM)).isFalse();
        assertThat(PriceRules.effectivePrice(noPromo, FROM)).isEqualTo(100_000L);
        assertThat(PriceRules.effectivePrice(new SkuPricing(null, null, null, null), FROM)).isNull();
    }

    @Test
    void todayUsesTheBusinessZone() {
        // 18:00 UTC is already the next calendar day in Ho Chi Minh City
        Clock clock = Clock.fixed(Instant.parse("2026-10-31T18:00:00Z"), java.time.ZoneOffset.UTC);
        assertThat(PriceRules.today(clock)).isEqualTo(LocalDate.of(2026, 11, 1));
    }

    @Test
    void packDeviationIsSignedWithOneDecimal() {
        assertThat(PriceRules.packDeviationPct(5_330L, 80, 440_000L)).isEqualTo(3.2);
        assertThat(PriceRules.packDeviationPct(5_330L, 80, 426_400L)).isZero();
        assertThat(PriceRules.packDeviationPct(1_000L, 10, 9_750L)).isEqualTo(-2.5);
        assertThat(PriceRules.packDeviationPct(0L, 10, 9_750L)).isNull();
        assertThat(PriceRules.packDeviationPct(null, 10, 9_750L)).isNull();
    }

    @Test
    void mismatchUsesStrictThresholdInBothDirections() {
        assertThat(PriceRules.isMismatch(5_330L, 80, 440_000L, 2.0)).isTrue();
        assertThat(PriceRules.isMismatch(5_330L, 80, 426_400L, 2.0)).isFalse();
        // exactly 2.0 % is not a mismatch
        assertThat(PriceRules.isMismatch(5_000L, 10, 51_000L, 2.0)).isFalse();
        assertThat(PriceRules.isMismatch(5_000L, 10, 49_000L, 2.0)).isFalse();
        assertThat(PriceRules.isMismatch(1_000L, 10, 9_750L, 2.0)).isTrue();
        assertThat(PriceRules.isMismatch(5_330L, 80, 440_000L, 5.0)).isFalse();
        assertThat(PriceRules.isMismatch(0L, 80, 440_000L, 2.0)).isFalse();
    }

    @Test
    void promoValidation() {
        assertThat(PriceRules.promoError(100L, null, null, null)).isNull();
        assertThat(PriceRules.promoError(100L, 90L, FROM, TO)).isNull();
        assertThat(PriceRules.promoError(100L, 100L, FROM, TO)).isNotNull();
        assertThat(PriceRules.promoError(100L, 120L, null, null)).isNotNull();
        assertThat(PriceRules.promoError(100L, 90L, TO, FROM)).isNotNull();
        assertThat(PriceRules.promoError(null, 90L, null, null)).isNotNull();
        assertThat(PriceRules.promoError(100L, null, FROM, null)).isNotNull();
    }
}
