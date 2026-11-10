package vn.dnahoangnguyen.api.storefront;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import vn.dnahoangnguyen.api.catalog.brand.Brand;
import vn.dnahoangnguyen.api.catalog.pricing.PriceRules;
import vn.dnahoangnguyen.api.catalog.pricing.Saving;
import vn.dnahoangnguyen.api.catalog.pricing.SkuPricing;
import vn.dnahoangnguyen.api.catalog.product.Product;
import vn.dnahoangnguyen.api.catalog.product.ProductStatus;
import vn.dnahoangnguyen.api.catalog.sku.Sku;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.NameSlug;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.ProductCard;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.PublicSku;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.UnitChip;

/** Entity to public DTO mapping. Every SKU passes through {@link PublicPriceRedactor} here and nowhere else. */
final class StorefrontMapper {

    private StorefrontMapper() {
    }

    /**
     * @param baseEffective effective price of the base SKU when that price is public, else null (no saving shown)
     */
    static PublicSku publicSku(Sku sku, Long baseEffective, LocalDate today) {
        SkuPricing pricing = sku.pricing();
        boolean visible = sku.isPriceVisible() && sku.getPrice() != null;
        boolean promoActive = PriceRules.promoActive(pricing, today);
        Long effective = PriceRules.effectivePrice(pricing, today);
        Long perBase = effective == null ? null : PriceRules.perBaseUnit(effective, sku.getConversion());
        Saving saving = sku.isBase() ? Saving.NONE : PriceRules.saving(baseEffective, sku.getConversion(), effective);
        PublicSku raw = new PublicSku(sku.getId(), sku.getCode(), sku.getUnitName(), sku.getConversion(), sku.isBase(),
                visible, sku.getPrice(), effective, promoActive, promoActive ? sku.getPromoPrice() : null,
                promoActive && sku.getPromoTo() != null ? sku.getPromoTo().toString() : null, perBase, saving);
        return PublicPriceRedactor.redact(raw);
    }

    /** The public SKUs of one product, base unit first then by conversion. Input must be the visible SKUs only. */
    static List<PublicSku> publicSkus(List<Sku> visibleSkus, LocalDate today) {
        Long baseEffective = visibleSkus.stream()
                .filter(Sku::isBase)
                .filter(s -> s.isPriceVisible() && s.getPrice() != null)
                .map(s -> PriceRules.effectivePrice(s.pricing(), today))
                .findFirst()
                .orElse(null);
        return visibleSkus.stream()
                .sorted(java.util.Comparator.comparing((Sku s) -> !s.isBase())
                        .thenComparingInt(Sku::getConversion)
                        .thenComparing(Sku::getId))
                .map(s -> publicSku(s, baseEffective, today))
                .toList();
    }

    /** Card for lists. {@code fromPrice} only ever sees redacted SKUs, so hidden prices cannot contribute. */
    static ProductCard card(Product product, Brand brand, List<PublicSku> skus) {
        Long from = skus.stream().map(PublicSku::perBaseUnit).filter(Objects::nonNull).min(Long::compare).orElse(null);
        String fromUnit = skus.stream().filter(PublicSku::isBase).map(PublicSku::unitName).findFirst().orElse(null);
        List<UnitChip> units = skus.stream().map(s -> new UnitChip(s.unitName(), s.priceVisible())).toList();
        return new ProductCard(product.getId(), product.getSlug(), product.getName(), nameSlug(brand),
                product.getImageUrl(), product.getSpecLine(), from, fromUnit, skus.size() > 1, units,
                product.getStatus() == ProductStatus.DISCONTINUED);
    }

    static NameSlug nameSlug(Brand brand) {
        return brand == null ? null : new NameSlug(brand.getName(), brand.getSlug());
    }
}
