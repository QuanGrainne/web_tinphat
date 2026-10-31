package vn.dnahoangnguyen.api.storefront;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import vn.dnahoangnguyen.api.catalog.category.CategoryService.AdminCategory;
import vn.dnahoangnguyen.api.catalog.brand.BrandService.AdminBrand;
import vn.dnahoangnguyen.api.catalog.pricing.Saving;
import vn.dnahoangnguyen.api.catalog.product.ProductDtos.AdminProduct;
import vn.dnahoangnguyen.api.catalog.product.ProductDtos.AdminProductList;
import vn.dnahoangnguyen.api.catalog.product.ProductDtos.AdminProductRow;
import vn.dnahoangnguyen.api.catalog.product.ProductDtos.AdminSku;
import vn.dnahoangnguyen.api.catalog.product.ProductDtos.PriceHistoryRow;
import vn.dnahoangnguyen.api.catalog.product.ProductDtos.SkuWarning;
import vn.dnahoangnguyen.api.catalog.product.ProductDtos.Totals;
import vn.dnahoangnguyen.api.catalog.product.ProductStatus;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.BrandCount;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.BrandFacets;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.BrandInfo;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.BrandListing;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.CategoryFacets;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.CategoryInfo;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.CategoryListing;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.HomeData;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.Nav;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.NavCategory;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.ProductCard;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.PublicProduct;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.PublicSku;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.SearchResult;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.SitemapData;
import vn.dnahoangnguyen.api.storefront.StorefrontDtos.Suggest;

/** The JSON property names are the API contract: a renamed record component must fail here. */
class ContractShapeTest {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();

    private static List<String> keys(Object dto) {
        JsonNode node = MAPPER.valueToTree(dto);
        return List.copyOf(node.propertyNames());
    }

    @Test
    void publicSkuUsesTheContractNamesAndKeepsNulls() {
        PublicSku sku = new PublicSku(1, "C", "Gói", 1, true, false, null, null, false, null, null, null, Saving.NONE);

        assertThat(keys(sku)).containsExactlyInAnyOrder("id", "code", "unitName", "conversion", "isBase", "priceVisible",
                "price", "effectivePrice", "promoActive", "promoPrice", "promoTo", "perBaseUnit", "saving");
        JsonNode json = MAPPER.valueToTree(sku);
        assertThat(json.get("price").isNull()).isTrue();
        assertThat(json.get("isBase").asBoolean()).isTrue();
        assertThat(keys(sku.saving())).containsExactlyInAnyOrder("kind", "pct");
    }

    @Test
    void publicCatalogueShapes() {
        ProductCard card = new ProductCard(1, "s", "n", null, null, null, null, null, false, List.of());
        assertThat(keys(card)).containsExactlyInAnyOrder("id", "slug", "name", "brand", "imageUrl", "specLine",
                "fromPrice", "fromUnitName", "hasMultipleUnits", "units");

        PublicProduct product = new PublicProduct(1, "s", "n", "ACTIVE", null, null, List.of(), null, null, null, "C",
                List.of(), List.of(), null, null);
        assertThat(keys(product)).containsExactlyInAnyOrder("id", "slug", "name", "status", "brand", "category",
                "breadcrumb", "imageUrl", "specLine", "descriptionMd", "baseCode", "skus", "related", "seoTitle",
                "seoDescription");

        assertThat(keys(new Nav(List.of(), List.of()))).containsExactlyInAnyOrder("categories", "brands");
        assertThat(keys(new NavCategory(1, "n", "s", 0, List.of())))
                .containsExactlyInAnyOrder("id", "name", "slug", "productCount", "children");
        assertThat(keys(new BrandCount("n", "s", 1))).containsExactlyInAnyOrder("name", "slug", "productCount");
        assertThat(keys(new HomeData(List.of(), List.of(), List.of())))
                .containsExactlyInAnyOrder("categories", "brands", "sections");
        assertThat(keys(new CategoryListing(List.of(), 1, 24, 0, new CategoryInfo(1, "n", "s", null, null), List.of(),
                List.of(), new BrandFacets(List.of()))))
                .containsExactlyInAnyOrder("items", "page", "pageSize", "total", "category", "breadcrumb", "children",
                        "facets");
        assertThat(keys(new CategoryInfo(1, "n", "s", null, null)))
                .containsExactlyInAnyOrder("id", "name", "slug", "description", "parent");
        assertThat(keys(new BrandListing(List.of(), 1, 24, 0, new BrandInfo("n", "s", null), List.of(),
                new CategoryFacets(List.of()))))
                .containsExactlyInAnyOrder("items", "page", "pageSize", "total", "brand", "breadcrumb", "facets");
        assertThat(keys(new SearchResult(List.of(), 1, 24, 0, "q")))
                .containsExactlyInAnyOrder("items", "page", "pageSize", "total", "q");
        assertThat(keys(new Suggest(List.of()))).containsExactly("items");
        assertThat(keys(new SitemapData(List.of(), List.of(), List.of())))
                .containsExactlyInAnyOrder("products", "categories", "brands");
    }

    @Test
    void adminCatalogueShapes() {
        AdminSku sku = new AdminSku(1L, 0L, "C", null, "Gói", 1, true, 1L, true, false, null, null, null, true, null,
                1L, List.of());
        assertThat(keys(sku)).containsExactlyInAnyOrder("id", "version", "code", "name", "unitName", "conversion",
                "isBase", "price", "priceVisible", "needsConfirmation", "promoPrice", "promoFrom", "promoTo", "visible",
                "source", "perBaseUnit", "warnings");
        assertThat(keys(new SkuWarning("PRICE_MISMATCH", "m", 3.2)))
                .containsExactlyInAnyOrder("type", "message", "deviationPct");

        AdminProduct product = new AdminProduct(1L, 0L, "n", "s", null, null, null, null, null, null, null, null, false,
                ProductStatus.ACTIVE, List.of(sku), List.of(), List.of());
        assertThat(keys(product)).containsExactlyInAnyOrder("id", "version", "name", "slug", "brandId", "categoryId",
                "descriptionMd", "specLine", "imageUrl", "seoTitle", "seoDescription", "internalNote", "published",
                "status", "skus", "warnings", "priceHistory");
        assertThat(keys(new PriceHistoryRow("C", "PRICE", null, 1L, null, "2026-10-31T14:00:00+07:00")))
                .containsExactlyInAnyOrder("skuCode", "field", "oldPrice", "newPrice", "changedBy", "changedAt");

        AdminProductRow row = new AdminProductRow(1, "n", "s", null, null, false, ProductStatus.ACTIVE, 1, null, null,
                false, false, "t");
        assertThat(keys(row)).containsExactlyInAnyOrder("id", "name", "slug", "brandName", "categoryName", "published",
                "status", "skuCount", "baseCode", "basePrice", "needsAttention", "needsConfirmation", "updatedAt");
        assertThat(keys(new AdminProductList(List.of(row), 1, 30, 1, new Totals(1, 1, 1))))
                .containsExactlyInAnyOrder("items", "page", "size", "total", "totals");
        assertThat(keys(new Totals(1, 1, 1))).containsExactlyInAnyOrder("products", "skus", "visibleSkus");

        assertThat(keys(new AdminCategory(1, "n", "s", null, null, true, 0, 0, List.of())))
                .containsExactlyInAnyOrder("id", "name", "slug", "parentId", "description", "visible", "sortOrder",
                        "productCount", "children");
        assertThat(keys(new AdminBrand(1, "n", "s", true, 0)))
                .containsExactlyInAnyOrder("id", "name", "slug", "visible", "productCount");
    }
}
