package vn.dnahoangnguyen.api.catalog.pricing;

import java.time.LocalDate;

/** The price columns of one SKU, detached from the entity so the rules stay pure. */
public record SkuPricing(Long price, Long promoPrice, LocalDate promoFrom, LocalDate promoTo) {
}
