package vn.dnahoangnguyen.api.catalog.product;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;
import vn.dnahoangnguyen.api.admin.user.AppUser;
import vn.dnahoangnguyen.api.admin.user.Role;
import vn.dnahoangnguyen.api.catalog.CatalogIntegrationTest;
import vn.dnahoangnguyen.api.catalog.brand.BrandService;
import vn.dnahoangnguyen.api.catalog.category.CategoryService;
import vn.dnahoangnguyen.api.support.AdminLogin;
import vn.dnahoangnguyen.api.support.TestAuth;

/** The admin catalogue routes over HTTP: auth, JSON shapes of the contract and role rules. */
class AdminCatalogueApiIT extends CatalogIntegrationTest {

    @Autowired
    ObjectMapper mapper;

    private static final String NEW_PRODUCT = """
            {"id":null,"version":null,"name":"Giấy rút đáy Sen Vàng","slug":"","brandId":null,"categoryId":null,
             "descriptionMd":null,"specLine":"6 cuộn","imageUrl":null,"seoTitle":null,"seoDescription":null,
             "internalNote":null,"published":false,"status":"ACTIVE",
             "skus":[{"id":null,"version":null,"code":"SVRĐ1280t","name":null,"unitName":"Gói","conversion":1,
                      "isBase":true,"price":21000,"priceVisible":true,"needsConfirmation":false,"promoPrice":null,
                      "promoFrom":null,"promoTo":null,"visible":true,"source":"MANUAL","perBaseUnit":null,"warnings":[]},
                     {"id":null,"version":null,"code":"SVRĐ1280t 6G","name":null,"unitName":"Thùng 6G","conversion":6,
                      "isBase":false,"price":126000,"priceVisible":true,"needsConfirmation":false,"promoPrice":null,
                      "promoFrom":null,"promoTo":null,"visible":true,"source":"MANUAL","perBaseUnit":null,"warnings":[]}],
             "warnings":[],"priceHistory":[]}
            """;

    @Test
    void adminRoutesNeedASession() throws Exception {
        mvc.perform(get("/api/admin/products")).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
        mvc.perform(get("/api/admin/categories")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/brands")).andExpect(status().isUnauthorized());
    }

    @Test
    void managerCreatesAProductWithTheContractShape() throws Exception {
        AppUser manager = newUser(Role.MANAGER);

        mvc.perform(post("/api/admin/products").with(TestAuth.as(manager)).with(TestAuth.xsrf(AdminLogin.XSRF))
                        .contentType(MediaType.APPLICATION_JSON).content(NEW_PRODUCT))
                .andExpect(status().isCreated())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("\"isBase\":true")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("\"needsConfirmation\":false")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("\"priceVisible\":true")))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("\"base\":"))))
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.version").isNumber())
                .andExpect(jsonPath("$.slug").value("giay-rut-day-sen-vang"))
                .andExpect(jsonPath("$.categoryId").value((Object) null))
                .andExpect(jsonPath("$.skus[1].perBaseUnit").value(21_000))
                .andExpect(jsonPath("$.skus[0].source").value("MANUAL"))
                .andExpect(jsonPath("$.warnings[0].type").value("NO_IMAGE"))
                .andExpect(jsonPath("$.warnings[1].type").value("NOT_PUBLISHABLE"))
                .andExpect(jsonPath("$.priceHistory.length()").value(2))
                .andExpect(jsonPath("$.priceHistory[0].field").value("PRICE"));
    }

    @Test
    void aSkuPriceIsEmptyOrAboveZero() throws Exception {
        AppUser manager = newUser(Role.MANAGER);
        String message = "Giá phải lớn hơn 0; để trống nếu hiển thị Liên hệ.";

        mvc.perform(post("/api/admin/products").with(TestAuth.as(manager)).with(TestAuth.xsrf(AdminLogin.XSRF))
                        .contentType(MediaType.APPLICATION_JSON).content(NEW_PRODUCT.replace("\"price\":21000", "\"price\":0")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.errors[0].field").value("skus[0].price"))
                .andExpect(jsonPath("$.errors[0].message").value(message));
        mvc.perform(post("/api/admin/products").with(TestAuth.as(manager)).with(TestAuth.xsrf(AdminLogin.XSRF))
                        .contentType(MediaType.APPLICATION_JSON).content(NEW_PRODUCT.replace("\"price\":126000", "\"price\":0")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("skus[1].price"));
        mvc.perform(post("/api/admin/products").with(TestAuth.as(manager)).with(TestAuth.xsrf(AdminLogin.XSRF))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(NEW_PRODUCT.replace("\"price\":126000,\"priceVisible\":true,\"needsConfirmation\":false,\"promoPrice\":null",
                                "\"price\":126000,\"priceVisible\":true,\"needsConfirmation\":false,\"promoPrice\":0")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("skus[1].promoPrice"));
        assertThat(count("select count(*) from product")).isZero();

        // an empty price is the "Liên hệ" case and stays valid
        mvc.perform(post("/api/admin/products").with(TestAuth.as(manager)).with(TestAuth.xsrf(AdminLogin.XSRF))
                        .contentType(MediaType.APPLICATION_JSON).content(NEW_PRODUCT.replace("\"price\":21000", "\"price\":null")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.skus[0].price").value((Object) null));
    }

    @Test
    void writesNeedACsrfToken() throws Exception {
        AppUser manager = newUser(Role.MANAGER);

        mvc.perform(post("/api/admin/products").with(TestAuth.as(manager))
                        .contentType(MediaType.APPLICATION_JSON).content(NEW_PRODUCT))
                .andExpect(status().isForbidden());
    }

    @Test
    void editorSeesButCannotChangePricesOrPublish() throws Exception {
        AppUser editor = newUser(Role.EDITOR);
        long id = create("Giấy rút đáy", null, categoryService.create(
                new vn.dnahoangnguyen.api.catalog.category.CategoryService.CategoryCreate("Giấy", null)).id(),
                sku("E1", "Gói", 1, true, 21_000L));

        mvc.perform(get("/api/admin/products/" + id).with(TestAuth.as(editor))).andExpect(status().isOk())
                .andExpect(jsonPath("$.skus[0].price").value(21_000));
        mvc.perform(get("/api/admin/products").with(TestAuth.as(editor)))
                .andExpect(jsonPath("$.items[0].baseCode").value("E1"))
                .andExpect(jsonPath("$.items[0].basePrice").value(21_000))
                .andExpect(jsonPath("$.totals.products").value(1))
                .andExpect(jsonPath("$.totals.skus").value(1))
                .andExpect(jsonPath("$.totals.visibleSkus").value(1))
                .andExpect(jsonPath("$.size").value(30));

        String body = mvc.perform(get("/api/admin/products/" + id).with(TestAuth.as(editor))).andReturn().getResponse()
                .getContentAsString(java.nio.charset.StandardCharsets.UTF_8).replace("\"price\":21000", "\"price\":1");
        mvc.perform(put("/api/admin/products/" + id).with(TestAuth.as(editor)).with(TestAuth.xsrf(AdminLogin.XSRF))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN_FIELD"));
        mvc.perform(post("/api/admin/products/" + id + "/publish").with(TestAuth.as(editor)).with(TestAuth.xsrf(AdminLogin.XSRF)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    void managerPublishesAndTheRequirementsAreReported() throws Exception {
        AppUser manager = newUser(Role.MANAGER);
        long noCategory = create("Chưa nhóm", null, null, sku("M1", "Gói", 1, true, 1_000L));

        mvc.perform(post("/api/admin/products/" + noCategory + "/publish").with(TestAuth.as(manager)).with(TestAuth.xsrf(AdminLogin.XSRF)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("PUBLISH_REQUIREMENTS_UNMET"))
                .andExpect(jsonPath("$.missing.length()").value(1))
                .andExpect(jsonPath("$.missing[0]").value("CATEGORY"));

        long nothing = create("Chưa có gì", null, null, sku("M0", "Gói", 1, true, null));
        mvc.perform(post("/api/admin/products/" + nothing + "/publish").with(TestAuth.as(manager))
                        .with(TestAuth.xsrf(AdminLogin.XSRF)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.missing[0]").value("CATEGORY"))
                .andExpect(jsonPath("$.missing[1]").value("VISIBLE_PRICED_SKU"));

        long ready = create("Sẵn sàng", null, categoryService.create(
                new vn.dnahoangnguyen.api.catalog.category.CategoryService.CategoryCreate("Nhóm", null)).id(),
                sku("M2", "Gói", 1, true, 1_000L));
        mvc.perform(post("/api/admin/products/" + ready + "/publish").with(TestAuth.as(manager)).with(TestAuth.xsrf(AdminLogin.XSRF)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.published").value(true));
        mvc.perform(get("/api/public/products/san-sang")).andExpect(status().isOk());
        mvc.perform(get("/api/admin/products").param("published", "true").with(TestAuth.as(manager)))
                .andExpect(jsonPath("$.total").value(1));
    }

    @Test
    void onlyManagersChangeVisibilityOfCategoriesBrandsAndSkus() throws Exception {
        AppUser editor = newUser(Role.EDITOR);
        AppUser manager = newUser(Role.MANAGER);
        var category = categoryService.create(new CategoryService.CategoryCreate("Giấy", null));
        var brand = brandService.create(new BrandService.BrandCreate("Sen Vàng"));
        long id = create("Giấy rút đáy", brand.id(), category.id(),
                sku("V1", "Gói", 1, true, 21_000L), sku("V2", "Thùng 6", 6, false, 120_000L));

        // category: a rename passes, flipping visible does not, a manager may
        String categoryUrl = "/api/admin/categories/" + category.id();
        mvc.perform(put(categoryUrl).with(TestAuth.as(editor)).with(TestAuth.xsrf(AdminLogin.XSRF))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Giấy các loại\",\"description\":null,\"visible\":true,\"sortOrder\":0}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Giấy các loại"));
        mvc.perform(put(categoryUrl).with(TestAuth.as(editor)).with(TestAuth.xsrf(AdminLogin.XSRF))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Giấy các loại\",\"description\":null,\"visible\":false,\"sortOrder\":0}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN_FIELD"))
                .andExpect(jsonPath("$.field").value("visible"));
        mvc.perform(put(categoryUrl).with(TestAuth.as(manager)).with(TestAuth.xsrf(AdminLogin.XSRF))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Giấy các loại\",\"description\":null,\"visible\":false,\"sortOrder\":0}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.visible").value(false));

        // brand
        String brandUrl = "/api/admin/brands/" + brand.id();
        mvc.perform(put(brandUrl).with(TestAuth.as(editor)).with(TestAuth.xsrf(AdminLogin.XSRF))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Sen Vàng Mới\",\"visible\":true}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Sen Vàng Mới"));
        mvc.perform(put(brandUrl).with(TestAuth.as(editor)).with(TestAuth.xsrf(AdminLogin.XSRF))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Sen Vàng Mới\",\"visible\":false}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN_FIELD"))
                .andExpect(jsonPath("$.field").value("visible"));
        mvc.perform(put(brandUrl).with(TestAuth.as(manager)).with(TestAuth.xsrf(AdminLogin.XSRF))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Sen Vàng Mới\",\"visible\":false}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.visible").value(false));

        // SKU: text edits pass, hiding a SKU (by flag or by leaving it out) does not
        String stored = mvc.perform(get("/api/admin/products/" + id).with(TestAuth.as(editor))).andReturn().getResponse()
                .getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
        ObjectNode withText = (ObjectNode) mapper.readTree(stored);
        withText.put("specLine", "12 cuộn");
        mvc.perform(put("/api/admin/products/" + id).with(TestAuth.as(editor)).with(TestAuth.xsrf(AdminLogin.XSRF))
                        .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(withText)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.specLine").value("12 cuộn"));

        String current = mvc.perform(get("/api/admin/products/" + id).with(TestAuth.as(editor))).andReturn().getResponse()
                .getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
        ObjectNode flagged = (ObjectNode) mapper.readTree(current);
        ((ObjectNode) flagged.get("skus").get(1)).put("visible", false);
        mvc.perform(put("/api/admin/products/" + id).with(TestAuth.as(editor)).with(TestAuth.xsrf(AdminLogin.XSRF))
                        .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(flagged)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN_FIELD"))
                .andExpect(jsonPath("$.field").value("visible"));
        ObjectNode omitted = (ObjectNode) mapper.readTree(current);
        ((ArrayNode) omitted.get("skus")).remove(1);
        mvc.perform(put("/api/admin/products/" + id).with(TestAuth.as(editor)).with(TestAuth.xsrf(AdminLogin.XSRF))
                        .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(omitted)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.field").value("visible"));
        assertThat(count("select count(*) from sku where product_id = " + id + " and visible")).isEqualTo(2);

        mvc.perform(put("/api/admin/products/" + id).with(TestAuth.as(manager)).with(TestAuth.xsrf(AdminLogin.XSRF))
                        .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(flagged)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.skus[1].visible").value(false));
    }

    @Test
    void categoriesAndBrandsHaveListCreateAndUpdate() throws Exception {
        AppUser editor = newUser(Role.EDITOR);

        mvc.perform(post("/api/admin/categories").with(TestAuth.as(editor)).with(TestAuth.xsrf(AdminLogin.XSRF))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Pin\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.slug").value("pin"))
                .andExpect(jsonPath("$.children.length()").value(0));
        long pin = categoryService.tree().get(0).id();
        mvc.perform(post("/api/admin/categories").with(TestAuth.as(editor)).with(TestAuth.xsrf(AdminLogin.XSRF))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Pin kiềm\",\"parentId\":" + pin + "}"))
                .andExpect(status().isCreated());
        long level2 = categoryService.tree().get(0).children().get(0).id();
        mvc.perform(post("/api/admin/categories").with(TestAuth.as(editor)).with(TestAuth.xsrf(AdminLogin.XSRF))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Cấp ba\",\"parentId\":" + level2 + "}"))
                .andExpect(status().isUnprocessableEntity());
        mvc.perform(put("/api/admin/categories/" + pin).with(TestAuth.as(editor)).with(TestAuth.xsrf(AdminLogin.XSRF))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Pin các loại\",\"description\":null,\"visible\":true,\"sortOrder\":3}"))
                .andExpect(jsonPath("$.name").value("Pin các loại")).andExpect(jsonPath("$.sortOrder").value(3));
        mvc.perform(get("/api/admin/categories").with(TestAuth.as(editor)))
                .andExpect(jsonPath("$[0].children[0].name").value("Pin kiềm"));

        mvc.perform(post("/api/admin/brands").with(TestAuth.as(editor)).with(TestAuth.xsrf(AdminLogin.XSRF))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"GP\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.slug").value("gp"));
        mvc.perform(post("/api/admin/brands").with(TestAuth.as(editor)).with(TestAuth.xsrf(AdminLogin.XSRF))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"gp\"}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("DUPLICATE"));
        mvc.perform(get("/api/admin/brands").with(TestAuth.as(editor)))
                .andExpect(jsonPath("$[0].visible").value(true)).andExpect(jsonPath("$[0].productCount").value(0));
    }
}
