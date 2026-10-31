package vn.dnahoangnguyen.api.sales.pricing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import vn.dnahoangnguyen.api.common.error.DomainException;
import vn.dnahoangnguyen.api.sales.pricing.OrderPricingService.SkuRow;
import vn.dnahoangnguyen.api.settings.DiscountTier;

class OrderPricingServiceTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 31);

    private static SkuRow sku(long id, Long price, boolean priceVisible) {
        return new SkuRow(id, "SKU" + id, "Cái", 1, price, priceVisible, null, null, null, true,
                "Sản phẩm " + id, "san-pham-" + id, true, "ACTIVE");
    }

    private static SkuRow promo(long id, long price, long promoPrice, LocalDate from, LocalDate to) {
        return new SkuRow(id, "SKU" + id, "Cái", 1, price, true, promoPrice, from, to, true,
                "Sản phẩm " + id, "san-pham-" + id, true, "ACTIVE");
    }

    private static PricedCart price(Map<Long, Integer> qty, List<SkuRow> rows, List<DiscountTier> tiers) {
        Map<Long, SkuRow> byId = new LinkedHashMap<>();
        rows.forEach(r -> byId.put(r.id(), r));
        return OrderPricingService.compute(qty, byId, tiers, TODAY);
    }

    @Test
    void usesTheRegularPriceAndSumsLines() {
        PricedCart cart = price(Map.of(1L, 3), List.of(sku(1, 31_000L, true)), List.of());
        assertThat(cart.lines()).singleElement().satisfies(l -> {
            assertThat(l.unitPrice()).isEqualTo(31_000L);
            assertThat(l.lineTotal()).isEqualTo(93_000L);
            assertThat(l.orderable()).isTrue();
        });
        assertThat(cart.subtotal()).isEqualTo(93_000L);
        assertThat(cart.total()).isEqualTo(93_000L);
        assertThat(cart.discountTotal()).isZero();
        assertThat(cart.discountNote()).isNull();
        assertThat(cart.hasContactLines()).isFalse();
    }

    @Test
    void activePromoIsTheUnitPriceAndTheListPriceIsKept() {
        PricedCart cart = price(Map.of(1L, 2), List.of(promo(1, 31_000, 28_000, TODAY.minusDays(1), TODAY)), List.of());
        PricedLine line = cart.lines().get(0);
        assertThat(line.listPrice()).isEqualTo(31_000L);
        assertThat(line.unitPrice()).isEqualTo(28_000L);
        assertThat(cart.subtotal()).isEqualTo(56_000L);
    }

    @Test
    void promoDatesAreInclusiveAndAnExpiredOrFuturePromoIsIgnored() {
        assertThat(OrderPricingService.effectivePrice(promo(1, 100, 80, TODAY, TODAY), TODAY)).isEqualTo(80);
        assertThat(OrderPricingService.effectivePrice(promo(1, 100, 80, null, null), TODAY)).isEqualTo(80);
        assertThat(OrderPricingService.effectivePrice(promo(1, 100, 80, null, TODAY.minusDays(1)), TODAY)).isEqualTo(100);
        assertThat(OrderPricingService.effectivePrice(promo(1, 100, 80, TODAY.plusDays(1), null), TODAY)).isEqualTo(100);
    }

    @Test
    void hiddenPriceLinesCarryNoPriceAndNeverCount() {
        PricedCart cart = price(new LinkedHashMap<>(Map.of(1L, 1, 2L, 1)),
                List.of(sku(1, 10_000L, true), sku(2, 50_000L, false)), List.of());
        PricedLine hidden = cart.lines().stream().filter(l -> l.skuId() == 2).findFirst().orElseThrow();
        assertThat(hidden.priceVisible()).isFalse();
        assertThat(hidden.orderable()).isFalse();
        assertThat(hidden.listPrice()).isNull();
        assertThat(hidden.unitPrice()).isNull();
        assertThat(hidden.lineTotal()).isNull();
        assertThat(cart.subtotal()).isEqualTo(10_000L);
        assertThat(cart.hasContactLines()).isTrue();
        assertThat(cart.allOrderable()).isFalse();
    }

    @Test
    void aVisibleSkuWithoutAPriceIsAContactLine() {
        PricedCart cart = price(Map.of(1L, 1), List.of(sku(1, null, true)), List.of());
        assertThat(cart.lines().get(0).priceVisible()).isFalse();
        assertThat(cart.hasContactLines()).isTrue();
    }

    @Test
    void unknownUnpublishedHiddenOrDiscontinuedSkusAreUnavailable() {
        SkuRow unpublished = new SkuRow(2, "S2", "Cái", 1, 1_000L, true, null, null, null, true, "P", "p", false, "ACTIVE");
        SkuRow discontinued = new SkuRow(3, "S3", "Cái", 1, 1_000L, true, null, null, null, true, "P", "p", true, "DISCONTINUED");
        SkuRow invisible = new SkuRow(4, "S4", "Cái", 1, 1_000L, true, null, null, null, false, "P", "p", true, "ACTIVE");
        PricedCart cart = price(new LinkedHashMap<>(Map.of(1L, 1, 2L, 1, 3L, 1, 4L, 1)),
                List.of(unpublished, discontinued, invisible), List.of());
        assertThat(cart.lines()).hasSize(4).allSatisfy(l -> {
            assertThat(l.unavailable()).isTrue();
            assertThat(l.orderable()).isFalse();
            assertThat(l.unitPrice()).isNull();
        });
        assertThat(cart.subtotal()).isZero();
    }

    @Test
    void discountTierAppliesOnTheSubtotalAndRoundsHalfUp() {
        List<DiscountTier> tiers = List.of(new DiscountTier(1_000_000, 2.0), new DiscountTier(5_000_000, 3.0));
        PricedCart cart = price(Map.of(1L, 1), List.of(sku(1, 1_152_680L, true)), tiers);
        assertThat(cart.discountTotal()).isEqualTo(23_054L);
        assertThat(cart.total()).isEqualTo(1_152_680L - 23_054L);
        assertThat(cart.discountNote()).contains("2%").contains("1.000.000đ");

        PricedCart exact = price(Map.of(1L, 1), List.of(sku(1, 1_000_000L, true)), tiers);
        assertThat(exact.discountTotal()).isEqualTo(20_000L);

        PricedCart below = price(Map.of(1L, 1), List.of(sku(1, 999_999L, true)), tiers);
        assertThat(below.discountTotal()).isZero();
        assertThat(below.discountNote()).isNull();

        PricedCart top = price(Map.of(1L, 1), List.of(sku(1, 5_000_000L, true)), tiers);
        assertThat(top.discountTotal()).isEqualTo(150_000L);
    }

    @Test
    void discountIsComputedOnThePostPromoSubtotal() {
        List<DiscountTier> tiers = List.of(new DiscountTier(1_000_000, 2.0));
        PricedCart cart = price(Map.of(1L, 10), List.of(promo(1, 120_000, 99_000, null, null)), tiers);
        assertThat(cart.subtotal()).isEqualTo(990_000L);
        assertThat(cart.discountTotal()).isZero();
    }

    @Test
    void mergesDuplicatesAndEnforcesBounds() {
        assertThat(OrderPricingService.merge(List.of(new CartLineIn(1L, 2), new CartLineIn(1L, 3)))).containsEntry(1L, 5);
        assertThatThrownBy(() -> OrderPricingService.merge(List.of(new CartLineIn(1L, 0)))).isInstanceOf(DomainException.class);
        assertThatThrownBy(() -> OrderPricingService.merge(List.of(new CartLineIn(1L, 10_000)))).isInstanceOf(DomainException.class);
        assertThatThrownBy(() -> OrderPricingService.merge(List.of(new CartLineIn(1L, 9_000), new CartLineIn(1L, 9_000))))
                .isInstanceOf(DomainException.class);
        List<CartLineIn> tooMany = new java.util.ArrayList<>();
        for (long i = 1; i <= 51; i++) {
            tooMany.add(new CartLineIn(i, 1));
        }
        assertThatThrownBy(() -> OrderPricingService.merge(tooMany)).isInstanceOf(DomainException.class);
    }
}
