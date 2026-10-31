package vn.dnahoangnguyen.api.catalog.product;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

/** What a product needs before it can go on the storefront. A missing image never blocks publishing. */
public final class ProductPublishRules {

    public static final String MISSING_CATEGORY = "CATEGORY";
    public static final String MISSING_PRICED_SKU = "PRICED_SKU";

    private ProductPublishRules() {
    }

    /** The parts of a SKU the publish rule looks at. */
    public record SkuState(boolean visible, Long price) {
    }

    /** Codes of the unmet requirements; empty when the product is publishable. */
    public static List<String> missing(Long categoryId, Collection<SkuState> skus) {
        List<String> missing = new ArrayList<>();
        if (categoryId == null) {
            missing.add(MISSING_CATEGORY);
        }
        if (skus.stream().noneMatch(s -> s.visible() && s.price() != null)) {
            missing.add(MISSING_PRICED_SKU);
        }
        return missing;
    }

    public static boolean hasImage(String imageUrl) {
        return imageUrl != null && !imageUrl.isBlank();
    }

    /** Vietnamese explanation of the missing requirements, for admin warnings and 422 details. */
    public static String describe(List<String> missing) {
        List<String> parts = new ArrayList<>();
        if (missing.contains(MISSING_CATEGORY)) {
            parts.add("chưa chọn nhóm hàng");
        }
        if (missing.contains(MISSING_PRICED_SKU)) {
            parts.add("chưa có quy cách nào đang hiển thị và có giá");
        }
        return String.join("; ", parts);
    }
}
