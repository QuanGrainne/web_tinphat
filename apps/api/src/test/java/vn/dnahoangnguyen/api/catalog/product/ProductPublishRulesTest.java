package vn.dnahoangnguyen.api.catalog.product;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;
import vn.dnahoangnguyen.api.catalog.product.ProductPublishRules.SkuState;

class ProductPublishRulesTest {

    @Test
    void publishableWithCategoryAndOneVisiblePricedSku() {
        assertThat(ProductPublishRules.missing(1L, List.of(new SkuState(true, 1000L)))).isEmpty();
    }

    @Test
    void reportsMissingCategory() {
        assertThat(ProductPublishRules.missing(null, List.of(new SkuState(true, 1000L))))
                .containsExactly(ProductPublishRules.MISSING_CATEGORY);
    }

    @Test
    void reportsMissingVisibleSku() {
        List<SkuState> skus = List.of(new SkuState(false, 1000L));
        assertThat(ProductPublishRules.missing(1L, skus)).containsExactly("VISIBLE_SKU");
        assertThat(ProductPublishRules.missing(null, List.of())).containsExactly("CATEGORY", "VISIBLE_SKU");
    }

    @Test
    void aVisibleSkuWithoutAPriceIsEnough() {
        assertThat(ProductPublishRules.missing(1L, List.of(new SkuState(true, null)))).isEmpty();
    }

    @Test
    void missingImageDoesNotBlockPublishing() {
        assertThat(ProductPublishRules.hasImage(null)).isFalse();
        assertThat(ProductPublishRules.hasImage(" ")).isFalse();
        assertThat(ProductPublishRules.hasImage("/uploads/a.jpg")).isTrue();
        assertThat(ProductPublishRules.missing(1L, List.of(new SkuState(true, 5L)))).isEmpty();
    }

    @Test
    void describesMissingParts() {
        assertThat(ProductPublishRules.describe(List.of(ProductPublishRules.MISSING_CATEGORY)))
                .contains("nhóm hàng");
    }
}
