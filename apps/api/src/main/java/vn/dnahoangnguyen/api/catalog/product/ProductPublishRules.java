package vn.dnahoangnguyen.api.catalog.product;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

/** What a product needs before it can go on the storefront. A missing image or price never blocks publishing: the site is a catalogue and shows "Liên hệ". */
public final class ProductPublishRules {

    /** Codes of the {@code missing} extension of a refused publish; the admin UI maps them to Vietnamese. */
    public static final String MISSING_CATEGORY = "CATEGORY";
    public static final String MISSING_VISIBLE_SKU = "VISIBLE_SKU";

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
        if (skus.stream().noneMatch(SkuState::visible)) {
            missing.add(MISSING_VISIBLE_SKU);
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
        if (missing.contains(MISSING_VISIBLE_SKU)) {
            parts.add("chưa có quy cách nào đang hiển thị");
        }
        return String.join("; ", parts);
    }
}
