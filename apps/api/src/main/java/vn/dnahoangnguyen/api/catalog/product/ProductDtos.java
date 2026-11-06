package vn.dnahoangnguyen.api.catalog.product;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDate;
import java.util.List;
import vn.dnahoangnguyen.api.catalog.sku.SkuSource;

/**
 * Admin catalogue shapes (see the API contract). {@link AdminProduct} is both the request body of create/update and
 * the response; the read-only members (warnings, price history, computed per-unit price) are ignored on input.
 * Nullable booleans on input mean "not provided": the stored value is kept (or the default applies to a new row).
 */
public final class ProductDtos {

    private ProductDtos() {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AdminSku(
            Long id,
            Long version,
            String code,
            String name,
            String unitName,
            Integer conversion,
            @JsonProperty("isBase") Boolean isBase,
            Long price,
            Boolean priceVisible,
            Boolean needsConfirmation,
            Long promoPrice,
            LocalDate promoFrom,
            LocalDate promoTo,
            Boolean visible,
            SkuSource source,
            Long perBaseUnit,
            List<SkuWarning> warnings) {
    }

    public record SkuWarning(String type, String message, double deviationPct) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AdminProduct(
            Long id,
            Long version,
            String name,
            String slug,
            Long brandId,
            Long categoryId,
            String descriptionMd,
            String specLine,
            String imageUrl,
            String seoTitle,
            String seoDescription,
            String internalNote,
            Boolean published,
            ProductStatus status,
            List<AdminSku> skus,
            List<ProductWarning> warnings,
            List<PriceHistoryRow> priceHistory,
            List<String> galleryUrls) {

        /** Without gallery changes: a null list keeps the stored photos. */
        public AdminProduct(Long id, Long version, String name, String slug, Long brandId, Long categoryId, String descriptionMd,
                            String specLine, String imageUrl, String seoTitle, String seoDescription, String internalNote,
                            Boolean published, ProductStatus status, List<AdminSku> skus, List<ProductWarning> warnings,
                            List<PriceHistoryRow> priceHistory) {
            this(id, version, name, slug, brandId, categoryId, descriptionMd, specLine, imageUrl, seoTitle, seoDescription,
                    internalNote, published, status, skus, warnings, priceHistory, null);
        }
    }

    public record ProductWarning(String type, String message) {
    }

    public record PriceHistoryRow(String skuCode, String field, Long oldPrice, Long newPrice, String changedBy,
                                  String changedAt) {
    }

    public record AdminProductRow(
            long id,
            String name,
            String slug,
            String brandName,
            String categoryName,
            boolean published,
            ProductStatus status,
            int skuCount,
            String baseCode,
            Long basePrice,
            boolean needsAttention,
            boolean needsConfirmation,
            String updatedAt,
            List<String> images) {
    }

    public record Totals(long products, long skus, long visibleSkus) {
    }

    public record AdminProductList(List<AdminProductRow> items, int page, int size, long total, Totals totals) {
    }
}
