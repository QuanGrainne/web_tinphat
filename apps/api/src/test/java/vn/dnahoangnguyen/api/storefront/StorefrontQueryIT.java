package vn.dnahoangnguyen.api.storefront;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import vn.dnahoangnguyen.api.catalog.CatalogIntegrationTest;
import vn.dnahoangnguyen.api.catalog.brand.BrandService.BrandCreate;
import vn.dnahoangnguyen.api.catalog.category.CategoryService.CategoryCreate;
import vn.dnahoangnguyen.api.catalog.product.ProductDtos.AdminSku;
import vn.dnahoangnguyen.api.catalog.seed.CatalogueSeedLoader;

class StorefrontQueryIT extends CatalogIntegrationTest {

    @Autowired
    CatalogueSeedLoader seed;

    private void publishAll() {
        jdbc.update("update product set published = true, first_published_at = now()");
    }

    private String body(String url) throws Exception {
        MvcResult result = mvc.perform(get(url)).andExpect(status().isOk()).andReturn();
        return result.getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
    }

    @Test
    void draftsAreInvisibleEverywhere() throws Exception {
        seed.load();

        mvc.perform(get("/api/public/nav")).andExpect(status().isOk())
                .andExpect(jsonPath("$.categories.length()").value(0))
                .andExpect(jsonPath("$.brands.length()").value(0));
        mvc.perform(get("/api/public/home")).andExpect(jsonPath("$.sections.length()").value(0));
        mvc.perform(get("/api/public/search").param("q", "giay")).andExpect(jsonPath("$.total").value(0));
        mvc.perform(get("/api/public/products/giay-rut-day-sen-vang")).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void publishedCatalogueShowsOnNavHomeAndCategory() throws Exception {
        seed.load();
        publishAll();

        mvc.perform(get("/api/public/nav")).andExpect(status().isOk())
                .andExpect(jsonPath("$.categories.length()").value(6))
                .andExpect(jsonPath("$.brands.length()").value(5));
        mvc.perform(get("/api/public/home"))
                .andExpect(jsonPath("$.sections.length()").value(6))
                .andExpect(jsonPath("$.sections[0].products.length()").value(5));
        // 12 products in "Giấy ăn & giấy vệ sinh" fit one page of 24
        mvc.perform(get("/api/public/categories/giay-an-giay-ve-sinh"))
                .andExpect(jsonPath("$.items.length()").value(12))
                .andExpect(jsonPath("$.total").value(12))
                .andExpect(jsonPath("$.pageSize").value(24))
                .andExpect(jsonPath("$.facets.brands.length()").value(2))
                .andExpect(jsonPath("$.category.parent").value((Object) null));
        mvc.perform(get("/api/public/categories/giay-an-giay-ve-sinh").param("brand", "phong-lan"))
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].name").value("Khăn Napkin Phong Lan"));
    }

    @Test
    void productPageCarriesSavingAndHidesTheUnconfirmedUnits() throws Exception {
        seed.load();
        publishAll();

        mvc.perform(get("/api/public/products/giay-ve-sinh-sen-vang-6-cuon-sv6c-bathroom-tissue"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.baseCode").value("SV6C Bathroom Tissue"))
                .andExpect(jsonPath("$.skus[0].isBase").value(true))
                .andExpect(jsonPath("$.skus[1].unitName").value("Cây (Dây)"))
                .andExpect(jsonPath("$.skus[1].saving.kind").value("PERCENT"))
                .andExpect(jsonPath("$.skus[1].saving.pct").value(1.9))
                .andExpect(jsonPath("$.breadcrumb[0].href").value("/danh-muc/giay-an-giay-ve-sinh"))
                .andExpect(jsonPath("$.related.length()").value(5));

        mvc.perform(get("/api/public/products/giay-khan-giay-rut-cao-cap-gau-truc-sen-vang-sv465-4l-goi"))
                .andExpect(jsonPath("$.skus.length()").value(3))
                .andExpect(jsonPath("$.skus[1].priceVisible").value(false))
                .andExpect(jsonPath("$.skus[1].price").value((Object) null))
                .andExpect(jsonPath("$.skus[1].perBaseUnit").value((Object) null))
                .andExpect(jsonPath("$.skus[1].saving.kind").value("NONE"));
    }

    @Test
    void priceSortPutsContactProductsLastInBothDirections() throws Exception {
        long group = categoryService.create(new CategoryCreate("Nhóm thử", null)).id();
        create("Có giá rẻ", null, group, sku("S1", "Gói", 1, true, 1_000L));
        create("Có giá đắt", null, group, sku("S2", "Gói", 1, true, 9_000L));
        create("Liên hệ", null, group, sku("S3", "Gói", 1, true, 5_000L, false));
        publishAll();

        for (String sort : new String[] {"price_asc", "price_desc"}) {
            mvc.perform(get("/api/public/categories/nhom-thu").param("sort", sort))
                    .andExpect(jsonPath("$.items[2].name").value("Liên hệ"))
                    .andExpect(jsonPath("$.items[2].fromPrice").value((Object) null));
        }
        mvc.perform(get("/api/public/categories/nhom-thu").param("sort", "price_asc"))
                .andExpect(jsonPath("$.items[0].name").value("Có giá rẻ"));
        mvc.perform(get("/api/public/categories/nhom-thu").param("sort", "price_desc"))
                .andExpect(jsonPath("$.items[0].name").value("Có giá đắt"));
        mvc.perform(get("/api/public/categories/nhom-thu").param("sort", "name_desc"))
                .andExpect(jsonPath("$.items[0].name").value("Liên hệ"));
    }

    @Test
    void levelOneCategoryIncludesItsChildrenProducts() throws Exception {
        var parent = categoryService.create(new CategoryCreate("Giấy", null));
        var child = categoryService.create(new CategoryCreate("Giấy vệ sinh", parent.id()));
        categoryService.create(new CategoryCreate("Giấy trống", parent.id()));
        create("Cuộn lớn", null, child.id(), sku("C1", "Cuộn", 1, true, 1_000L));
        create("Hộp lớn", null, parent.id(), sku("C2", "Hộp", 1, true, 2_000L));
        publishAll();

        mvc.perform(get("/api/public/categories/giay"))
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.children.length()").value(1))
                .andExpect(jsonPath("$.children[0].productCount").value(1));
        mvc.perform(get("/api/public/categories/giay-ve-sinh"))
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.category.parent.slug").value("giay"))
                .andExpect(jsonPath("$.breadcrumb.length()").value(2));
        mvc.perform(get("/api/public/nav"))
                .andExpect(jsonPath("$.categories[0].productCount").value(2))
                .andExpect(jsonPath("$.categories[0].children[0].slug").value("giay-ve-sinh"));
    }

    @Test
    void activePromoShowsOnTheCardAndExpiredPromoDoesNot() throws Exception {
        long group = categoryService.create(new CategoryCreate("Khuyến mãi", null)).id();
        LocalDate today = LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
        AdminSku live = new AdminSku(null, null, "KM1", null, "Gói", 1, true, 10_000L, true, false, 8_000L, today,
                today.plusDays(3), true, null, null, null);
        AdminSku expired = new AdminSku(null, null, "KM2", null, "Gói", 1, true, 10_000L, true, false, 5_000L,
                today.minusDays(10), today.minusDays(1), true, null, null, null);
        create("Đang khuyến mãi", null, group, live);
        create("Hết khuyến mãi", null, group, expired);
        publishAll();

        mvc.perform(get("/api/public/products/dang-khuyen-mai"))
                .andExpect(jsonPath("$.skus[0].promoActive").value(true))
                .andExpect(jsonPath("$.skus[0].effectivePrice").value(8_000))
                .andExpect(jsonPath("$.skus[0].price").value(10_000))
                .andExpect(jsonPath("$.skus[0].promoTo").value(today.plusDays(3).toString()));
        mvc.perform(get("/api/public/products/het-khuyen-mai"))
                .andExpect(jsonPath("$.skus[0].promoActive").value(false))
                .andExpect(jsonPath("$.skus[0].effectivePrice").value(10_000))
                .andExpect(jsonPath("$.skus[0].promoPrice").value((Object) null));
        mvc.perform(get("/api/public/categories/khuyen-mai").param("sort", "price_asc"))
                .andExpect(jsonPath("$.items[0].name").value("Đang khuyến mãi"))
                .andExpect(jsonPath("$.items[0].fromPrice").value(8_000));
    }

    @Test
    void discontinuedProductKeepsItsPageButLeavesLists() throws Exception {
        long group = categoryService.create(new CategoryCreate("Ngừng bán", null)).id();
        long id = create("Hàng cũ", null, group, sku("OLD1", "Gói", 1, true, 1_000L));
        publishAll();
        productService.discontinue(id, MANAGER);

        mvc.perform(get("/api/public/products/hang-cu")).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DISCONTINUED"));
        mvc.perform(get("/api/public/categories/ngung-ban")).andExpect(jsonPath("$.total").value(0));
        mvc.perform(get("/api/public/search").param("q", "hang cu")).andExpect(jsonPath("$.total").value(0));
    }

    @Test
    void brandPageFiltersByCategory() throws Exception {
        var brand = brandService.create(new BrandCreate("Sen Vàng"));
        long a = categoryService.create(new CategoryCreate("Khăn", null)).id();
        long b = categoryService.create(new CategoryCreate("Pin", null)).id();
        create("Khăn A", brand.id(), a, sku("K1", "Gói", 1, true, 1_000L));
        create("Pin B", brand.id(), b, sku("P1", "Hộp", 1, true, 2_000L));
        publishAll();

        mvc.perform(get("/api/public/brands/sen-vang"))
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.facets.categories.length()").value(2))
                .andExpect(jsonPath("$.breadcrumb[0].href").value("/thuong-hieu/sen-vang"));
        mvc.perform(get("/api/public/brands/sen-vang").param("category", "pin"))
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].name").value("Pin B"));
        mvc.perform(get("/api/public/brands/khong-co")).andExpect(status().isNotFound());
    }

    @Test
    void searchIsDiacriticInsensitiveAndRanksExactCodesFirst() throws Exception {
        seed.load();
        publishAll();

        mvc.perform(get("/api/public/search").param("q", "giay rut day"))
                .andExpect(jsonPath("$.items[0].name").value("Giấy rút đáy Sen Vàng"));
        mvc.perform(get("/api/public/search").param("q", "svrd1280t"))
                .andExpect(jsonPath("$.items[0].name").value("Giấy rút đáy Sen Vàng"));
        mvc.perform(get("/api/public/search").param("q", "SV465-4L- Gói"))
                .andExpect(jsonPath("$.items[0].slug").value("giay-khan-giay-rut-cao-cap-gau-truc-sen-vang-sv465-4l-goi"));
        // every token has to match
        mvc.perform(get("/api/public/search").param("q", "giay pin")).andExpect(jsonPath("$.total").value(0));
        // % and _ are ordinary characters
        mvc.perform(get("/api/public/search").param("q", "%")).andExpect(jsonPath("$.total").value(0));
        mvc.perform(get("/api/public/search").param("q", "g_y")).andExpect(jsonPath("$.total").value(0));
        mvc.perform(get("/api/public/search").param("q", "")).andExpect(jsonPath("$.total").value(0));
    }

    @Test
    void anExactCodeOutranksANameMatchThatSortsEarlier() throws Exception {
        long group = categoryService.create(new CategoryCreate("Nhóm mã", null)).id();
        create("A có mã SV9-1 trong tên", null, group, sku("ZZ1", "Gói", 1, true, 1_000L));
        create("B khác", null, group, sku("SV9-1", "Gói", 1, true, 2_000L));
        publishAll();

        mvc.perform(get("/api/public/search").param("q", "sv9-1"))
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.items[0].name").value("B khác"))
                .andExpect(jsonPath("$.items[1].name").value("A có mã SV9-1 trong tên"));
    }

    @Test
    void suggestNeedsTwoCharactersAndReturnsAtMostEight() throws Exception {
        seed.load();
        publishAll();

        mvc.perform(get("/api/public/search/suggest").param("q", "g")).andExpect(jsonPath("$.items.length()").value(0));
        mvc.perform(get("/api/public/search/suggest").param("q", "pin"))
                .andExpect(jsonPath("$.items.length()").value(8))
                .andExpect(jsonPath("$.items[0].slug").isString());
        mvc.perform(get("/api/public/search/suggest").param("q", "sv465"))
                .andExpect(jsonPath("$.items[0].code").value("SV465-4L- Gói"));
    }

    @Test
    void sitemapListsOnlyPublishedActiveProducts() throws Exception {
        seed.load();
        jdbc.update("update product set published = true where slug = 'giay-rut-day-sen-vang'");

        String json = body("/api/public/sitemap");

        assertThat(json).contains("giay-rut-day-sen-vang").doesNotContain("giay-ve-sinh-sen-vang-6-cuon");
        mvc.perform(get("/api/public/sitemap").accept(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.products.length()").value(1))
                .andExpect(jsonPath("$.products[0].updatedAt").isString())
                .andExpect(jsonPath("$.categories.length()").value(1))
                .andExpect(jsonPath("$.brands.length()").value(1));
    }
}
