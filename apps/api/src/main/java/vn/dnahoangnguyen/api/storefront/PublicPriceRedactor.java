package vn.dnahoangnguyen.api.storefront;

import vn.dnahoangnguyen.api.catalog.pricing.Saving;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.PublicSku;

/**
 * The single place that removes prices from public output. A SKU whose price is not visible leaves the API with
 * every price field null, no promo and no saving; everything derived from SKUs (card "from" price, units) is
 * computed from the redacted SKUs, so a hidden price can never reach a public response.
 */
public final class PublicPriceRedactor {

    private PublicPriceRedactor() {
    }

    public static PublicSku redact(PublicSku sku) {
        if (sku.priceVisible()) {
            return sku;
        }
        return new PublicSku(sku.id(), sku.code(), sku.unitName(), sku.conversion(), sku.isBase(), false,
                null, null, false, null, null, null, Saving.NONE);
    }
}
