package vn.dnahoangnguyen.api.storefront;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;
import vn.dnahoangnguyen.api.catalog.CatalogIntegrationTest;
import vn.dnahoangnguyen.api.catalog.brand.BrandService.BrandCreate;
import vn.dnahoangnguyen.api.catalog.category.CategoryService.CategoryCreate;
import vn.dnahoangnguyen.api.catalog.product.ProductDtos.AdminSku;

/**
 * A hidden-price SKU priced 987654 (promo 876543) must never show up in any public GET response, in any
 * formatting, and every public route of the storefront package has to be covered by the sample table below.
 */
class PublicPriceLeakIT extends CatalogIntegrationTest {

    private static final List<String> FORBIDDEN = List.of("987654", "987.654", "876543", "876.543");
    private static final String STOREFRONT_PACKAGE = "vn.dnahoangnguyen.api.storefront";

    /** Route pattern to a sample request; every public GET mapping of the storefront must appear here. */
    private static final Map<String, List<String>> SAMPLES = Map.of(
            "/api/public/nav", List.of("/api/public/nav"),
            "/api/public/home", List.of("/api/public/home"),
            "/api/public/categories/{slug}", List.of("/api/public/categories/chong-ro-ri",
                    "/api/public/categories/chong-ro-ri?sort=price_asc", "/api/public/categories/chong-ro-ri?sort=price_desc",
                    "/api/public/categories/chong-ro-ri?brand=sen-vang"),
            "/api/public/brands/{slug}", List.of("/api/public/brands/sen-vang", "/api/public/brands/sen-vang?category=chong-ro-ri"),
            "/api/public/products/{slug}", List.of("/api/public/products/giay-co-gia-an"),
            "/api/public/search", List.of("/api/public/search?q=giay", "/api/public/search?q=LEAK-2", "/api/public/search?q=leak"),
            "/api/public/search/suggest", List.of("/api/public/search/suggest?q=leak", "/api/public/search/suggest?q=gi"),
            "/api/public/sitemap", List.of("/api/public/sitemap"));

    @Autowired
    @Qualifier("requestMappingHandlerMapping")
    RequestMappingHandlerMapping handlerMapping;

    @BeforeEach
    void fixture() {
        var brand = brandService.create(new BrandCreate("Sen Vàng"));
        long category = categoryService.create(new CategoryCreate("Chống rò rỉ", null)).id();
        LocalDate today = LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
        AdminSku visible = sku("LEAK-1", "Gói", 1, true, 11_000L);
        AdminSku hidden = new AdminSku(null, null, "LEAK-2", null, "Thùng", 90, false, 987_654L, false, false, 876_543L,
                today.minusDays(1), today.plusDays(5), true, null, null, null);
        long id = create("Giấy có giá ẩn", brand.id(), category, visible, hidden);
        productService.publish(id, MANAGER);
    }

    @Test
    void everyStorefrontGetRouteIsInTheSampleTable() {
        Set<String> mapped = handlerMapping.getHandlerMethods().entrySet().stream()
                .filter(e -> e.getValue().getBeanType().getPackageName().startsWith(STOREFRONT_PACKAGE))
                .flatMap(e -> e.getKey().getPathPatternsCondition().getPatternValues().stream())
                .collect(Collectors.toSet());

        assertThat(mapped).isNotEmpty();
        assertThat(SAMPLES.keySet()).containsAll(mapped);
        assertThat(mapped).containsAll(SAMPLES.keySet());
    }

    @Test
    void noPublicResponseContainsAHiddenPrice() throws Exception {
        for (List<String> urls : SAMPLES.values()) {
            for (String url : urls) {
                String body = mvc.perform(get(url)).andExpect(status().isOk()).andReturn().getResponse()
                        .getContentAsString(StandardCharsets.UTF_8);
                assertThat(body).as(url).isNotBlank();
                for (String secret : FORBIDDEN) {
                    assertThat(body).as("%s must not contain %s", url, secret).doesNotContain(secret);
                }
            }
        }
    }

    @Test
    void theVisibleUnitStillCarriesItsPrice() throws Exception {
        String body = mvc.perform(get("/api/public/products/giay-co-gia-an")).andExpect(status().isOk()).andReturn()
                .getResponse().getContentAsString(StandardCharsets.UTF_8);

        assertThat(body).contains("\"price\":11000").contains("\"unitName\":\"Thùng\"");
        assertThat(body).contains("\"isBase\":true").contains("\"isBase\":false").contains("\"priceVisible\":false");
        // the record accessor must not add a second, differently named property
        assertThat(body).doesNotContain("\"base\":");
    }

    @Test
    void theHiddenUnitNeverContributesToTheCardPrice() throws Exception {
        String body = mvc.perform(get("/api/public/categories/chong-ro-ri")).andExpect(status().isOk()).andReturn()
                .getResponse().getContentAsString(StandardCharsets.UTF_8);

        assertThat(body).contains("\"fromPrice\":11000").contains("\"hasMultipleUnits\":true");
    }
}
