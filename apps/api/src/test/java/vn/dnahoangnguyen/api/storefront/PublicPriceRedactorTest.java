package vn.dnahoangnguyen.api.storefront;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import vn.dnahoangnguyen.api.catalog.pricing.Saving;
import vn.dnahoangnguyen.api.catalog.pricing.SavingKind;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.PublicSku;

class PublicPriceRedactorTest {

    private static PublicSku sku(boolean priceVisible) {
        return new PublicSku(7, "SV465-4L- T80", "Thùng", 80, false, priceVisible, 440_000L, 420_000L, true, 420_000L,
                "2026-12-31", 5_250L, new Saving(SavingKind.PERCENT, 1.5));
    }

    @Test
    void hiddenSkuLosesEveryPriceField() {
        PublicSku redacted = PublicPriceRedactor.redact(sku(false));

        assertThat(redacted.priceVisible()).isFalse();
        assertThat(redacted.price()).isNull();
        assertThat(redacted.effectivePrice()).isNull();
        assertThat(redacted.promoActive()).isFalse();
        assertThat(redacted.promoPrice()).isNull();
        assertThat(redacted.promoTo()).isNull();
        assertThat(redacted.perBaseUnit()).isNull();
        assertThat(redacted.saving()).isEqualTo(Saving.NONE);
    }

    @Test
    void identityFieldsSurvive() {
        PublicSku redacted = PublicPriceRedactor.redact(sku(false));

        assertThat(redacted.id()).isEqualTo(7);
        assertThat(redacted.code()).isEqualTo("SV465-4L- T80");
        assertThat(redacted.unitName()).isEqualTo("Thùng");
        assertThat(redacted.conversion()).isEqualTo(80);
        assertThat(redacted.isBase()).isFalse();
    }

    @Test
    void visibleSkuIsUntouched() {
        PublicSku visible = sku(true);

        assertThat(PublicPriceRedactor.redact(visible)).isSameAs(visible);
    }
}
